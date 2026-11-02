import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TenantApi, TenantSummary, PlatformStaff, ApiError } from '../lib/db';

/**
 * Personale di tutti i distaccamenti — solo Super Admin della sede principale.
 * Qui si cerca una persona e la si sposta da un distaccamento all'altro; la gestione quotidiana
 * degli account di una sede (creare, modificare) la fanno gli amministratori della sede stessa.
 */

const ROLE_LABEL: Record<string, string> = { standard: 'Utente', manager: 'Responsabile', admin: 'Admin', 'super-admin': 'Super Admin' };
const errText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Operazione non riuscita.');

const PersonnelManagement: React.FC = () => {
    const [people, setPeople] = useState<PlatformStaff[] | null>(null);
    const [sedi, setSedi] = useState<TenantSummary[]>([]);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [filterSede, setFilterSede] = useState('all');
    const [onlyDuplicates, setOnlyDuplicates] = useState(false);
    const [moving, setMoving] = useState<{ id: string; from: string; to: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [s, t] = await Promise.all([TenantApi.staff(), TenantApi.list()]);
            setPeople(s.staff);
            setSedi(t.tenants);
        } catch (e) {
            setError(errText(e));
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (people ?? []).filter(p =>
            !p.isCashbox &&
            (filterSede === 'all' || p.tenant === filterSede) &&
            (!onlyDuplicates || p.duplicate) &&
            (!q || p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)));
    }, [people, search, filterSede, onlyDuplicates]);

    const duplicatesCount = useMemo(() => (people ?? []).filter(p => p.duplicate && !p.isCashbox).length, [people]);

    const confirmMove = async () => {
        if (!moving) return;
        setBusy(true); setError(''); setNotice('');
        try {
            await TenantApi.moveStaff(moving);
            const p = people?.find(x => x.id === moving.id);
            const dest = sedi.find(s => s.id === moving.to)?.name ?? moving.to;
            setNotice(`${p?.name ?? 'Persona'} spostato in ${dest}. Lo storico (ordini, presenze…) resta nella sede di origine.`);
            setMoving(null);
            await load();
        } catch (e) {
            setError(errText(e));
        } finally {
            setBusy(false);
        }
    };

    const field = 'bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm';

    if (people === null && !error) return <p className="text-center text-slate-400 py-10">Caricamento personale…</p>;

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div>
                <h2 className="text-lg font-black text-slate-800 uppercase">Personale</h2>
                <p className="text-xs text-slate-500">Tutte le persone di tutti i distaccamenti. Qui le sposti da una sede all'altra; creare e modificare gli account di una sede spetta ai suoi amministratori.</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
            {notice && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{notice}</div>}
            {duplicatesCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                    <span>⚠️ {duplicatesCount} persone hanno un nominativo che compare più volte (nella stessa sede o in sedi diverse).</span>
                    <button onClick={() => setOnlyDuplicates(v => !v)} className="font-bold underline">{onlyDuplicates ? 'Mostra tutti' : 'Mostra solo i duplicati'}</button>
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                <input className={`${field} flex-grow`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o nome utente" />
                <select className={field} value={filterSede} onChange={e => setFilterSede(e.target.value)}>
                    <option value="all">Tutti i distaccamenti</option>
                    {sedi.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {sedi.map(sede => {
                const list = visible.filter(p => p.tenant === sede.id).sort((a, b) => a.name.localeCompare(b.name));
                if (list.length === 0) return null;
                return (
                    <div key={sede.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <h3 className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm font-black text-slate-700 uppercase">{sede.name} <span className="text-slate-400 font-bold">({list.length})</span></h3>
                        <ul>
                            {list.map(p => {
                                const isMoving = moving?.id === p.id && moving.from === p.tenant;
                                const movable = p.role !== 'super-admin';
                                return (
                                    <li key={`${p.tenant}:${p.id}`} className="px-4 py-3 border-b last:border-0 border-slate-100">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="font-bold text-slate-800">{p.name} {p.duplicate && <span title="Nominativo presente più volte" className="text-yellow-600">⚠️</span>}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {ROLE_LABEL[p.role] ?? p.role}{p.shift ? ` · Turno ${p.shift.toUpperCase()}` : ''}{p.username ? ` · ${p.username}` : ''}
                                                </p>
                                            </div>
                                            {movable ? (
                                                !isMoving ? (
                                                    <button onClick={() => { setNotice(''); setError(''); setMoving({ id: p.id, from: p.tenant, to: sedi.find(s => s.id !== p.tenant)?.id ?? '' }); }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Sposta…</button>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <select className={field} value={moving.to} onChange={e => setMoving({ ...moving, to: e.target.value })}>
                                                            {sedi.filter(s => s.id !== p.tenant).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                        </select>
                                                        <button onClick={confirmMove} disabled={busy || !moving.to} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white disabled:opacity-50">{busy ? 'Sposto…' : 'Conferma spostamento'}</button>
                                                        <button onClick={() => setMoving(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">Annulla</button>
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Super Admin: non si sposta</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
            {people && visible.length === 0 && <p className="text-center text-slate-400 italic py-6">Nessuna persona trovata.</p>}
        </div>
    );
};

export default PersonnelManagement;
