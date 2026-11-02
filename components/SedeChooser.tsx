import React, { useEffect, useState } from 'react';
import { useBar } from '../contexts/BarContext';
import { AuthApi, TenantApi, TenantSummary } from '../lib/db';
import { sedeShortName } from '../utils/tenant';
import TenantManagement from './TenantManagement';
import PersonnelManagement from './PersonnelManagement';

/**
 * Prima pagina del Super Admin della sede principale: si sceglie su quale distaccamento lavorare.
 * Gli strumenti (bar, mezzi, lavanderia…) compaiono solo dopo la scelta, dentro la sede.
 */
const SedeChooser: React.FC = () => {
    const { activeBarUser, logoutBarUser } = useBar();
    const [sedi, setSedi] = useState<TenantSummary[] | null>(null);
    const [error, setError] = useState('');
    const [managing, setManaging] = useState(false);
    const [personnel, setPersonnel] = useState(false);

    const load = () => {
        setError('');
        TenantApi.list()
            .then(r => setSedi([...r.tenants].sort((x, y) => Number(y.isDefault) - Number(x.isDefault) || x.name.localeCompare(y.name))))
            .catch(e => setError(e instanceof Error ? e.message : 'Impossibile caricare i distaccamenti.'));
    };
    useEffect(load, [managing, personnel]);

    return (
        <div className="min-h-dvh bg-slate-100 flex flex-col items-center p-4 pt-8 pb-16">
            <div className="w-full max-w-3xl">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeBarUser?.name}</span>
                    <button onClick={logoutBarUser} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg px-3 py-2">Esci</button>
                </div>

                <div className="text-center mb-8">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="h-20 w-auto mx-auto mb-3 drop-shadow-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase">Gestionale VVF</h1>
                    <p className="text-primary font-extrabold text-lg md:text-2xl">Scegli il distaccamento</p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

                {managing || personnel ? (
                    <div>
                        <button onClick={() => { setManaging(false); setPersonnel(false); }} className="mb-4 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">← Torna alla scelta</button>
                        {managing ? <TenantManagement /> : <PersonnelManagement />}
                    </div>
                ) : (
                    <>
                        {sedi === null && !error && <p className="text-center text-slate-400">Caricamento distaccamenti…</p>}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {(sedi ?? []).map(t => {
                                const activeModules = Object.values(t.config.modules).filter(Boolean).length;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => AuthApi.switchSede(t.id)}
                                        className="w-full bg-white hover:bg-slate-50 text-slate-800 rounded-2xl border-2 border-slate-100 shadow-[0_0_15px_rgba(71,85,105,0.25)] hover:shadow-[0_0_25px_rgba(71,85,105,0.45)] p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-36 flex items-center justify-center"
                                    >
                                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 pointer-events-none">🧑‍🚒</div>
                                        <div className="relative z-10 flex flex-col items-center gap-1">
                                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">🧑‍🚒</span>
                                            <span className="font-black text-sm md:text-lg uppercase tracking-wider leading-tight text-center">{sedeShortName({ id: t.id, name: t.name, config: t.config, platform: t.isDefault })}</span>
                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">
                                                {t.staffCount} {t.staffCount === 1 ? 'persona' : 'persone'} · {activeModules} strumenti
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-8 flex gap-3 justify-center flex-wrap">
                            <button onClick={() => setPersonnel(true)} className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl px-5 py-3 shadow">
                                👥 Gestisci personale
                            </button>
                            <button onClick={() => setManaging(true)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl px-5 py-3 shadow">
                                ⚙️ Gestisci distaccamenti
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SedeChooser;
