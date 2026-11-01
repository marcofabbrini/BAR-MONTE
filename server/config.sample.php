<?php
/**
 * Configurazione del backend GESDI.
 *
 * 1. Copia questo file in "config.php" (stessa cartella) e compila i valori.
 * 2. NON caricare config.php su GitHub: contiene le credenziali del database.
 */
return [
    'db' => [
        // Host MySQL: lo trovi nel pannello del tuo hosting (spesso NON è "localhost").
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'Sql837388_4',
        // Utente e password del database (pannello hosting -> MySQL).
        'user' => 'Sql837388',
        'pass' => 'INSERISCI_LA_PASSWORD_DEL_DATABASE',
    ],

    // Sede (distaccamento) a cui si accede quando l'indirizzo non ne indica una.
    // Ogni sede ha i suoi dati; si accede a un'altra sede con  ...?sede=<codice>
    'default_tenant' => 'montepulciano',

    // Tentativi di accesso falliti consentiti per indirizzo IP in 15 minuti (di base 30; si alza solo nei test).
    // 'login_max_per_ip' => 30,

    // Durata della sessione di login (giorni).
    'session_days' => 30,

    // Accesso senza password: nella vecchia app un utente senza password entrava
    // solo col nome. Qui resta possibile, ma SOLO per ruoli fino al livello indicato
    // (1 = Utente Standard). Metti false per richiedere sempre la password.
    'allow_passwordless' => true,
    'passwordless_max_level' => 1,

    // Analisi AI (scheda Insights). Chiave API Google Gemini: lascia vuoto per disattivare.
    'gemini_api_key' => '',
    'gemini_model' => 'gemini-3-flash-preview',

    // Ripristino di emergenza del Super Admin (server/tools/reset_superadmin.php).
    // Lascia VUOTO per tenerlo disattivato; impostalo solo quando serve, poi svuotalo.
    'reset_token' => '',

    // Mostra i dettagli tecnici degli errori (solo per diagnosi, poi rimetti false).
    'debug' => false,
];
