<?php
declare(strict_types=1);

/**
 * Gestione delle sedi (distaccamenti): configurazione, creazione, modifica.
 * Le operazioni di scrittura sono riservate all'amministratore di piattaforma
 * (Super Admin della sede predefinita): vedi Auth::requirePlatformAdmin().
 */
final class Tenants
{
    /** Comuni della sede storica (Montepulciano): valori predefiniti finché non viene salvata una configurazione. */
    private const LEGACY_MUNICIPALITIES = [
        'MONTEPULCIANO', 'CETONA', 'CHIANCIANO TERME', 'CHIUSI', 'PIENZA', 'SARTEANO', 'SINALUNGA',
        'TORRITA DI SIENA', 'TREQUANDA', 'FOIANO DELLA CHIANA (AR)',
    ];
    private const LEGACY_LAUNDRY_EMAIL = 'marcofabbrini@gmail.com';
    private const LEGACY_WEATHER = ['label' => 'Montepulciano', 'lat' => 43.1017, 'lon' => 11.7868];

    /**
     * Configurazione effettiva (con i valori predefiniti) di una riga di gd_tenants.
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function effectiveConfig(array $row): array
    {
        $raw = null;
        if (isset($row['config']) && is_string($row['config']) && $row['config'] !== '') {
            $decoded = json_decode($row['config'], true);
            $raw = is_array($decoded) ? $decoded : null;
        }
        $legacy = ($row['id'] ?? '') === Tenant::LEGACY && $raw === null;

        $weather = $raw['weather'] ?? ($legacy ? self::LEGACY_WEATHER : null);
        return [
            'modules' => Modules::normalize($raw['modules'] ?? null, false),
            'displayName' => isset($raw['displayName']) && is_string($raw['displayName']) && trim($raw['displayName']) !== ''
                ? trim($raw['displayName']) : (string) ($row['name'] ?? ''),
            'municipalities' => is_array($raw['municipalities'] ?? null)
                ? array_values(array_filter($raw['municipalities'], 'is_string'))
                : ($legacy ? self::LEGACY_MUNICIPALITIES : []),
            'weather' => is_array($weather) && isset($weather['lat'], $weather['lon']) ? $weather : null,
            'laundryEmail' => isset($raw['laundryEmail']) && is_string($raw['laundryEmail']) ? $raw['laundryEmail'] : ($legacy ? self::LEGACY_LAUNDRY_EMAIL : ''),
        ];
    }

    /** @param array<string,mixed> $row @return array{id:string,name:string,config:array<string,mixed>,platform:bool} */
    public static function info(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'config' => self::effectiveConfig($row),
            // La sede predefinita ospita l'amministratore di piattaforma (gestione delle sedi).
            'platform' => (string) $row['id'] === Tenant::defaultSlug(),
        ];
    }

    /** Valida e normalizza la configurazione ricevuta dal browser. @return array<string,mixed> */
    public static function validateConfig(mixed $in): array
    {
        // Il corpo della richiesta arriva come oggetti: lo riportiamo ad array associativi.
        $in = is_object($in) || is_array($in) ? json_decode((string) json_encode($in), true) : $in;
        if (!is_array($in)) {
            throw new ApiException(422, 'bad-config', 'Configurazione non valida.');
        }
        $out = ['modules' => Modules::normalize($in['modules'] ?? null, true)];

        $dn = $in['displayName'] ?? '';
        if (!is_string($dn) || mb_strlen(trim($dn)) > 120) {
            throw new ApiException(422, 'bad-config', 'Nome visualizzato troppo lungo.');
        }
        $out['displayName'] = trim($dn);

        $munis = $in['municipalities'] ?? [];
        if (!is_array($munis) || count($munis) > 200) {
            throw new ApiException(422, 'bad-config', 'Elenco comuni non valido.');
        }
        $clean = [];
        foreach ($munis as $m) {
            if (!is_string($m)) {
                throw new ApiException(422, 'bad-config', 'Elenco comuni non valido.');
            }
            $m = mb_strtoupper(trim($m));
            if ($m === '' || mb_strlen($m) > 60 || str_contains($m, '...')) {
                continue;
            }
            $clean[$m] = true;
        }
        $out['municipalities'] = array_keys($clean);

        $mail = $in['laundryEmail'] ?? '';
        if (!is_string($mail) || ($mail = trim($mail)) !== '' && (mb_strlen($mail) > 150 || !filter_var($mail, FILTER_VALIDATE_EMAIL))) {
            throw new ApiException(422, 'bad-config', 'Indirizzo email della lavanderia non valido.');
        }
        $out['laundryEmail'] = $mail;

        $w = $in['weather'] ?? null;
        if ($w !== null && $w !== []) {
            if (!is_array($w) || !is_numeric($w['lat'] ?? null) || !is_numeric($w['lon'] ?? null)
                || (float) $w['lat'] < -90 || (float) $w['lat'] > 90 || (float) $w['lon'] < -180 || (float) $w['lon'] > 180) {
                throw new ApiException(422, 'bad-config', 'Coordinate del meteo non valide.');
            }
            $out['weather'] = [
                'label' => mb_substr(trim((string) ($w['label'] ?? '')), 0, 60),
                'lat' => round((float) $w['lat'], 4),
                'lon' => round((float) $w['lon'], 4),
            ];
        } else {
            $out['weather'] = null;
        }
        return $out;
    }

    private static function validName(mixed $name): string
    {
        $name = is_string($name) ? trim($name) : '';
        if ($name === '' || mb_strlen($name) > 120) {
            throw new ApiException(422, 'bad-name', 'Inserisci il nome della sede (massimo 120 caratteri).');
        }
        return $name;
    }

    private static function validSlug(mixed $slug): string
    {
        $slug = is_string($slug) ? mb_strtolower(trim($slug)) : '';
        if (!Tenant::valid($slug)) {
            throw new ApiException(422, 'bad-slug', 'Codice sede non valido: usa minuscole, numeri e trattino (massimo 31 caratteri).');
        }
        return $slug;
    }

    private static function validAdmin(mixed $username, mixed $password): array
    {
        $u = is_string($username) ? trim($username) : '';
        $p = is_string($password) ? $password : '';
        if ($u === '' || mb_strlen($u) > 100 || strlen($p) < 8 || strlen($p) > 200) {
            throw new ApiException(422, 'bad-admin', 'Nome utente e password (almeno 8 caratteri) del Super Admin della sede.');
        }
        return [$u, $p];
    }

    /** @return array<int,array<string,mixed>> */
    public static function list(): array
    {
        $rows = Db::all(
            "SELECT t.id, t.name, t.config, t.created_at,
                    (SELECT COUNT(*) FROM gd_documents d WHERE d.tenant_id = t.id AND d.collection = 'staff') AS staff_count
             FROM gd_tenants t ORDER BY t.created_at, t.id"
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (string) $r['id'],
                'name' => (string) $r['name'],
                'createdAt' => (string) $r['created_at'],
                'staffCount' => (int) $r['staff_count'],
                'isDefault' => $r['id'] === Tenant::defaultSlug(),
                'config' => self::effectiveConfig($r),
            ];
        }
        return $out;
    }

    /** @return array<string,mixed> */
    public static function create(mixed $slug, mixed $name, mixed $config, mixed $adminUser, mixed $adminPass): array
    {
        $slug = self::validSlug($slug);
        $name = self::validName($name);
        $cfg = self::validateConfig($config ?? []);
        [$u, $p] = self::validAdmin($adminUser, $adminPass);
        if (Db::one('SELECT id FROM gd_tenants WHERE id = ?', [$slug]) !== null) {
            throw new ApiException(409, 'tenant-exists', 'Esiste già una sede con questo codice.');
        }
        Db::begin();
        try {
            Db::run(
                'INSERT INTO gd_tenants (id, name, config, created_at) VALUES (?, ?, ?, ?)',
                [$slug, $name, json_encode($cfg, JSON_UNESCAPED_UNICODE), Db::now()]
            );
            Tenant::with($slug, static function () use ($u, $p): void {
                Store::commit([], [(object) ['op' => 'set', 'c' => 'staff', 'id' => bin2hex(random_bytes(10)), 'data' => (object) [
                    'name' => $u, 'username' => $u, 'password' => $p,
                    'role' => 'super-admin', 'shift' => 'a', 'grade' => 'CS', 'icon' => '🛡️',
                ]]], null);
            });
            Db::commit();
        } catch (Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return self::one($slug);
    }

    /** @return array<string,mixed> */
    public static function update(mixed $slug, mixed $name, mixed $config): array
    {
        $slug = self::validSlug($slug);
        $name = self::validName($name);
        $cfg = self::validateConfig($config ?? []);
        if (Db::one('SELECT id FROM gd_tenants WHERE id = ?', [$slug]) === null) {
            throw new ApiException(404, 'tenant-not-found', 'Sede inesistente.');
        }
        Db::run('UPDATE gd_tenants SET name = ?, config = ? WHERE id = ?', [$name, json_encode($cfg, JSON_UNESCAPED_UNICODE), $slug]);
        return self::one($slug);
    }

    /** Crea o promuove a Super Admin un utente della sede, con nuova password; chiude le sue sessioni. */
    public static function setSuperAdmin(mixed $slug, mixed $username, mixed $password): array
    {
        $slug = self::validSlug($slug);
        [$u, $p] = self::validAdmin($username, $password);
        if (Db::one('SELECT id FROM gd_tenants WHERE id = ?', [$slug]) === null) {
            throw new ApiException(404, 'tenant-not-found', 'Sede inesistente.');
        }
        $created = Tenant::with($slug, static function () use ($slug, $u, $p): bool {
            $needle = mb_strtolower($u);
            $target = null;
            foreach (Store::loadCollection('staff') as $r) {
                $d = $r['data'];
                $un = isset($d->username) && is_string($d->username) ? mb_strtolower(trim($d->username)) : '';
                $n = isset($d->name) && is_string($d->name) ? mb_strtolower(trim($d->name)) : '';
                if ($un === $needle || $n === $needle) {
                    $target = $r;
                    break;
                }
            }
            if ($target !== null) {
                $w = (object) ['op' => 'update', 'c' => 'staff', 'id' => $target['id'], 'data' => (object) ['role' => 'super-admin', 'password' => $p]];
            } else {
                $w = (object) ['op' => 'set', 'c' => 'staff', 'id' => bin2hex(random_bytes(10)), 'data' => (object) [
                    'name' => $u, 'username' => $u, 'password' => $p,
                    'role' => 'super-admin', 'shift' => 'a', 'grade' => 'CS', 'icon' => '🛡️',
                ]];
            }
            Store::commit([], [$w], null);
            Db::run('DELETE FROM gd_sessions WHERE tenant_id = ?', [$slug]);
            return $target === null;
        });
        return ['created' => $created];
    }

    /** @return array<string,mixed> */
    private static function one(string $slug): array
    {
        foreach (self::list() as $t) {
            if ($t['id'] === $slug) {
                return $t;
            }
        }
        throw new ApiException(404, 'tenant-not-found', 'Sede inesistente.');
    }

    /** Dati pubblici per la schermata di login (solo il nome). */
    public static function publicName(?string $slug): ?string
    {
        $slug = $slug === null || $slug === '' ? Tenant::defaultSlug() : mb_strtolower(trim($slug));
        if (!Tenant::valid($slug)) {
            return null;
        }
        $row = Db::one('SELECT id, name, config FROM gd_tenants WHERE id = ?', [$slug]);
        return $row === null ? null : self::effectiveConfig($row)['displayName'];
    }
}
