import React, { useCallback, useEffect, useState } from 'react';
import { TenantApi, TenantSummary, TenantConfig, ModuleDef, ModuleId, ApiError } from '../lib/db';

/**
 * Gestione delle sedi (distaccamenti) — solo Super Admin della sede principale.
 * Ogni sede ha i propri dati, il proprio Super Admin e i propri moduli attivi.
 */

const MODULE_ORDER: ModuleId[] = ['bar', 'games', 'calendar', 'vehicle_booking', 'operational_vehicles', 'laundry', 'interventions'];

interface FormState {
    id: string;
    name: string;
    modules: Record<ModuleId, boolean>;
    municipalities: string;
    weatherLabel: string;
    weatherLat: string;
    weatherLon: string;
    laundryEmail: string;
    adminUser: string;
    adminPassword: string;
}

const allOn = (): Record<ModuleId, boolean> =>
    MODULE_ORDER.reduce((a, m) => ({ ...a, [m]: true }), {} as Record<ModuleId, boolean>);

const emptyForm = (): FormState => ({
    id: '', name: '', modules: allOn(), municipalities: '', weatherLabel: '', weatherLat: '', weatherLon: '',
    laundryEmail: '', adminUser: '', adminPassword: '',
});

const fromTenant = (t: TenantSummary): FormState => ({
    id: t.id,
    name: t.name,
    modules: { ...allOn(), ...t.config.modules },
    municipalities: t.config.municipalities.join('\n'),
    weatherLabel: t.config.weather?.label ?? '',
    weatherLat: t.config.weather ? String(t.config.weather.lat) : '',
    weatherLon: t.config.weather ? String(t.config.weather.lon) : '',
    laundryEmail: t.config.laundryEmail ?? '',
    adminUser: '',
    adminPassword: '',
});

const toConfig = (f: FormState): Partial<TenantConfig> => {
    const hasWeather = f.weatherLat.trim() !== '' || f.weatherLon.trim() !== '';
    return {
        modules: f.modules,
        displayName: f.name.trim(),
        municipalities: f.municipalities.split(/[\n,;]+/).map(m => m.trim()).filter(Boolean),
        weather: hasWeather
            ? { label: f.weatherLabel.trim(), lat: Number(f.weatherLat.replace(',', '.')), lon: Number(f.weatherLon.replace(',', '.')) }
            : null,
        laundryEmail: f.laundryEmail.trim(),
    };
};

const errText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Operazione non riuscita.');

const sedeLink = (t: TenantSummary) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return t.isDefault ? base : `${base}?sede=${encodeURIComponent(t.id)}`;
};

const TenantManagement: React.FC = () => {
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [defs, setDefs] = useState<Record<string, ModuleDef>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [form, setForm] = useState<FormState | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [adminFor, setAdminFor] = useState<string | null>(null);
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            const r = await TenantApi.list();
            setTenants(r.tenants);
            setDefs(r.modules as Record<string, ModuleDef>);
        } catch (e) {
            setError(errText(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const label = (m: ModuleId) => defs[m]?.label ?? m;

    const toggleModule = (m: ModuleId, on: boolean) => {
        if (!form) return;
        const modules = { ...form.modules, [m]: on };
        // Dipendenze: accendere un modulo accende ciò che richiede; spegnerlo spegne chi lo richiede.
        for (const id of MODULE_ORDER) {
            for (const need of defs[id]?.requires ?? []) {
                if (on && id === m && !modules[need]) modules[need] = true;
                if (!on && need === m && modules[id]) modules[id] = false;
            }
        }
        setForm({ ...form, modules });
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        setSaving(true); setError(''); setNotice('');
        try {
            const config = toConfig(form);
            if (creating) {
                await TenantApi.create({ id: form.id.trim().toLowerCase(), name: form.name.trim(), config, adminUser: form.adminUser.trim(), adminPassword: form.adminPassword });
                setNotice(`Sede "${form.name.trim()}" creata. Comunica al suo Super Admin il link di accesso.`);
            } else {
                await TenantApi.update({ id: form.id, name: form.name.trim(), config });
                setNotice(`Sede "${form.name.trim()}" aggiornata.`);
            }
            setForm(null);
            await load();
        } catch (err) {
            setError(errText(err));
        } finally {
            setSaving(false);
        }
    };

    const resetAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminFor) return;
        setSaving(true); setError(''); setNotice('');
        try {
            const r = await TenantApi.setAdmin({ id: adminFor, username: adminUser.trim(), password: adminPass });
            setNotice(r.created ? 'Nuovo Super Admin creato per la sede.' : 'Utente promosso a Super Admin e password aggiornata. Le sue sessioni sono state chiuse.');
            setAdminFor(null); setAdminUser(''); setAdminPass('');
            await load();
        } catch (err) {
            setError(errText(err));
        } finally {
            setSaving(false);
        }
    };

    const copy = async (text: string) => {
        try { await navigator.clipboard.writeText(text); setNotice('Link copiato.'); } catch { setNotice(text); }
    };

    const input = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400';
    const lbl = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1';

    if (loading) return <p className="text-center text-slate-400 py-10">Caricamento sedi…</p>;

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase">Sedi</h2>
                    <p className="text-xs text-slate-500">Ogni sede ha dati, personale e Super Admin propri. Qui scegli quali strumenti ha attivi.</p>
                </div>
                <button onClick={() => { setCreating(true); setForm(emptyForm()); setNotice(''); setError(''); setAdminFor(null); }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow">
                    + Nuova sede
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
            {notice && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{notice}</div>}

            {form && (
                <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                    <h3 className="font-black text-slate-800 uppercase text-sm">{creating ? 'Nuova sede' : `Modifica: ${form.name}`}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Nome della sede</label>
                            <input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Distaccamento VVF Chiusi" maxLength={120} required />
                        </div>
                        <div>
                            <label className={lbl}>Codice (nel link)</label>
                            <input className={`${input} ${creating ? '' : 'bg-slate-100 text-slate-500'}`} value={form.id}
                                onChange={e => setForm({ ...form, id: e.target.value.toLowerCase() })}
                                placeholder="chiusi" pattern="[a-z0-9][a-z0-9\-]{0,30}" maxLength={31} disabled={!creating} required />
                            {creating && <p className="text-[10px] text-slate-400 mt-1">Minuscole, numeri e trattino. Non si può cambiare dopo.</p>}
                        </div>
                    </div>

                    <div>
                        <span className={lbl}>Strumenti attivi</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {MODULE_ORDER.map(m => (
                                <label key={m} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${form.modules[m] ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <input type="checkbox" checked={!!form.modules[m]} onChange={e => toggleModule(m, e.target.checked)} />
                                    <span>{label(m)}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Presenze, personale, promemoria e impostazioni sono sempre attivi. Uno strumento spento si nasconde, i suoi dati restano e tornano se lo riattivi.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className={lbl}>Comuni di intervento (uno per riga)</label>
                            <textarea className={input} rows={4} value={form.municipalities}
                                onChange={e => setForm({ ...form, municipalities: e.target.value })}
                                placeholder={'CHIUSI\nCETONA\nSARTEANO'} />
                        </div>
                        <div>
                            <label className={lbl}>Meteo: località</label>
                            <input className={input} value={form.weatherLabel} onChange={e => setForm({ ...form, weatherLabel: e.target.value })} placeholder="Chiusi" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={lbl}>Latitudine</label>
                                <input className={input} inputMode="decimal" value={form.weatherLat} onChange={e => setForm({ ...form, weatherLat: e.target.value })} placeholder="43.0167" />
                            </div>
                            <div>
                                <label className={lbl}>Longitudine</label>
                                <input className={input} inputMode="decimal" value={form.weatherLon} onChange={e => setForm({ ...form, weatherLon: e.target.value })} placeholder="11.9487" />
                            </div>
                        </div>
                        <p className="sm:col-span-2 text-[10px] text-slate-400 -mt-2">Lascia vuote le coordinate per non mostrare il meteo.</p>
                        {form.modules.laundry && (
                            <div className="sm:col-span-2">
                                <label className={lbl}>Email per il riepilogo lavanderia</label>
                                <input className={input} type="email" value={form.laundryEmail} onChange={e => setForm({ ...form, laundryEmail: e.target.value })} placeholder="lavanderia@esempio.it" />
                            </div>
                        )}
                    </div>

                    {creating && (
                        <div className="border-t border-slate-100 pt-3">
                            <span className={lbl}>Super Admin della sede</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input className={input} value={form.adminUser} onChange={e => setForm({ ...form, adminUser: e.target.value })} placeholder="Nome utente" autoComplete="off" required />
                                <input className={input} type="password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} placeholder="Password (almeno 8 caratteri)" autoComplete="new-password" minLength={8} required />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Annulla</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                            {saving ? 'Salvataggio…' : creating ? 'Crea sede' : 'Salva'}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {tenants.map(t => (
                    <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                                <h3 className="font-black text-slate-800">{t.name} {t.isDefault && <span className="ml-1 text-[10px] bg-slate-800 text-white rounded-full px-2 py-0.5 align-middle uppercase">Sede principale</span>}</h3>
                                <p className="text-xs text-slate-500">Codice: <span className="font-mono">{t.id}</span> · {t.staffCount} {t.staffCount === 1 ? 'persona' : 'persone'}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => { setCreating(false); setForm(fromTenant(t)); setNotice(''); setError(''); setAdminFor(null); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Modifica</button>
                                <button onClick={() => { setAdminFor(adminFor === t.id ? null : t.id); setAdminUser(''); setAdminPass(''); setNotice(''); setError(''); setForm(null); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Super Admin</button>
                                <button onClick={() => void copy(sedeLink(t))} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Copia link</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                            {MODULE_ORDER.map(m => (
                                <span key={m} className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${t.config.modules[m] ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 line-through'}`}>{label(m)}</span>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 break-all">{sedeLink(t)}</p>

                        {adminFor === t.id && (
                            <form onSubmit={resetAdmin} className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                                <p className="text-xs text-slate-500">Indica un utente della sede (esistente: viene reso Super Admin; nuovo: viene creato) e la sua nuova password. Le sue sessioni aperte vengono chiuse.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input className={input} value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Nome utente" autoComplete="off" required />
                                    <input className={input} type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Nuova password (almeno 8 caratteri)" autoComplete="new-password" minLength={8} required />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setAdminFor(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">Annulla</button>
                                    <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white disabled:opacity-50">Imposta</button>
                                </div>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TenantManagement;
