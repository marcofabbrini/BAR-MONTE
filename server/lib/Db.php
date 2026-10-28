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

    public static function isMissingTable(Throwable $e): bool
    {
        if (!($e instanceof PDOException)) {
            return false;
        }
        return $e->getCode() === '42S02' || str_contains($e->getMessage(), 'no such table');
    }

    public static function ensureSchema(): void
    {
        $pdo = self::pdo();
        if (self::$driver === 'sqlite') {
            $ddl = [
                'CREATE TABLE IF NOT EXISTS gd_documents (collection TEXT NOT NULL, doc_id TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, doc_id))',
                'CREATE TABLE IF NOT EXISTS gd_collection_rev (collection TEXT NOT NULL PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0)',
                'CREATE TABLE IF NOT EXISTS gd_sessions (token_hash TEXT NOT NULL PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, last_seen TEXT NOT NULL, expires_at TEXT NOT NULL)',
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
        foreach ($ddl as $stmt) {
            $pdo->exec($stmt);
        }
    }
}
