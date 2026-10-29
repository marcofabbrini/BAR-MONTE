<?php
declare(strict_types=1);

/**
 * Ripristino di emergenza del Super Admin.
 *
 * Sostituisce il vecchio trucco "RESET / 123456" della schermata di login, che con
 * il database online sarebbe un buco di sicurezza.
 *
 * Come si usa:
 *  1. In config.php sul server imposta 'reset_token' => 'una-frase-lunga-e-segreta'.
 *  2. Apri https://marcofabbrini.com/vvf/gestionali/api/tools/reset_superadmin.php
 *  3. Inserisci token, nome utente e nuova password.
 *  4. SUBITO DOPO rimetti 'reset_token' => '' in config.php (e, se vuoi, cancella questo file).
 */

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/Db.php';
require __DIR__ . '/../lib/Policy.php';
require __DIR__ . '/../lib/Store.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function page(string $body): never
{
    echo '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Ripristino Super Admin</title><style>body{font-family:system-ui,sans-serif;max-width:30rem;margin:3rem auto;padding:0 1rem;color:#1e293b}'
        . 'input,button{font:inherit;padding:.6rem;width:100%;box-sizing:border-box;margin:.25rem 0 1rem}button{background:#b91c1c;color:#fff;border:0;border-radius:.4rem;cursor:pointer}'
        . '.ok{background:#dcfce7;padding:1rem;border-radius:.4rem}.err{background:#fee2e2;padding:1rem;border-radius:.4rem}</style></head><body>'
        . '<h1>Ripristino Super Admin</h1>' . $body . '</body></html>';
    exit;
}

$h = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

try {
    $token = (string) Config::get('reset_token', '');
    if ($token === '') {
        http_response_code(403);
        page('<p class="err">Strumento disattivato. Per usarlo imposta <code>reset_token</code> in <code>config.php</code>.</p>');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        page('<form method="post"><label>Token (da config.php)<input type="password" name="token" required autocomplete="off"></label>'
            . '<label>Sede (codice)<input name="sede" value="' . $h(Tenant::defaultSlug()) . '" required></label>'
            . '<label>Nome utente del Super Admin<input name="username" value="admin" required></label>'
            . '<label>Nuova password (almeno 8 caratteri)<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>'
            . '<button type="submit">Ripristina</button></form>'
            . '<p>Se l\'utente esiste diventa Super Admin con la nuova password; se non esiste viene creato.</p>');
    }

    usleep(500000);
    if (!hash_equals($token, (string) ($_POST['token'] ?? ''))) {
        http_response_code(403);
        page('<p class="err">Token errato.</p>');
    }
    $slug = mb_strtolower(trim((string) ($_POST['sede'] ?? '')));
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    if ($username === '' || strlen($password) < 8) {
        http_response_code(400);
        page('<p class="err">Inserisci un nome utente e una password di almeno 8 caratteri.</p>');
    }

    Db::ensureSchema(); // crea/aggiorna le tabelle se servono (include le sedi)
    if (!Tenant::valid($slug) || Db::one('SELECT id FROM gd_tenants WHERE id = ?', [$slug]) === null) {
        http_response_code(400);
        page('<p class="err">Sede inesistente. Se è nuova, creala prima con create_tenant.php.</p>');
    }
    Tenant::set($slug);
    $rows = Store::loadCollection('staff');

    $target = null;
    $needle = mb_strtolower($username);
    foreach ($rows as $r) {
        $d = $r['data'];
        $u = isset($d->username) && is_string($d->username) ? mb_strtolower(trim($d->username)) : '';
        $n = isset($d->name) && is_string($d->name) ? mb_strtolower(trim($d->name)) : '';
        if ($u === $needle || $n === $needle) {
            $target = $r;
            break;
        }
    }

    if ($target !== null) {
        $w = (object) ['op' => 'update', 'c' => 'staff', 'id' => $target['id'], 'data' => (object) ['role' => 'super-admin', 'password' => $password]];
        $what = 'aggiornato';
    } else {
        $id = bin2hex(random_bytes(10));
        $w = (object) ['op' => 'set', 'c' => 'staff', 'id' => $id, 'data' => (object) [
            'name' => 'Super Admin', 'username' => $username, 'password' => $password,
            'role' => 'super-admin', 'shift' => 'a', 'grade' => 'CS', 'icon' => '🛡️',
        ]];
        $what = 'creato';
    }
    Store::commit([], [$w], null);
    // Chiude tutte le sessioni aperte di questa sede, per sicurezza.
    Db::run('DELETE FROM gd_sessions WHERE tenant_id = ?', [Tenant::id()]);

    page('<p class="ok">Utente <strong>' . $h($username) . '</strong> ' . $what . ' come Super Admin della sede <strong>' . $h($slug) . '</strong>.<br>'
        . 'Ora rimetti <code>reset_token</code> vuoto in <code>config.php</code>.</p>');
} catch (ApiException $e) {
    http_response_code($e->status);
    page('<p class="err">' . $h($e->getMessage()) . '</p>');
} catch (Throwable $e) {
    error_log('GESDI reset: ' . $e->getMessage());
    http_response_code(500);
    page('<p class="err">Errore: ' . $h(Config::debug() ? $e->getMessage() : 'controlla i log del server') . '</p>');
}
