#!/usr/bin/env node
/**
 * Prepara il pacchetto da caricare sul sito (marcofabbrini.com/vvf/gestionali/).
 *
 * Uso:   npm run package:deploy            (compila l'app e crea la cartella deploy/)
 *        npm run package:deploy -- --skip-build   (riusa dist/ già compilato)
 *
 * Risultato:
 *   deploy/gestionali/            -> il CONTENUTO va caricato in /vvf/gestionali/
 *   deploy/gestionali.zip         -> stesso contenuto già zippato
 *
 * Dentro c'è la cartella api/ (backend PHP). Il file api/config.php NON viene creato:
 * lo crei sul server partendo da api/config.sample.php, così le credenziali del
 * database non passano mai da GitHub né dallo zip.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'deploy');
const target = join(out, 'gestionali');
const skipBuild = process.argv.includes('--skip-build');

const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

if (!skipBuild) {
    console.log('> Compilazione dell\'app…');
    run('npm run build');
}
if (!existsSync(join(root, 'dist', 'index.html'))) {
    console.error('dist/index.html non trovato: esegui prima la compilazione.');
    process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

// 1. Frontend
cpSync(join(root, 'dist'), target, { recursive: true });

// 2. Backend (senza test e senza config.php)
const api = join(target, 'api');
const serverDir = join(root, 'server');
cpSync(serverDir, api, {
    recursive: true,
    filter: (src) => {
        const rel = src.slice(serverDir.length).replace(/\\/g, '/');
        if (rel === '/tests' || rel.startsWith('/tests/')) return false;
        if (rel === '/config.php') return false;
        return true;
    },
});

// 3. File "index.html" vuoti nelle cartelle interne (evita l'elenco dei file su hosting che lo permettono)
for (const dir of [join(api, 'lib'), join(api, 'tools')]) {
    writeFileSync(join(dir, 'index.html'), '');
}

// 4. Zip
const zipPath = join(out, 'gestionali.zip');
try {
    if (process.platform === 'win32') {
        run(`powershell -NoProfile -Command "Compress-Archive -Path '${target}\\*' -DestinationPath '${zipPath}' -Force"`);
    } else {
        run(`zip -qr "${zipPath}" .`, target);
    }
} catch {
    console.warn('! Impossibile creare lo zip automaticamente: carica la cartella deploy/gestionali/ così com\'è.');
}

const count = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? count(join(d, f)) : 1), 0);
console.log(`\nPacchetto pronto: ${target}  (${count(target)} file)`);
console.log('Carica il CONTENUTO di quella cartella in /vvf/gestionali/ sul tuo spazio web,');
console.log('poi crea api/config.php da api/config.sample.php (vedi DEPLOY.md).');
