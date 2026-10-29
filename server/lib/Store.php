<?php
declare(strict_types=1);

/**
 * Archivio documentale su MySQL: collezioni di documenti JSON identificati da id,
 * con versione per documento e "revisione" per collezione (usata dal polling).
 *
 * Le scritture avvengono sempre dentro una transazione e supportano:
 *  - set / set con merge / update / delete
 *  - operatori lato server: increment, arrayUnion, arrayRemove, serverTimestamp
 *  - letture con controllo di versione (per le transazioni ottimistiche del client)
 */
final class Store
{
    private const MAX_WRITES = 500;
    private const MAX_DOC_BYTES = 1048576;

    // --- Validazione -------------------------------------------------------

    public static function checkCollection(mixed $c): string
    {
        if (!is_string($c) || !preg_match('/^[A-Za-z0-9_\-]{1,60}$/', $c)) {
            throw new ApiException(422, 'bad-collection', 'Nome collezione non valido.');
        }
        return $c;
    }

    public static function checkId(mixed $id): string
    {
        if (!is_string($id) || $id === '' || strlen($id) > 100 || preg_match('/[\/\x00-\x1f]/', $id)) {
            throw new ApiException(422, 'bad-id', 'ID documento non valido.');
        }
        return $id;
    }

    // --- Lettura -----------------------------------------------------------

    /** @return array{data:stdClass,version:int}|null */
    public static function loadDoc(string $c, string $id, bool $lock = false): ?array
    {
        if (!Modules::isEnabled($c)) {
            return null;
        }
        $row = Db::one(
            'SELECT data, version FROM gd_documents WHERE tenant_id = ? AND collection = ? AND doc_id = ?' . ($lock ? Db::forUpdate() : ''),
            [Tenant::id(), $c, $id]
        );
        if ($row === null) {
            return null;
        }
        return ['data' => self::decode((string) $row['data']), 'version' => (int) $row['version']];
    }

    /** @return array<int,array{id:string,data:stdClass}> */
    public static function loadCollection(string $c): array
    {
        if (!Modules::isEnabled($c)) {
            return [];
        }
        $rows = Db::all('SELECT doc_id, data FROM gd_documents WHERE tenant_id = ? AND collection = ?', [Tenant::id(), $c]);
        $out = [];
        foreach ($rows as $r) {
            $out[] = ['id' => (string) $r['doc_id'], 'data' => self::decode((string) $r['data'])];
        }
        return $out;
    }

    /** @param string[] $collections @return array<string,int> */
    public static function revs(array $collections): array
    {
        $collections = array_values(array_unique($collections));
        if (!$collections) {
            return [];
        }
        $in = implode(',', array_fill(0, count($collections), '?'));
        $rows = Db::all("SELECT collection, rev FROM gd_collection_rev WHERE tenant_id = ? AND collection IN ($in)", array_merge([Tenant::id()], $collections));
        $out = array_fill_keys($collections, 0);
        foreach ($rows as $r) {
            $out[(string) $r['collection']] = (int) $r['rev'];
        }
        return $out;
    }

    private static function decode(string $json): stdClass
    {
        $v = json_decode($json, false, 128);
        return $v instanceof stdClass ? $v : new stdClass();
    }

    // --- Interrogazioni (semantica simile a Firestore) ----------------------

    /**
     * @param array<int,array{id:string,data:stdClass}> $rows
     * @param array<int,mixed> $where  lista di [campo, operatore, valore]
     * @param array<int,mixed> $orderBy lista di [campo, 'asc'|'desc']
     * @return array<int,array{id:string,data:stdClass}>
     */
    public static function query(array $rows, array $where, array $orderBy, ?int $limit): array
    {
        foreach ($where as $w) {
            if (!is_array($w) || count($w) !== 3 || !is_string($w[0]) || !is_string($w[1])) {
                throw new ApiException(422, 'bad-where', 'Filtro non valido.');
            }
            [$field, $op, $value] = $w;
            $rows = array_values(array_filter($rows, static function ($r) use ($field, $op, $value) {
                return self::matches($r['data'], $field, $op, $value);
            }));
        }

        if ($orderBy) {
            // Come Firestore: i documenti privi del campo di ordinamento sono esclusi.
            foreach ($orderBy as $o) {
                $f = is_array($o) ? (string) ($o[0] ?? '') : '';
                $rows = array_values(array_filter($rows, static fn($r) => self::hasField($r['data'], $f)));
            }
            usort($rows, static function ($a, $b) use ($orderBy) {
                foreach ($orderBy as $o) {
                    $f = (string) $o[0];
                    $dir = (($o[1] ?? 'asc') === 'desc') ? -1 : 1;
                    $cmp = self::compareValues(self::getField($a['data'], $f), self::getField($b['data'], $f));
                    if ($cmp !== 0) {
                        return $cmp * $dir;
                    }
                }
                $last = (($orderBy[count($orderBy) - 1][1] ?? 'asc') === 'desc') ? -1 : 1;
                return strcmp($a['id'], $b['id']) * $last;
            });
        } else {
            usort($rows, static fn($a, $b) => strcmp($a['id'], $b['id']));
        }

        if ($limit !== null && $limit >= 0) {
            $rows = array_slice($rows, 0, $limit);
        }
        return $rows;
    }

    private static function hasField(stdClass $data, string $path): bool
    {
        $cur = $data;
        foreach (explode('.', $path) as $part) {
            if (!($cur instanceof stdClass) || !property_exists($cur, $part)) {
                return false;
            }
            $cur = $cur->$part;
        }
        return true;
    }

    private static function getField(stdClass $data, string $path): mixed
    {
        $cur = $data;
        foreach (explode('.', $path) as $part) {
            if (!($cur instanceof stdClass) || !property_exists($cur, $part)) {
                return null;
            }
            $cur = $cur->$part;
        }
        return $cur;
    }

    private static function typeRank(mixed $v): int
    {
        return match (true) {
            $v === null => 0,
            is_bool($v) => 1,
            is_int($v), is_float($v) => 2,
            is_string($v) => 3,
            is_array($v) => 4,
            default => 5,
        };
    }

    private static function compareValues(mixed $a, mixed $b): int
    {
        $ra = self::typeRank($a);
        $rb = self::typeRank($b);
        if ($ra !== $rb) {
            return $ra <=> $rb;
        }
        return match ($ra) {
            0 => 0,
            1, 2 => $a <=> $b,
            3 => strcmp($a, $b),
            default => strcmp((string) json_encode($a), (string) json_encode($b)),
        };
    }

    private static function equalValues(mixed $a, mixed $b): bool
    {
        if ((is_int($a) || is_float($a)) && (is_int($b) || is_float($b))) {
            return $a == $b;
        }
        if (is_array($a) || is_object($a) || is_array($b) || is_object($b)) {
            return json_encode($a) === json_encode($b);
        }
        return $a === $b;
    }

    private static function matches(stdClass $data, string $field, string $op, mixed $value): bool
    {
        if (!self::hasField($data, $field)) {
            return false;
        }
        $actual = self::getField($data, $field);
        switch ($op) {
            case '==':
                return self::equalValues($actual, $value);
            case '!=':
                return !self::equalValues($actual, $value);
            case '<':
                return self::typeRank($actual) === self::typeRank($value) && self::compareValues($actual, $value) < 0;
            case '<=':
                return self::typeRank($actual) === self::typeRank($value) && self::compareValues($actual, $value) <= 0;
            case '>':
                return self::typeRank($actual) === self::typeRank($value) && self::compareValues($actual, $value) > 0;
            case '>=':
                return self::typeRank($actual) === self::typeRank($value) && self::compareValues($actual, $value) >= 0;
            case 'in':
                if (!is_array($value)) {
                    return false;
                }
                foreach ($value as $v) {
                    if (self::equalValues($actual, $v)) {
                        return true;
                    }
                }
                return false;
            case 'not-in':
                if (!is_array($value)) {
                    return false;
                }
                foreach ($value as $v) {
                    if (self::equalValues($actual, $v)) {
                        return false;
                    }
                }
                return true;
            case 'array-contains':
                if (!is_array($actual)) {
                    return false;
                }
                foreach ($actual as $v) {
                    if (self::equalValues($v, $value)) {
                        return true;
                    }
                }
                return false;
            default:
                throw new ApiException(422, 'bad-operator', 'Operatore di filtro non supportato: ' . $op);
        }
    }

    // --- Operatori lato server ---------------------------------------------

    private static function resolve(mixed $value, mixed $base): mixed
    {
        if ($value instanceof stdClass) {
            if (property_exists($value, '__op')) {
                return self::applyOp($value, $base);
            }
            $out = new stdClass();
            foreach (get_object_vars($value) as $k => $v) {
                $b = ($base instanceof stdClass && property_exists($base, (string) $k)) ? $base->$k : null;
                $out->$k = self::resolve($v, $b);
            }
            return $out;
        }
        return $value;
    }

    private static function applyOp(stdClass $op, mixed $base): mixed
    {
        switch ((string) $op->__op) {
            case 'increment':
                $n = $op->value ?? 0;
                if (!is_int($n) && !is_float($n)) {
                    throw new ApiException(422, 'bad-increment', 'increment richiede un numero.');
                }
                $b = (is_int($base) || is_float($base)) ? $base : 0;
                return $b + $n;
            case 'arrayUnion':
                $list = is_array($base) ? $base : [];
                foreach ((array) ($op->values ?? []) as $v) {
                    $found = false;
                    foreach ($list as $e) {
                        if (self::equalValues($e, $v)) {
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $list[] = $v;
                    }
                }
                return $list;
            case 'arrayRemove':
                $list = is_array($base) ? $base : [];
                $remove = (array) ($op->values ?? []);
                return array_values(array_filter($list, static function ($e) use ($remove) {
                    foreach ($remove as $v) {
                        if (self::equalValues($e, $v)) {
                            return false;
                        }
                    }
                    return true;
                }));
            case 'serverTimestamp':
                return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
            default:
                throw new ApiException(422, 'bad-op', 'Operatore di campo non supportato.');
        }
    }

    private static function mergeDeep(stdClass $base, stdClass $incoming): stdClass
    {
        $out = clone $base;
        foreach (get_object_vars($incoming) as $k => $v) {
            if ($v instanceof stdClass && isset($out->$k) && $out->$k instanceof stdClass) {
                $out->$k = self::mergeDeep($out->$k, $v);
            } else {
                $out->$k = $v;
            }
        }
        return $out;
    }

    private static function setPath(stdClass $obj, string $path, mixed $value): void
    {
        $parts = explode('.', $path);
        $last = array_pop($parts);
        $cur = $obj;
        foreach ($parts as $p) {
            if (!isset($cur->$p) || !($cur->$p instanceof stdClass)) {
                $cur->$p = new stdClass();
            }
            $cur = $cur->$p;
        }
        $cur->$last = $value;
    }

    private static function getPath(stdClass $obj, string $path): mixed
    {
        return self::getField($obj, $path);
    }

    /** Calcola il nuovo contenuto del documento; null = eliminazione. */
    private static function computeWrite(stdClass $w, ?stdClass $existing): ?stdClass
    {
        $op = (string) ($w->op ?? '');
        if ($op === 'delete') {
            return null;
        }
        $data = $w->data ?? null;
        if (!($data instanceof stdClass)) {
            throw new ApiException(422, 'bad-data', 'Dati del documento non validi.');
        }

        if ($op === 'set') {
            $merge = !empty($w->merge);
            if ($merge && $existing !== null) {
                $resolved = self::resolve($data, $existing);
                return self::mergeDeep($existing, $resolved);
            }
            return self::resolve($data, null);
        }

        if ($op === 'update') {
            if ($existing === null) {
                throw new ApiException(404, 'not-found', 'Documento inesistente: impossibile aggiornarlo.');
            }
            $new = clone $existing;
            foreach (get_object_vars($data) as $k => $v) {
                $k = (string) $k;
                $base = self::getPath($existing, $k);
                $resolved = self::resolve($v, $base);
                if (str_contains($k, '.')) {
                    self::setPath($new, $k, $resolved);
                } else {
                    $new->$k = $resolved;
                }
            }
            return $new;
        }

        throw new ApiException(422, 'bad-op', 'Operazione di scrittura non valida.');
    }

    // --- Scrittura atomica ---------------------------------------------------

    /**
     * @param array<int,stdClass> $reads  [{c,id,v}] versioni lette dal client (v=0: non esisteva)
     * @param array<int,stdClass> $writes [{op,c,id,data?,merge?}]
     * @param array|null $actor utente che scrive (null = sistema, nessun controllo permessi)
     */
    public static function commit(array $reads, array $writes, ?array $actor): void
    {
        if (count($writes) > self::MAX_WRITES || count($reads) > self::MAX_WRITES) {
            throw new ApiException(413, 'too-many-writes', 'Troppe operazioni in un unico invio.');
        }
        foreach ($writes as $w) {
            if (!($w instanceof stdClass)) {
                throw new ApiException(422, 'bad-write', 'Scrittura non valida.');
            }
            self::checkCollection($w->c ?? null);
            self::checkId($w->id ?? null);
        }

        Db::begin();
        try {
            foreach ($reads as $r) {
                $c = self::checkCollection($r->c ?? null);
                $id = self::checkId($r->id ?? null);
                $row = self::loadDoc($c, $id, true);
                $current = $row === null ? 0 : $row['version'];
                if ($current !== (int) ($r->v ?? 0)) {
                    throw new ApiException(409, 'conflict', 'Il documento è cambiato durante l\'operazione.');
                }
            }

            $touched = [];
            foreach ($writes as $w) {
                $c = (string) $w->c;
                $id = (string) $w->id;
                $row = self::loadDoc($c, $id, true);
                $existing = $row['data'] ?? null;

                Policy::prepare($c, $id, $w, $existing);

                $new = self::computeWrite($w, $existing);

                if ($actor !== null) {
                    Policy::authorize($actor, $c, $id, (string) $w->op, $existing, $new);
                }

                if ($new === null) {
                    if ($row !== null) {
                        Db::run('DELETE FROM gd_documents WHERE tenant_id = ? AND collection = ? AND doc_id = ?', [Tenant::id(), $c, $id]);
                    }
                } else {
                    $json = json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
                    if ($json === false) {
                        throw new ApiException(422, 'bad-data', 'Il documento contiene dati non codificabili.');
                    }
                    if (strlen($json) > self::MAX_DOC_BYTES) {
                        throw new ApiException(413, 'doc-too-large', 'Documento troppo grande.');
                    }
                    $now = Db::now();
                    if ($row === null) {
                        Db::run(
                            'INSERT INTO gd_documents (tenant_id, collection, doc_id, data, version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
                            [Tenant::id(), $c, $id, $json, $now, $now]
                        );
                    } else {
                        Db::run(
                            'UPDATE gd_documents SET data = ?, version = version + 1, updated_at = ? WHERE tenant_id = ? AND collection = ? AND doc_id = ?',
                            [$json, $now, Tenant::id(), $c, $id]
                        );
                    }
                }
                $touched[$c] = true;
            }

            // Ordine alfabetico: evita deadlock tra transazioni concorrenti.
            $names = array_keys($touched);
            sort($names, SORT_STRING);
            foreach ($names as $c) {
                self::bumpRev($c);
            }
            Db::commit();
        } catch (Throwable $e) {
            Db::rollback();
            if ($e instanceof PDOException && in_array((string) ($e->errorInfo[1] ?? ''), ['1213', '1205'], true)) {
                throw new ApiException(409, 'conflict', 'Operazione concorrente: riprova.');
            }
            throw $e;
        }
    }

    private static function bumpRev(string $c): void
    {
        if (Db::isMysql()) {
            Db::run(
                'INSERT INTO gd_collection_rev (tenant_id, collection, rev) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE rev = rev + 1',
                [Tenant::id(), $c]
            );
        } else {
            Db::run(
                'INSERT INTO gd_collection_rev (tenant_id, collection, rev) VALUES (?, ?, 1) ON CONFLICT(tenant_id, collection) DO UPDATE SET rev = rev + 1',
                [Tenant::id(), $c]
            );
        }
    }
}
