
import React, { useState } from 'react';
import { StaffMember } from '../types';
import { useBar } from '../contexts/BarContext';
import { LockIcon, LockOpenIcon, UserPlusIcon, UsersIcon } from './Icons';

interface LoginScreenProps {
    staff: StaffMember[];
    onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ staff, onLoginSuccess }) => {
    const { loginBarUser } = useBar();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!username.trim()) {
            setError('Inserisci il nome utente.');
            return;
        }

        setIsLoggingIn(true);
        // Simuliamo un minimo di delay per feedback utente
        setTimeout(async () => {
            const success = await loginBarUser(username, password);
            if (success) {
                onLoginSuccess();
            } else {
                setError('Credenziali non valide. Riprova.');
                setIsLoggingIn(false);
            }
        }, 300);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
                <span className="absolute top-10 left-10 text-9xl">🚒</span>
                <span className="absolute bottom-10 right-10 text-9xl">👨‍🚒</span>
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[400px] opacity-10">🔥</span>
            </div>

            {/* LOGIN CARD */}
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full z-10 overflow-hidden border border-slate-200 relative animate-fade-in-up">
                <div className="bg-orange-600 h-32 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg transform translate-y-8 border-4 border-white">
                        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-4xl absolute" style={{ opacity: 0 }}>🚒</span> 
                    </div>
                </div>

                <div className="pt-12 pb-8 px-8 text-center">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">VVF</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Montepulciano</p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UsersIcon className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Nome Utente (es. Mario)"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 transition-transform active:scale-95 text-sm uppercase tracking-wide mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? 'Accesso in corso...' : 'Accedi'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 animate-pulse">
                            <span className="text-xl">⚠️</span>
                            <p className="text-xs font-bold text-red-600 text-left leading-tight">{error}</p>
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Password dimenticata? Chiedi al Capo Turno.
                    </p>
                </div>
            </div>
            
            <div className="absolute bottom-4 text-center text-slate-400 text-[10px] font-bold opacity-50">
                Gestionale V4.3 • Accesso Riservato
            </div>
        </div>
    );
};

export default LoginScreen;
