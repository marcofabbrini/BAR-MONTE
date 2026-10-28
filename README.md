# GESDI – Gestionale distaccamenti VVF

Applicazione web per la gestione delle attività del distaccamento VVF di Montepulciano
(casse bar, presenze e turni, interventi, mezzi, lavanderia, giochi, report).

Pubblicata su **https://marcofabbrini.com/vvf/gestionali/** con database **MySQL `Sql837388_4`**.

## Come è fatta

```
 Browser (React + Vite)                 Hosting marcofabbrini.com
 ┌──────────────────────┐   HTTPS/JSON  ┌────────────────────────────┐
 │ App  (cartella /)    │ ────────────▶ │ /vvf/gestionali/api/       │      ┌──────────────┐
 │ lib/db.ts            │ ◀──────────── │ PHP 8.1+  (cartella server)│ ───▶ │ MySQL        │
 │ (sync ogni ~3 s)     │   sessione    │ login, permessi, scritture │      │ Sql837388_4  │
 └──────────────────────┘   (cookie)    └────────────────────────────┘      └──────────────┘
```

| Cartella / file      | Contenuto |
|----------------------|-----------|
| `components/`, `contexts/`, `services/`, `App.tsx` | Interfaccia e logica dell'app (invariati rispetto alla versione su Firebase, salvo login e password) |
| `lib/db.ts`          | Livello dati: stessa interfaccia di Firestore, ma parla con l'API PHP/MySQL |
| `server/`            | Backend PHP (API, login, permessi, schema SQL) → va in `/vvf/gestionali/api/` |
| `tools/migrate-firestore.mjs` | Copia i dati esistenti da Firestore a MySQL |
| `tools/package-deploy.mjs`    | Prepara il pacchetto da caricare sul sito |
| `tests/`, `server/tests/`     | Test automatici |

**Installazione sul sito, migrazione dati e sicurezza: leggi [DEPLOY.md](DEPLOY.md).**

## Sviluppo in locale

Servono Node 18+ e PHP 8.1+ con MySQL/MariaDB.

```bash
npm install
cp server/config.sample.php server/config.php     # compila host/utente/password del DB di prova
php -S 127.0.0.1:8099 -t server                    # backend (terminale 1)
npm run dev                                        # app su http://localhost:5173 (terminale 2)
```

Le tabelle vengono create in automatico alla prima richiesta. Il primo utente (Super Admin) si crea con
`server/tools/reset_superadmin.php` (vedi DEPLOY.md, sezione "Primo accesso").

## Test

```bash
# Backend + database di prova già avviati e con utenti di prova (php server/tests/seed.php)
GESTIONALE_CONFIG=/percorso/config.php php server/tests/seed.php
GD_TEST_URL=http://127.0.0.1:8099/index.php npm run test:api     # API, permessi, concorrenza
GD_TEST_URL=http://127.0.0.1:8099/index.php npm run test:e2e     # servizi reali dell'app via nuovo livello dati
node tests/migrate.test.mjs                                       # strumento di migrazione
npx tsc --noEmit                                                  # controllo dei tipi
```

`tests/ui.smoke.test.tsx` è un test dell'interfaccia completa (opzionale, richiede
`npm i --no-save vitest jsdom @testing-library/react @testing-library/user-event`).
