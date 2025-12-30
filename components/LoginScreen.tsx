
import React, { useState } from 'react';
import { StaffMember } from '../types';
import { useBar } from '../contexts/BarContext';
import { LockIcon } from './Icons';

interface LoginScreenProps {
    staff: StaffMember[];
    onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ staff, onLoginSuccess }) => {
    const { loginBarUser, updateStaff, addStaff } = useBar();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // --- MECCANISMO DI RIPRISTINO PASSWORD SUPER ADMIN ---
        // Se l'utente inserisce "RESET" come nome e "123456" come password:
        // 1. Se esiste un Super Admin, resetta la password.
        // 2. Se NON esiste, crea un nuovo utente Super Admin (admin/123456).
        if (username.toUpperCase() === 'RESET' && password === '123456') {
            setIsLoggingIn(true);
            try {
                const superAdmin = staff.find(s => s.role === 'super-admin');
                
                if (superAdmin) {
                    await updateStaff({ ...superAdmin, password: '123456' });
                    setError(`✅ Password di ${superAdmin.name} ripristinata a 123456. Ora puoi accedere.`);
                    setUsername(superAdmin.username || superAdmin.name); 
                    setPassword('123456');
                } else {
                    await addStaff({
                        name: "Super Admin",
                        username: "admin",
                        password: "123456",
                        role: "super-admin",
                        shift: "a",
                        grade: "CS",
                        icon: "🛡️"
                    });
                    setError(`✅ Utente 'Super Admin' mancante: ne è stato creato uno nuovo. Usa: admin / 123456`);
                    setUsername('admin');
                    setPassword('123456');
                }
            } catch (err) {
                console.error(err);
                setError("Errore durante il ripristino/creazione.");
            }
            setIsLoggingIn(false);
            return;
        }
        // -----------------------------------------------------

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
            
            {/* LOGIN CARD */}
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full z-10 overflow-visible border border-slate-200 relative animate-fade-in-up mt-10">
                
                {/* Logo Area - Clean & Larger */}
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-slate-50 p-2">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                </div>

                <div className="pt-20 pb-8 px-8 text-center mt-4">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-1">Vigili del Fuoco</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Distaccamento Montepulciano</p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-xl filter drop-shadow-sm">🚨</span>
                            </div>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Nome Utente (es. Mario)"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon className="h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none text-sm font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black py-4 rounded-xl shadow-lg shadow-red-200 transition-transform active:scale-95 text-sm uppercase tracking-wide mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? 'Elaborazione...' : 'Accedi'}
                        </button>
                    </form>

                    {error && (
                        <div className={`mt-4 p-3 border rounded-lg flex items-center gap-2 animate-pulse ${error.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            <span className="text-xl">{error.includes('✅') ? 'check' : '⚠️'}</span>
                            <p className="text-xs font-bold text-left leading-tight">{error}</p>
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100 rounded-b-3xl">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Password dimenticata? Contatta un Admin.
                    </p>
                </div>
            </div>
            
            <div className="absolute bottom-6 text-center text-slate-400 text-[10px] font-bold opacity-60">
                Gestionale V4.3 • Accesso Riservato
            </div>
        </div>
    );
};

export default LoginScreen;
