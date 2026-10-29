<?php
declare(strict_types=1);

/**
 * Creazione di una nuova sede (distaccamento).
 *
 * Come si usa (come reset_superadmin.php, stesso token):
 *  1. In config.php imposta 'reset_token' => 'una-frase-lunga-e-segreta' (dal secret RESET_TOKEN).
 *  2. Apri .../api/tools/create_tenant.php
 *  3. Inserisci token, codice della sede (minuscole, numeri, trattino: es. "chiusi"), nome, e il
 *     nome utente + password del primo Super Admin della sede.
 *  4. SUBITO DOPO rimetti 'reset_token' => '' (cancella il secret e rilancia il deploy).
 *
 * La sede si usa con  .../vvf/gestionali/?sede=<codice>
 */

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/Db.php';
require __DIR__ . '/../lib/Modules.php';
require __DIR__ . '/../lib/Policy.php';
require __DIR__ . '/../lib/Store.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function page(string $body): never
{
    echo '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Nuova sede</title><style>body{font-family:system-ui,sans-serif;max-width:30rem;margin:3rem auto;padding:0 1rem;color:#1e293b}'
        . 'input,button{font:inherit;padding:.6rem;width:100%;box-sizing:border-box;margin:.25rem 0 1rem}button{background:#b91c1c;color:#fff;border:0;border-radius:.4rem;cursor:pointer}'
        . '.ok{background:#dcfce7;padding:1rem;border-radius:.4rem}.err{background:#fee2e2;padding:1rem;border-radius:.4rem}</style></head><body>'
        . '<h1>Nuova sede</h1>' . $body . '</body></html>';
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
            . '<label>Codice della sede (es. chiusi)<input name="slug" required pattern="[a-z0-9][a-z0-9\-]{0,30}"></label>'
            . '<label>Nome della sede (es. Distaccamento VVF Chiusi)<input name="name" required maxlength="120"></label>'
            . '<label>Nome utente del primo Super Admin<input name="username" required></label>'
            . '<label>Password (almeno 8 caratteri)<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>'
            . '<button type="submit">Crea sede</button></form>');
    }

    usleep(500000);
    if (!hash_equals($token, (string) ($_POST['token'] ?? ''))) {
        http_response_code(403);
        page('<p class="err">Token errato.</p>');
    }

    $slug = mb_strtolower(trim((string) ($_POST['slug'] ?? '')));
    $name = trim((string) ($_POST['name'] ?? ''));
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    if (!Tenant::valid($slug) || $name === '' || mb_strlen($name) > 120 || $username === '' || strlen($password) < 8) {
        http_response_code(400);
        page('<p class="err">Controlla i campi: codice (minuscole, numeri, trattino), nome, utente e password di almeno 8 caratteri.</p>');
    }

    Db::ensureSchema();
    if (Db::one('SELECT id FROM gd_tenants WHERE id = ?', [$slug]) !== null) {
        http_response_code(409);
        page('<p class="err">Esiste già una sede con questo codice.</p>');
    }

    Db::begin();
    try {
        Db::run('INSERT INTO gd_tenants (id, name, created_at) VALUES (?, ?, ?)', [$slug, $name, Db::now()]);
        Tenant::set($slug);
        Store::commit([], [(object) ['op' => 'set', 'c' => 'staff', 'id' => bin2hex(random_bytes(10)), 'data' => (object) [
            'name' => $username, 'username' => $username, 'password' => $password,
            'role' => 'super-admin', 'shift' => 'a', 'grade' => 'CS', 'icon' => '🛡️',
        ]]], null);
        Db::commit();
    } catch (Throwable $e) {
        Db::rollback();
        throw $e;
    }

    page('<p class="ok">Sede <strong>' . $h($name) . '</strong> creata.<br>Indirizzo: <code>?sede=' . $h($slug) . '</code> '
        . '(es. <code>https://www.marcofabbrini.com/vvf/gestionali/?sede=' . $h($slug) . '</code>).<br>'
        . 'Accedi con l\'utente <strong>' . $h($username) . '</strong>. Ora rimetti <code>reset_token</code> vuoto in <code>config.php</code>.</p>');
} catch (ApiException $e) {
    http_response_code($e->status);
    page('<p class="err">' . $h($e->getMessage()) . '</p>');
} catch (Throwable $e) {
    error_log('GESDI create_tenant: ' . $e->getMessage());
    http_response_code(500);
    page('<p class="err">Errore: ' . $h(Config::debug() ? $e->getMessage() : 'controlla i log del server') . '</p>');
}
