import type { StaffMember } from '../types';

/**
 * Le "casse" (es. "Cassa Comune A") sono utenti tecnici, non persone: non pagano la quota acqua,
 * non compaiono nei turni di servizio, nelle prenotazioni, negli interventi, ecc.
 * Si riconoscono dal campo esplicito `isCashbox`; per i dati importati dalla vecchia app,
 * che non lo avevano, si usa il nome SOLO se inizia con la parola "Cassa"
 * (così "Cassandra" o "Cassano" restano persone vere).
 */
export const isCashbox = (s: Pick<StaffMember, 'name' | 'isCashbox'> | null | undefined): boolean => {
    if (!s) return false;
    if (typeof s.isCashbox === 'boolean') return s.isCashbox;
    return /^\s*cassa(\s|$)/i.test(s.name ?? '');
};
