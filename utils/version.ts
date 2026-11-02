/**
 * Versione dell'app mostrata nel piè di pagina e nel login.
 * Formato: RELEASE.PROGRESSIVO a tre cifre (es. 05.001). Va aggiornata ad ogni rilascio:
 * il progressivo sale di uno a ogni pubblicazione, e riparte da 000 quando cambia la release.
 */
export const APP_RELEASE = 5;
export const APP_BUILD = 13;

const pad = (n: number) => String(n).padStart(3, '0');
export const APP_VERSION = `${String(APP_RELEASE).padStart(2, '0')}.${pad(APP_BUILD)}`;
