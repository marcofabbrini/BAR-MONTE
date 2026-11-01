#!/usr/bin/env node
/**
 * Genera api/config.php a partire da variabili d'ambiente (GitHub Secrets).
 *
 * Uso:  node tools/write-config.mjs <percorso/di/config.php>
 *
 * Obbligatorie: DB_HOST, DB_NAME, DB_USER, DB_PASS
 * Facoltative:  DB_PORT (3306), GEMINI_API_KEY, GEMINI_MODEL, RESET_TOKEN
 *
 * Il file contiene credenziali: non va mai salvato nel repository (è in .gitignore).
 */
import { writeFileSync } from 'node:fs';

const target = process.argv[2];
if (!target) {
    console.error('Uso: node tools/write-config.mjs <percorso/di/config.php>');
    process.exit(1);
}

const env = process.env;
const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'].filter((k) => !env[k]);
if (missing.length) {
    console.error(`Mancano i secret: ${missing.join(', ')} (Settings > Secrets and variables > Actions).`);
    process.exit(1);
}

const php = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const port = Number(env.DB_PORT || 3306);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('DB_PORT non valida.');
    process.exit(1);
}

const content = `<?php
// File generato automaticamente dal deploy (tools/write-config.mjs). Non modificare a mano:
// le modifiche vengono sovrascritte al prossimo deploy. Cambia i valori nei GitHub Secrets.
return [
    'db' => [
        'host' => ${php(env.DB_HOST)},
        'port' => ${port},
        'name' => ${php(env.DB_NAME)},
        'user' => ${php(env.DB_USER)},
        'pass' => ${php(env.DB_PASS)},
    ],
    'session_days' => 30,
    'allow_passwordless' => true,
    'passwordless_max_level' => 1,
    'gemini_api_key' => ${php(env.GEMINI_API_KEY || '')},
    'gemini_model' => ${php(env.GEMINI_MODEL || 'gemini-3-flash-preview')},
    'reset_token' => ${php(env.RESET_TOKEN || '')},
    'debug' => false,
];
`;
writeFileSync(target, content, { encoding: 'utf8', mode: 0o600 });
console.log(`config.php scritto in ${target}`);
