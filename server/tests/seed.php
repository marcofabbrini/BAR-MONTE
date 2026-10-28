<?php
declare(strict_types=1);
/** Prepara utenti di prova per i test (CLI). Uso: GESTIONALE_CONFIG=... php tests/seed.php */
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/Db.php';
require __DIR__ . '/../lib/Policy.php';
require __DIR__ . '/../lib/Store.php';

Db::ensureSchema();
Db::run('DELETE FROM gd_documents');
Db::run('DELETE FROM gd_collection_rev');
Db::run('DELETE FROM gd_sessions');
Db::run('DELETE FROM gd_login_attempts');

$mk = static fn(string $id, array $d) => (object) ['op' => 'set', 'c' => 'staff', 'id' => $id, 'data' => (object) $d];
Store::commit([], [
    $mk('u-super', ['name' => 'Super', 'username' => 'admin', 'password' => 'superpw', 'role' => 'super-admin', 'shift' => 'a']),
    $mk('u-admin', ['name' => 'Anna Admin', 'username' => 'anna', 'password' => 'annapw', 'role' => 'admin', 'shift' => 'b']),
    $mk('u-mgr', ['name' => 'Marco Manager', 'password' => 'mgrpw', 'role' => 'manager', 'shift' => 'c']),
    $mk('u-std', ['name' => 'Mario Rossi', 'username' => 'mario', 'password' => 'mariopw', 'role' => 'standard', 'shift' => 'a']),
    $mk('u-free', ['name' => 'Libero Accesso', 'role' => 'standard', 'shift' => 'd']),
    $mk('u-freemgr', ['name' => 'Manager Senza Password', 'role' => 'manager', 'shift' => 'd']),
], null);
// Utente importato dalla vecchia app: password in chiaro (verrà convertita in hash al primo login).
Db::run(
    'INSERT INTO gd_documents (collection, doc_id, data, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    ['staff', 'u-plain', json_encode(['name' => 'Vecchio Utente', 'username' => 'vecchio', 'password' => 'plainpw', 'role' => 'standard', 'shift' => 'a']), Db::now(), Db::now()]
);
echo "seed ok\n";
