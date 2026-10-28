<?php
declare(strict_types=1);

/**
 * Bootstrap: errori, configurazione, utilità HTTP.
 */

ini_set('display_errors', '0');
ini_set('serialize_precision', '-1');
error_reporting(E_ALL);
date_default_timezone_set('UTC');

final class ApiException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message = ''
    ) {
        parent::__construct($message !== '' ? $message : $errorCode);
    }
}

final class Config
{
    private static ?array $cfg = null;

    public static function all(): array
    {
        if (self::$cfg === null) {
            $path = getenv('GESTIONALE_CONFIG') ?: (__DIR__ . '/../config.php');
            if (!is_file($path)) {
                throw new ApiException(500, 'config-missing', 'File config.php mancante: copia config.sample.php in config.php e compilalo.');
            }
            $loaded = require $path;
            if (!is_array($loaded)) {
                throw new ApiException(500, 'config-invalid', 'config.php non valido.');
            }
            self::$cfg = $loaded;
        }
        return self::$cfg;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    public static function debug(): bool
    {
        try {
            return (bool) self::get('debug', false);
        } catch (Throwable) {
            return false;
        }
    }
}

final class Http
{
    private static ?string $rawBody = null;

    public static function rawBody(): string
    {
        if (self::$rawBody === null) {
            self::$rawBody = (string) file_get_contents('php://input');
        }
        return self::$rawBody;
    }

    /** Corpo JSON della richiesta come oggetto (stdClass). */
    public static function body(): stdClass
    {
        $raw = self::rawBody();
        if ($raw === '') {
            return new stdClass();
        }
        $data = json_decode($raw, false, 64);
        if (!($data instanceof stdClass)) {
            throw new ApiException(400, 'bad-json', 'Corpo della richiesta non valido.');
        }
        return $data;
    }

    public static function isHttps(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }
        return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }

    public static function clientIp(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    /** Protezione CSRF di base per le richieste che modificano stato. */
    public static function assertSameOriginJson(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            throw new ApiException(405, 'method-not-allowed', 'Usa POST.');
        }
        $ct = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
        if (!str_starts_with($ct, 'application/json')) {
            throw new ApiException(415, 'unsupported-media-type', 'Content-Type deve essere application/json.');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        if ($origin !== null && $origin !== '' && $origin !== 'null') {
            $originHost = parse_url($origin, PHP_URL_HOST);
            $originPort = parse_url($origin, PHP_URL_PORT);
            $originAuth = $originHost . ($originPort ? ':' . $originPort : '');
            $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
            if (strcasecmp($originAuth, $host) !== 0) {
                throw new ApiException(403, 'bad-origin', 'Origine non consentita.');
            }
        }
    }

    public static function send(mixed $payload, int $status = 200): never
    {
        $json = json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE
        );
        if ($json === false) {
            $status = 500;
            $json = '{"error":"encode-failed"}';
        }
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        $accept = (string) ($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '');
        if (strlen($json) > 1024 && str_contains($accept, 'gzip') && function_exists('gzencode')) {
            $gz = gzencode($json, 5);
            if ($gz !== false) {
                header('Content-Encoding: gzip');
                header('Vary: Accept-Encoding');
                $json = $gz;
            }
        }
        header('Content-Length: ' . strlen($json));
        echo $json;
        exit;
    }

    public static function error(ApiException $e): never
    {
        self::send(['error' => $e->errorCode, 'message' => $e->getMessage()], $e->status);
    }
}
