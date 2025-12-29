
import React, { useState, useMemo } from 'react';
import { StaffMember, Shift } from '../types';
import { useBar } from '../contexts/BarContext';
import { GradeBadge } from './StaffManagement';
import { LockIcon, LockOpenIcon, UserPlusIcon } from './Icons';

interface LoginScreenProps {
    staff: StaffMember[];
    onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ staff, onLoginSuccess }) => {
    const { loginBarUser } = useBar();
    const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeShiftFilter, setActiveShiftFilter] = useState<Shift | 'all'>('all');

    // Filter staff excluding 'Cassa' and apply shift filter
    const visibleStaff = useMemo(() => {
        return staff.filter(s => {
            if (s.name.toLowerCase().includes('cassa')) return false;
            if (activeShiftFilter !== 'all' && s.shift !== activeShiftFilter) return false;
            return true;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [staff, activeShiftFilter]);

    const handleSelectUser = (user: StaffMember) => {
        setSelectedUser(user);
        setError('');
        setPassword('');
        // If user has no password, login immediately? No, let's keep consistent flow but show "No Password" state
        if (!user.password) {
            handleLogin(user, '');
        }
    };

    const handleLogin = async (user: StaffMember, pwd: string) => {
        const success = await loginBarUser(user.id, pwd);
        if (success) {
            onLoginSuccess();
        } else {
            setError('Password non valida');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUser) {
            handleLogin(selectedUser, password);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
                <span className="absolute top-10 left-10 text-9xl">🚒</span>
                <span className="absolute bottom-10 right-10 text-9xl">👨‍🚒</span>
            </div>

            {/* LOGIN CARD */}
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full z-10 overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px]">
                
                {/* LEFT: User Selection */}
                <div className={`flex-grow flex flex-col p-6 transition-all duration-500 ${selectedUser ? 'hidden md:flex w-1/3 border-r border-slate-100' : 'w-full'}`}>
                    <div className="mb-4">
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">Chi sei?</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Seleziona il tuo profilo</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {(['all', 'a', 'b', 'c', 'd'] as const).map(s => (
                            <button 
                                key={s}
                                onClick={() => setActiveShiftFilter(s)}
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap
                                    ${activeShiftFilter === s ? 'bg-slate-800 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                                `}
                            >
                                {s === 'all' ? 'Tutti' : `Turno ${s.toUpperCase()}`}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
                        {visibleStaff.map(member => (
                            <button 
                                key={member.id}
                                onClick={() => handleSelectUser(member)}
                                className={`
                                    relative flex flex-col items-center p-3 rounded-2xl transition-all border-2 group
                                    ${selectedUser?.id === member.id 
                                        ? 'bg-orange-50 border-orange-500 shadow-md transform scale-105' 
                                        : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-lg'
                                    }
                                `}
                            >
                                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-3xl mb-2 relative">
                                    {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{member.icon || '👤'}</span>
                                    )}
                                </div>
                                {member.grade && <div className="absolute top-2 right-2 scale-75"><GradeBadge grade={member.grade} /></div>}
                                <span className="text-xs font-bold text-slate-700 text-center leading-tight">{member.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono mt-1 uppercase">{member.shift}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Password Input (Overlay on mobile, Side on desktop) */}
                {selectedUser && (
                    <div className="absolute inset-0 md:static md:w-2/3 bg-slate-50/95 md:bg-orange-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm md:backdrop-blur-none animate-fade-in">
                        <button 
                            onClick={() => setSelectedUser(null)}
                            className="absolute top-6 left-6 md:hidden text-slate-400 hover:text-slate-600 font-bold text-sm"
                        >
                            ← Indietro
                        </button>

                        <div className="w-24 h-24 rounded-full bg-white border-4 border-orange-200 shadow-xl overflow-hidden flex items-center justify-center text-5xl mb-6">
                            {selectedUser.photoUrl ? (
                                <img src={selectedUser.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span>{selectedUser.icon || '👤'}</span>
                            )}
                        </div>

                        <h3 className="text-3xl font-black text-slate-800 mb-1">{selectedUser.name}</h3>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-8">
                            {selectedUser.grade} • Turno {selectedUser.shift.toUpperCase()}
                        </p>

                        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
                            {selectedUser.password ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LockIcon className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Inserisci Password"
                                            className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none text-lg font-bold text-center tracking-widest bg-white shadow-sm transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 transition-transform active:scale-95 text-lg uppercase tracking-wide"
                                    >
                                        Accedi
                                    </button>
                                </>
                            ) : (
                                <div className="text-center">
                                    <p className="text-slate-400 italic mb-4">Nessuna password impostata.</p>
                                    <button 
                                        type="button"
                                        onClick={() => handleLogin(selectedUser, '')}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 transition-transform active:scale-95 text-lg uppercase tracking-wide flex items-center justify-center gap-2"
                                    >
                                        <LockOpenIcon className="h-5 w-5" /> Entra Libero
                                    </button>
                                </div>
                            )}
                            
                            {error && (
                                <div className="text-red-500 font-bold text-center bg-red-100 p-3 rounded-lg text-sm animate-pulse">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </div>
            
            <div className="absolute bottom-4 text-center text-slate-400 text-xs font-medium">
                Gestionale Bar VVF • Montepulciano
            </div>
        </div>
    );
};

export default LoginScreen;
