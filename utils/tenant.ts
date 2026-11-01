import { TenantInfo } from '../lib/db';

const FALLBACK = 'Montepulciano';

/** Nome completo della sede, es. "Distaccamento VVF Montepulciano". */
export const sedeFullName = (tenant: TenantInfo | null | undefined): string =>
    (tenant?.config?.displayName || tenant?.name || `Distaccamento VVF ${FALLBACK}`).trim();

/** Nome breve della sede, senza il prefisso "Distaccamento VVF", es. "Montepulciano". */
export const sedeShortName = (tenant: TenantInfo | null | undefined): string => {
    const short = sedeFullName(tenant).replace(/^distaccamento\s+(vvf\s+)?/i, '').replace(/^vvf\s+/i, '').trim();
    return short || FALLBACK;
};
