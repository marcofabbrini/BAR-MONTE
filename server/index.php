<?php
declare(strict_types=1);

/**
 * API GESDI — unico punto d'ingresso: index.php?action=<azione>
 * Tutte le richieste sono POST con corpo JSON.
 */

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"php-version","message":"Serve PHP 8.1 o superiore (versione attuale: ' . PHP_VERSION . '). Cambiala dal pannello dell\'hosting."}';
    exit;
}

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Modules.php';
require __DIR__ . '/lib/Policy.php';
require __DIR__ . '/lib/Store.php';
require __DIR__ . '/lib/Tenants.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/Gemini.php';

/** Esegue l'azione richiesta e restituisce il payload da inviare. */
function handle(string $action): array
{
    switch ($action) {
        case 'auth.login': {
            $b = Http::body();
            $user = Auth::login(
                (string) ($b->username ?? ''),
                (string) ($b->password ?? ''),
                isset($b->tenant) && is_string($b->tenant) ? $b->tenant : null
            );
            return ['user' => Auth::publicUser($user), 'tenant' => Auth::tenantInfo()];
        }

        case 'auth.logout':
            Auth::logout();
            return ['ok' => true];

        case 'auth.me': {
            $u = Auth::currentUser();
            return ['user' => $u === null ? null : Auth::publicUser($u), 'tenant' => $u === null ? null : Auth::tenantInfo()];
        }

        case 'tenant.public': {
            // Nome della sede per la schermata di login (nessun dato riservato).
            $b = Http::body();
            $slug = isset($b->tenant) && is_string($b->tenant) ? $b->tenant : null;
            return ['name' => Tenants::publicName($slug)];
        }

        case 'tenants.list':
            Auth::requirePlatformAdmin();
            return ['tenants' => Tenants::list(), 'modules' => array_map(
                static fn($d) => ['label' => $d[0], 'requires' => $d[2]], Modules::DEFS
            )];

        case 'tenants.create': {
            Auth::requirePlatformAdmin();
            $b = Http::body();
            return ['tenant' => Tenants::create($b->id ?? null, $b->name ?? null, $b->config ?? null, $b->adminUser ?? null, $b->adminPassword ?? null)];
        }

        case 'tenants.update': {
            Auth::requirePlatformAdmin();
            $b = Http::body();
            return ['tenant' => Tenants::update($b->id ?? null, $b->name ?? null, $b->config ?? null)];
        }

        case 'tenants.setAdmin': {
            Auth::requirePlatformAdmin();
            $b = Http::body();
            return Tenants::setSuperAdmin($b->id ?? null, $b->username ?? null, $b->password ?? null);
        }

        case 'sync':
            Auth::requireUser();
            return actionSync(Http::body());

        case 'getDoc': {
            Auth::requireUser();
            $b = Http::body();
            $c = Store::checkCollection($b->c ?? null);
            $id = Store::checkId($b->id ?? null);
            $doc = Store::loadDoc($c, $id);
            if ($doc === null) {
                return ['exists' => false, 'version' => 0];
            }
            return ['exists' => true, 'version' => $doc['version'], 'data' => Policy::sanitizeOut($c, $doc['data'])];
        }

        case 'getQuery': {
            Auth::requireUser();
            $b = Http::body();
            $c = Store::checkCollection($b->collection ?? null);
            $rows = Store::query(
                Store::loadCollection($c),
                (array) ($b->where ?? []),
                (array) ($b->orderBy ?? []),
                isset($b->limit) && is_int($b->limit) ? $b->limit : null
            );
            return ['docs' => outRows($c, $rows)];
        }

        case 'commit': {
            $actor = Auth::requireUser();
            $b = Http::body();
            $reads = is_array($b->reads ?? null) ? $b->reads : [];
            $writes = is_array($b->writes ?? null) ? $b->writes : [];
            Store::commit($reads, $writes, $actor);
            return ['ok' => true];
        }

        case 'analyze': {
            Auth::requireUser();
            $b = Http::body();
            $prompt = isset($b->prompt) && is_string($b->prompt) ? trim($b->prompt) : '';
            if ($prompt === '') {
                throw new ApiException(400, 'prompt-required', 'Il prompt è richiesto nel corpo della richiesta.');
            }
            return ['analysis' => Gemini::generate($prompt)];
        }

        default:
            throw new ApiException(404, 'unknown-action', 'Azione sconosciuta.');
    }
}

/** @param array<int,array{id:string,data:stdClass}> $rows */
function outRows(string $c, array $rows): array
{
    $out = [];
    foreach ($rows as $r) {
        $out[] = ['id' => $r['id'], 'data' => Policy::sanitizeOut($c, $r['data'])];
    }
    return $out;
}

function actionSync(stdClass $body): array
{
    $subs = is_array($body->subs ?? null) ? $body->subs : [];
    if (count($subs) > 100) {
        throw new ApiException(413, 'too-many-subs', 'Troppe sottoscrizioni.');
    }

    $collections = [];
    foreach ($subs as $s) {
        $collections[] = Store::checkCollection($s->collection ?? null);
    }
    // La revisione si legge PRIMA dei dati: se qualcuno scrive nel frattempo,
    // al prossimo giro il client riceve comunque l'aggiornamento.
    $revs = Store::revs($collections);

    $cache = [];
    $results = [];
    foreach ($subs as $s) {
        $c = (string) $s->collection;
        $rev = $revs[$c] ?? 0;
        $known = $s->rev ?? null;
        $res = ['id' => $s->id ?? null, 'rev' => $rev];

        if (is_int($known) && $known === $rev) {
            $res['changed'] = false;
            $results[] = $res;
            continue;
        }
        $res['changed'] = true;

        if (($s->kind ?? 'query') === 'doc') {
            $id = Store::checkId($s->docId ?? null);
            $doc = Store::loadDoc($c, $id);
            $res['exists'] = $doc !== null;
            if ($doc !== null) {
                $res['data'] = Policy::sanitizeOut($c, $doc['data']);
            }
        } else {
            $cache[$c] ??= Store::loadCollection($c);
            $rows = Store::query(
                $cache[$c],
                (array) ($s->where ?? []),
                (array) ($s->orderBy ?? []),
                isset($s->limit) && is_int($s->limit) ? $s->limit : null
            );
            $res['docs'] = outRows($c, $rows);
        }
        $results[] = $res;
    }
    return ['results' => $results];
}

// --- Esecuzione --------------------------------------------------------------

try {
    Http::assertSameOriginJson();
    $action = (string) ($_GET['action'] ?? '');

    try {
        $payload = handle($action);
    } catch (Throwable $e) {
        if (Db::isMissingTable($e)) {
            // Prima esecuzione: crea le tabelle e riprova una volta.
            Db::rollback();
            Db::ensureSchema();
            $payload = handle($action);
        } else {
            throw $e;
        }
    }
    Http::send($payload);
} catch (ApiException $e) {
    Http::error($e);
} catch (Throwable $e) {
    error_log('GESDI error: ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $msg = Config::debug() ? $e::class . ': ' . $e->getMessage() : 'Errore interno del server.';
    Http::send(['error' => 'server-error', 'message' => $msg], 500);
}
