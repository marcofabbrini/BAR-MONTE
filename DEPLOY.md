# Installazione su marcofabbrini.com/vvf/gestionali

Tempo stimato: 20–30 minuti. Cosa serve:

- Hosting con **PHP 8.1 o superiore** e il database MySQL **`Sql837388_4`** (già creato).
- Accesso FTP (o File Manager) allo spazio web e a **phpMyAdmin**.
- Sul tuo PC: **Node 18+** (serve solo per preparare il pacchetto e per la migrazione dei dati).

## 1. Preparare il pacchetto

```bash
git clone https://github.com/marcofabbrini/bar-monte.git   # (o aggiorna la tua copia)
cd bar-monte
npm install
npm run package:deploy
```

Crea la cartella `deploy/gestionali/` (e lo stesso contenuto in `deploy/gestionali.zip`).

## 2. Caricarlo sul sito

1. Con FTP crea la cartella `vvf/gestionali` dentro lo spazio web del dominio.
2. Carica **il contenuto** di `deploy/gestionali/` (o decomprimi lo zip) dentro `vvf/gestionali/`.

Risultato atteso sul server:

```
vvf/gestionali/index.html
vvf/gestionali/assets/…
vvf/gestionali/logo.png
vvf/gestionali/.htaccess
vvf/gestionali/api/index.php
vvf/gestionali/api/lib/…
vvf/gestionali/api/config.sample.php
…
```

> I file che iniziano con il punto (`.htaccess`) possono risultare nascosti nel client FTP: abilita "mostra file nascosti".

## 3. Collegare il database

1. Sul server, in `vvf/gestionali/api/`, **copia** `config.sample.php` in `config.php`.
2. Modifica `config.php` e inserisci i dati del database dal pannello dell'hosting (sezione *Database MySQL*):
   - `host`: l'indirizzo del server MySQL (spesso **non** è `localhost`, controlla nel pannello)
   - `name`: `Sql837388_4` (già impostato)
   - `user` e `pass`: utente e password del database
3. Verifica: apri `https://marcofabbrini.com/vvf/gestionali/` — deve comparire la schermata di accesso.
   Se vedi "Database non raggiungibile", i dati in `config.php` non sono corretti
   (per vedere il motivo preciso metti temporaneamente `'debug' => true`, poi rimettilo `false`).

Le tabelle (`gd_documents`, `gd_collection_rev`, `gd_sessions`, `gd_login_attempts`) si **creano da sole**
alla prima richiesta. In alternativa importa `api/schema.sql` da phpMyAdmin.

`config.php` contiene la password del database: **non va mai messo su GitHub** (è già escluso da `.gitignore`).

## 4. Portare i dati dalla vecchia app (Firebase)

Sul tuo PC, nella cartella del progetto:

```bash
node tools/migrate-firestore.mjs
```

Legge tutte le collezioni di Firestore (senza modificarle) e crea la cartella `migrazione/` con uno o più
file `gestionali-import-01.sql`, …

Poi: **phpMyAdmin → database `Sql837388_4` → scheda "Importa"** → carica i file **in ordine**.

- Se lo script risponde *"Accesso negato"*, le regole di Firestore non permettono la lettura pubblica:
  rilancia con `node tools/migrate-firestore.mjs --token "$(gcloud auth print-access-token)"`
  (serve l'[SDK gcloud](https://cloud.google.com/sdk) e un account con accesso al progetto Firebase).
- Si può ripetere l'importazione: i documenti vengono aggiornati, non duplicati.
- Le password degli utenti vengono copiate com'erano; **al primo accesso di ciascun utente diventano
  automaticamente hash sicuri**.

> Consiglio: fai la migrazione quando nessuno sta usando la vecchia app, così non perdi movimenti dell'ultimo minuto.

## 5. Primo accesso

Accedi con un utente della vecchia app (nome utente o nome + password, come prima).

Se non hai migrato dati, o nessun Super Admin riesce ad entrare, usa il ripristino di emergenza:

1. In `api/config.php` imposta `'reset_token' => 'una-frase-lunga-e-segreta'`.
2. Apri `https://marcofabbrini.com/vvf/gestionali/api/tools/reset_superadmin.php`.
3. Inserisci token, nome utente e nuova password (min. 8 caratteri): l'utente diventa Super Admin (o viene creato).
4. **Subito dopo rimetti `'reset_token' => ''`** in `config.php`.

## 6. Cosa cambia rispetto alla vecchia versione (sicurezza)

Il database ora è raggiungibile da internet, quindi alcune cose sono state messe in sicurezza:

| Prima (Firebase) | Ora |
|---|---|
| Password nel database in chiaro e scaricate in ogni browser | Password salvate come hash, **mai inviate al browser**. Nelle schede utente il campo password si compila solo per cambiarla |
| Il controllo di nome/password lo faceva il browser | Lo fa il **server**, con sessione (cookie sicuro) e blocco dopo troppi tentativi |
| Scorciatoia "RESET / 123456" nel login | **Rimossa** (permetteva a chiunque di diventare Super Admin). Sostituita da `reset_superadmin.php` con token |
| Utente senza password: entra col solo nome | Resta valido **solo per gli Utenti Standard**; manager e admin senza password non possono accedere (config: `allow_passwordless`, `passwordless_max_level`) |
| Chiunque poteva scrivere ovunque | Il server impedisce di creare/modificare utenti sopra il proprio livello, di toccare un Super Admin se non lo si è, e di gestire `admins`/ruoli senza i permessi |
| Accesso con Google (Firebase Auth) | **Rimosso**: si usa solo il login dell'app. L'elenco "admins" resta visibile ma non ha più effetto sull'accesso |
| Aggiornamenti istantanei (Firestore) | Aggiornamento automatico ogni ~3 secondi (subito dopo le proprie azioni) |
| Analisi AI su Vercel | Passa dal server PHP: inserisci la chiave Gemini in `gemini_api_key` di `config.php` (vuota = funzione disattivata) |

Ruoli (invariati): Utente Standard = 1, Responsabile = 2, Amministratore = 3, Super Admin = 4, più i ruoli
personalizzati con il livello scelto.

## 7. Dopo il collaudo

- Controlla da *Admin → Staff* chi non ha la password (manca l'icona del lucchetto) e impostala.
- Verifica che `reset_token` sia vuoto.
- Assicurati che il sito sia raggiungibile **solo in HTTPS** (abilita il redirect dal pannello dell'hosting).
- Fai backup periodici del database (phpMyAdmin → Esporta, oppure i backup automatici dell'hosting).
  I dati stanno tutti nelle tabelle `gd_*`.
- Lo spazio `Firebase` della vecchia app puoi tenerlo per qualche settimana come copia di sicurezza, poi chiuderlo.

## 8. Limiti noti

- Gli aggiornamenti non sono istantanei (polling ~3 s; ~20 s se la scheda è in background).
- Ogni aggiornamento di una collezione grande (es. `orders`) la rimanda intera ai dispositivi aperti:
  va benissimo per un distaccamento, ma con decine di migliaia di ordini conviene archiviare i dati vecchi.
- Senza connessione l'app non funziona (la cache offline di Firestore non c'è più).

## Aggiornare l'app in futuro

Ripeti i punti 1 e 2: ricarica il contenuto di `deploy/gestionali/` **senza** sovrascrivere `api/config.php`
(non è nel pacchetto, quindi non rischi di cancellarlo). Il database non si tocca.

## Pubblicazione automatica (GitHub Actions + FTP)

Il workflow `.github/workflows/deploy.yml` compila l'app, genera `api/config.php` dai secret e
carica tutto via FTP in `/vvf/gestionali/`. Parte a ogni push su `main` oppure a mano da
**Actions → Pubblica GESDI → Run workflow**. Prima di caricare esegue `tsc` e il test della migrazione.

Secret da inserire in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Contenuto | Obbligatorio |
|---|---|---|
| `DB_HOST` | host MySQL (dal pannello hosting; spesso non è `localhost`) | sì |
| `DB_PORT` | porta (default 3306) | no |
| `DB_NAME` | `Sql837388_4` | sì |
| `DB_USER` | utente MySQL (`Sql837388`) | sì |
| `DB_PASS` | password MySQL | sì |
| `FTP_SERVER` | host FTP | sì |
| `FTP_USERNAME` / `FTP_PASSWORD` | credenziali FTP | sì |
| `FTP_SERVER_DIR` | cartella di destinazione, con la `/` finale, es. `/vvf/gestionali/` (relativa alla radice dell'account FTP) | sì |
| `FTP_PROTOCOL` | `ftps` (default), `ftp` o `ftps-legacy` se l'hosting non supporta FTPS esplicito | no |
| `FTP_PORT` | solo se non standard | no |
| `GEMINI_API_KEY` | attiva l'analisi AI | no |
| `RESET_TOKEN` | attiva il reset di emergenza del Super Admin; svuotalo dopo l'uso | no |

Note:
- `config.php` viene creato ad ogni deploy: per cambiare una credenziale modifica il secret e rilancia il workflow.
- I dati nel database non vengono toccati dal deploy (le tabelle si creano da sole alla prima richiesta).
- Il file `.ftp-deploy-sync-state.json` che l'action lascia sul server serve a caricare solo i file cambiati; è bloccato dal web da `.htaccess`.
- Il primo deploy carica tutto; se interrotto a metà, rilancialo.
