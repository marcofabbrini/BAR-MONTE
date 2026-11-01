<?php
declare(strict_types=1);

/**
 * Autenticazione: login con utente/password verificati sul server, sessione
 * salvata nel database (non dipende dalla configurazione PHP dell'hosting).
 */
final class Auth
{
    private const COOKIE = 'gd_session';
    private const ATTEMPT_WINDOW_MIN = 15;
    private const MAX_ATTEMPTS_PER_IP = 30;
    private const MAX_ATTEMPTS_PER_USER = 10;

    /** @var array{id:string,data:stdClass}|null|false */
    private static array|null|false $current = false;

    /** @var array{id:string,name:string,config:array<string,mixed>,platform:bool}|null Sede della sessione corrente. */
    private static ?array $tenant = null;

    /** Sede dell'utente collegato (dopo currentUser()/login()). */
    public static function tenantInfo(): ?array
    {
        return self::$tenant;
    }

    /** Imposta sede e configurazione (moduli) per la richiesta in corso. @param array<string,mixed> $row */
    private static function useTenant(array $row): void
    {
        Tenant::set((string) $row['id']);
        self::$tenant = Tenants::info($row);
        Tenant::setConfig(self::$tenant['config']);
    }

    /** Solo il Super Admin della sede predefinita gestisce le sedi. */
    public static function requirePlatformAdmin(): array
    {
        $u = self::requireUser();
        if (Tenant::current() !== Tenant::defaultSlug() || Policy::userLevel($u['data']) < 4) {
            throw new ApiException(403, 'forbidden', 'Solo l\'amministratore di piattaforma può gestire le sedi.');
        }
        return $u;
    }

    /** Chiave per il limite di tentativi: separata per sede. */
    private static function attemptKey(string $tenantId, string $username): string
    {
        return substr($tenantId . ':' . mb_strtolower($username), 0, 100);
    }

    private static function cookiePath(): string
    {
        $configured = Config::get('cookie_path');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }
        $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '/');
        $dir = dirname(dirname($script));
        return ($dir === '/' || $dir === '.' || $dir === '\\') ? '/' : rtrim($dir, '/') . '/';
    }

    private static function setCookie(string $value, int $expires): void
    {
        setcookie(self::COOKIE, $value, [
            'expires' => $expires,
            'path' => self::cookiePath(),
            'secure' => Http::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /** Utente della sessione corrente (con tutti i dati, hash password incluso). */
    public static function currentUser(): ?array
    {
        if (self::$current !== false) {
            return self::$current;
        }
        self::$current = null;
        $token = $_COOKIE[self::COOKIE] ?? '';
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }
        $hash = hash('sha256', $token);
        $now = Db::now();
        $sess = Db::one(
            'SELECT s.user_id, s.tenant_id, s.last_seen, s.expires_at, t.name AS tenant_name, t.config AS tenant_config
             FROM gd_sessions s JOIN gd_tenants t ON t.id = s.tenant_id
             WHERE s.token_hash = ? AND s.expires_at > ?',
            [$hash, $now]
        );
        if ($sess === null || !Tenant::valid($sess['tenant_id'])) {
            return null;
        }
        self::useTenant(['id' => $sess['tenant_id'], 'name' => $sess['tenant_name'], 'config' => $sess['tenant_config']]);
        $user = Store::loadDoc('staff', (string) $sess['user_id']);
        if ($user === null) {
            Db::run('DELETE FROM gd_sessions WHERE token_hash = ?', [$hash]);
            Tenant::clear();
            self::$tenant = null;
            return null;
        }
        // Rinnova la scadenza al massimo una volta all'ora.
        if (strtotime((string) $sess['last_seen'] . ' UTC') < time() - 3600) {
            $days = max(1, (int) Config::get('session_days', 30));
            $exp = gmdate('Y-m-d H:i:s', time() + $days * 86400);
            Db::run('UPDATE gd_sessions SET last_seen = ?, expires_at = ? WHERE token_hash = ?', [$now, $exp, $hash]);
            self::setCookie($token, time() + $days * 86400);
        }
        return self::$current = ['id' => (string) $sess['user_id'], 'data' => $user['data']];
    }

    public static function requireUser(): array
    {
        $u = self::currentUser();
        if ($u === null) {
            throw new ApiException(401, 'unauthorized', 'Accesso richiesto.');
        }
        return $u;
    }

    /** Utente in formato JSON per il browser (senza password). */
    public static function publicUser(array $user): stdClass
    {
        $out = clone Policy::sanitizeOut('staff', $user['data']);
        $out->id = $user['id'];
        return $out;
    }

    public static function login(string $username, string $password, ?string $tenantSlug = null): array
    {
        $username = trim($username);
        if ($username === '' || strlen($username) > 100 || strlen($password) > 200) {
            throw new ApiException(401, 'invalid-credentials', 'Credenziali non valide.');
        }

        // La sede si sceglie al login (link della sede); senza indicazione vale quella predefinita.
        $slug = $tenantSlug === null || $tenantSlug === '' ? Tenant::defaultSlug() : mb_strtolower(trim($tenantSlug));
        $key = Tenant::valid($slug) ? $slug : '-';
        self::assertNotRateLimited($key, $username);
        $tenantRow = Tenant::valid($slug) ? Db::one('SELECT id, name, config FROM gd_tenants WHERE id = ?', [$slug]) : null;
        if ($tenantRow === null) {
            // Stessa risposta di una password errata: non si rivela quali sedi esistono.
            self::recordFailure($key, $username);
            usleep(250000);
            throw new ApiException(401, 'invalid-credentials', 'Credenziali non valide.');
        }
        self::useTenant($tenantRow);

        $needle = mb_strtolower($username);
        $byUsername = [];
        $byName = [];
        foreach (Store::loadCollection('staff') as $row) {
            $d = $row['data'];
            if (isset($d->username) && is_string($d->username) && mb_strtolower(trim($d->username)) === $needle) {
                $byUsername[] = $row;
            } elseif (isset($d->name) && is_string($d->name) && mb_strtolower(trim($d->name)) === $needle) {
                $byName[] = $row;
            }
        }

        foreach (array_merge($byUsername, $byName) as $row) {
            if (self::passwordAccepted($row['data'], $password)) {
                self::clearAttempts($key, $username);
                return self::startSession($row);
            }
        }

        self::recordFailure($key, $username);
        // Piccolo ritardo contro attacchi a raffica.
        usleep(250000);
        throw new ApiException(401, 'invalid-credentials', 'Credenziali non valide.');
    }

    private static function passwordAccepted(stdClass $staff, string $given): bool
    {
        $stored = isset($staff->password) && is_string($staff->password) ? $staff->password : '';
        if ($stored === '') {
            if (!Config::get('allow_passwordless', true)) {
                return false;
            }
            // Un account senza password accetta solo il campo password vuoto: se qualcuno
            // digita una password, sta cercando un altro account con lo stesso nome.
            if ($given !== '') {
                return false;
            }
            return Policy::userLevel($staff) <= (int) Config::get('passwordless_max_level', 1);
        }
        if (Policy::isHash($stored)) {
            return password_verify($given, $stored);
        }
        // Password in chiaro importata dalla vecchia app: confronto sicuro e poi upgrade a hash.
        return hash_equals($stored, $given);
    }

    private static function startSession(array $row): array
    {
        $staff = $row['data'];
        $id = $row['id'];

        $write = (object) [
            'op' => 'update',
            'c' => 'staff',
            'id' => $id,
            'data' => (object) ['lastSeen' => gmdate('Y-m-d\TH:i:s.v\Z')],
        ];
        // Se la password era in chiaro, la riscriviamo come hash (la prepare() la converte).
        if (isset($staff->password) && is_string($staff->password) && $staff->password !== '' && !Policy::isHash($staff->password)) {
            $write->data->password = $staff->password;
        }
        Store::commit([], [$write], null);

        $user = Store::loadDoc('staff', $id);
        $token = bin2hex(random_bytes(32));
        $days = max(1, (int) Config::get('session_days', 30));
        $exp = time() + $days * 86400;
        $now = Db::now();
        Db::run(
            'INSERT INTO gd_sessions (token_hash, tenant_id, user_id, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
            [hash('sha256', $token), Tenant::id(), $id, $now, $now, gmdate('Y-m-d H:i:s', $exp)]
        );
        Db::run('DELETE FROM gd_sessions WHERE expires_at < ?', [$now]);
        self::setCookie($token, $exp);

        return self::$current = ['id' => $id, 'data' => $user['data'] ?? $staff];
    }

    public static function logout(): void
    {
        $token = $_COOKIE[self::COOKIE] ?? '';
        if (is_string($token) && preg_match('/^[a-f0-9]{64}$/', $token)) {
            Db::run('DELETE FROM gd_sessions WHERE token_hash = ?', [hash('sha256', $token)]);
        }
        self::setCookie('', time() - 3600);
        self::$current = null;
    }

    // --- Protezione contro tentativi ripetuti --------------------------------

    private static function since(): string
    {
        return gmdate('Y-m-d H:i:s', time() - self::ATTEMPT_WINDOW_MIN * 60);
    }

    private static function assertNotRateLimited(string $tenantKey, string $username): void
    {
        $since = self::since();
        $byIp = Db::one('SELECT COUNT(*) AS n FROM gd_login_attempts WHERE ip = ? AND ts > ?', [Http::clientIp(), $since]);
        $byUser = Db::one('SELECT COUNT(*) AS n FROM gd_login_attempts WHERE username = ? AND ts > ?', [self::attemptKey($tenantKey, $username), $since]);
        if ((int) ($byIp['n'] ?? 0) >= max(1, (int) Config::get('login_max_per_ip', self::MAX_ATTEMPTS_PER_IP)) || (int) ($byUser['n'] ?? 0) >= self::MAX_ATTEMPTS_PER_USER) {
            throw new ApiException(429, 'too-many-attempts', 'Troppi tentativi di accesso. Riprova tra qualche minuto.');
        }
    }

    private static function recordFailure(string $tenantKey, string $username): void
    {
        Db::run(
            'INSERT INTO gd_login_attempts (ip, username, ts) VALUES (?, ?, ?)',
            [Http::clientIp(), self::attemptKey($tenantKey, $username), Db::now()]
        );
        Db::run('DELETE FROM gd_login_attempts WHERE ts < ?', [gmdate('Y-m-d H:i:s', time() - 86400)]);
    }

    private static function clearAttempts(string $tenantKey, string $username): void
    {
        Db::run('DELETE FROM gd_login_attempts WHERE username = ?', [self::attemptKey($tenantKey, $username)]);
    }
}
