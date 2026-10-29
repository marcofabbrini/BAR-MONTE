<?php
declare(strict_types=1);

/**
 * Accesso al database (PDO). Supporta MySQL/MariaDB in produzione e SQLite
 * (solo per i test automatici).
 */
final class Db
{
    private static ?PDO $pdo = null;
    private static string $driver = 'mysql';
    private static int $txDepth = 0;

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }
        $c = Config::get('db', []);
        $driver = (string) ($c['driver'] ?? 'mysql');
        try {
            if ($driver === 'sqlite') {
                $pdo = new PDO('sqlite:' . $c['path'], null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                $pdo->exec('PRAGMA journal_mode=WAL');
                $pdo->exec('PRAGMA busy_timeout=5000');
            } else {
                $dsn = sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                    $c['host'] ?? 'localhost',
                    (int) ($c['port'] ?? 3306),
                    $c['name'] ?? ''
                );
                $pdo = new PDO($dsn, (string) ($c['user'] ?? ''), (string) ($c['pass'] ?? ''), [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 10,
                ]);
            }
        } catch (PDOException $e) {
            error_log('GESDI db connect: ' . $e->getMessage());
            $msg = Config::debug()
                ? 'Connessione al database fallita: ' . $e->getMessage()
                : 'Database non raggiungibile. Controlla le credenziali in config.php.';
            throw new ApiException(503, 'db-unavailable', $msg);
        }
        self::$driver = $driver;
        self::$pdo = $pdo;
        return $pdo;
    }

    public static function isMysql(): bool
    {
        self::pdo();
        return self::$driver === 'mysql';
    }

    /** @return array<int,array<string,mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function one(string $sql, array $params = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    public static function run(string $sql, array $params = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->rowCount();
    }

    public static function now(): string
    {
        return gmdate('Y-m-d H:i:s');
    }

    // --- Transazioni -------------------------------------------------------

    public static function begin(): void
    {
        $pdo = self::pdo();
        if (self::$txDepth === 0) {
            $pdo->exec(self::$driver === 'sqlite' ? 'BEGIN IMMEDIATE' : 'START TRANSACTION');
        }
        self::$txDepth++;
    }

    public static function commit(): void
    {
        self::$txDepth--;
        if (self::$txDepth === 0) {
            self::pdo()->exec('COMMIT');
        }
    }

    public static function rollback(): void
    {
        if (self::$txDepth > 0) {
            self::$txDepth = 0;
            try {
                self::pdo()->exec('ROLLBACK');
            } catch (Throwable) {
                // niente da annullare
            }
        }
    }

    /** SELECT ... FOR UPDATE solo su MySQL. */
    public static function forUpdate(): string
    {
        return self::isMysql() ? ' FOR UPDATE' : '';
    }

    // --- Schema ------------------------------------------------------------

    /** Tabella o colonna mancante: lo schema va creato/aggiornato (ensureSchema). */
    public static function isMissingTable(Throwable $e): bool
    {
        if (!($e instanceof PDOException)) {
            return false;
        }
        $m = $e->getMessage();
        return in_array($e->getCode(), ['42S02', '42S22'], true)
            || str_contains($m, 'no such table') || str_contains($m, 'no such column');
    }

    public static function ensureSchema(): void
    {
        $pdo = self::pdo();
        if (self::$driver === 'sqlite') {
            $ddl = [
                'CREATE TABLE IF NOT EXISTS gd_tenants (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, config TEXT NULL, created_at TEXT NOT NULL)',
                "CREATE TABLE IF NOT EXISTS gd_documents (tenant_id TEXT NOT NULL DEFAULT 'montepulciano', collection TEXT NOT NULL, doc_id TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (tenant_id, collection, doc_id))",
                "CREATE TABLE IF NOT EXISTS gd_collection_rev (tenant_id TEXT NOT NULL DEFAULT 'montepulciano', collection TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tenant_id, collection))",
                "CREATE TABLE IF NOT EXISTS gd_sessions (token_hash TEXT NOT NULL PRIMARY KEY, tenant_id TEXT NOT NULL DEFAULT 'montepulciano', user_id TEXT NOT NULL, created_at TEXT NOT NULL, last_seen TEXT NOT NULL, expires_at TEXT NOT NULL)",
                'CREATE TABLE IF NOT EXISTS gd_login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, username TEXT NOT NULL, ts TEXT NOT NULL)',
            ];
        } else {
            $file = __DIR__ . '/../schema.sql';
            $sql = is_file($file) ? (string) file_get_contents($file) : '';
            $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? '';
            $ddl = array_values(array_filter(array_map('trim', explode(';', $sql)), static fn($s) => $s !== ''));
            if (!$ddl) {
                throw new ApiException(500, 'schema-missing', 'schema.sql mancante sul server.');
            }
        }

        $locked = false;
        if (self::$driver === 'mysql') {
            // Una sola richiesta alla volta aggiorna lo schema.
            $locked = (int) ($pdo->query("SELECT GET_LOCK('gd_schema', 20)")->fetchColumn()) === 1;
        }
        try {
            foreach ($ddl as $stmt) {
                $pdo->exec($stmt);
            }
            if (self::$driver === 'mysql') {
                self::upgradeToTenants($pdo);
            }
            $ins = self::$driver === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
            $st = $pdo->prepare("$ins INTO gd_tenants (id, name, created_at) VALUES (?, ?, ?)");
            $st->execute([Tenant::LEGACY, 'Distaccamento VVF Montepulciano', self::now()]);
        } finally {
            if ($locked) {
                $pdo->query("SELECT RELEASE_LOCK('gd_schema')");
            }
        }
    }

    /** Aggiorna un database creato prima delle sedi: tutti i dati esistenti passano a "montepulciano". */
    private static function upgradeToTenants(PDO $pdo): void
    {
        $has = static function (string $table) use ($pdo): bool {
            $st = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
            $st->execute([$table, 'tenant_id']);
            return (int) $st->fetchColumn() > 0;
        };
        $col = "tenant_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'montepulciano'";
        if (!$has('gd_documents')) {
            $pdo->exec("ALTER TABLE gd_documents ADD COLUMN $col FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (tenant_id, collection, doc_id)");
        }
        if (!$has('gd_collection_rev')) {
            $pdo->exec("ALTER TABLE gd_collection_rev ADD COLUMN $col FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (tenant_id, collection)");
        }
        if (!$has('gd_sessions')) {
            $pdo->exec("ALTER TABLE gd_sessions ADD COLUMN $col AFTER token_hash");
        }
    }
}
