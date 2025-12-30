
import React, { useMemo, useEffect, useState } from 'react';
import { Till, TillColors, SeasonalityConfig, ShiftSettings, TombolaConfig, Reminder, OperationalVehicle, VehicleCheck, Vehicle, StaffMember } from '../types';
import { BellIcon, TruckIcon, ShirtIcon, FireIcon, PinIcon, CheckIcon, BackArrowIcon, EditIcon, SaveIcon, LockIcon, UserCircleIcon, LogOutIcon } from './Icons';
import { useBar } from '../contexts/BarContext';
import { GradeBadge } from './StaffManagement';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectGames: () => void;
    onSelectCalendar: () => void;
    onSelectAttendance: () => void;
    onSelectFleet: () => void;
    onSelectLaundry: () => void;
    onSelectInterventions: () => void; 
    onSelectOperationalVehicles: () => void;
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
    shiftSettings?: ShiftSettings;
    tombolaConfig?: TombolaConfig;
    isSuperAdmin?: boolean | null;
    notificationPermission?: NotificationPermission;
    onRequestNotification?: () => void;
    reminders?: Reminder[];
    onToggleReminder?: (id: string, date: string, completedDates: string[]) => Promise<void>;
    operationalVehicles?: OperationalVehicle[];
    vehicles?: Vehicle[]; // Fleet vehicles added
    vehicleChecks?: VehicleCheck[];
}

interface WeatherData {
    temperature: number;
    weathercode: number;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, onSelectGames, onSelectCalendar, onSelectAttendance, onSelectFleet, onSelectLaundry, onSelectInterventions, onSelectOperationalVehicles, tillColors, seasonalityConfig, shiftSettings, tombolaConfig, isSuperAdmin, notificationPermission, onRequestNotification, reminders = [], onToggleReminder, operationalVehicles = [], vehicles = [], vehicleChecks = [] }) => {
    
    // Context for Reliable Time & Auth
    const { getNow, activeBarUser, logoutBarUser, staff, updateStaff, availableRoles } = useBar();

    // WEATHER & DATE STATE
    const [currentDateString, setCurrentDateString] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    
    // TIMER STATES
    const [graceTimeLeft, setGraceTimeLeft] = useState<number>(0);
    const [activeShiftTimeLeft, setActiveShiftTimeLeft] = useState<number>(0);

    // POST-IT STATE
    const [hidePostIt, setHidePostIt] = useState(false);

    // PROFILE MODAL STATE
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileForm, setProfileForm] = useState<{username: string, password: string, rcSubGroup: number}>({ username: '', password: '', rcSubGroup: 1 });

    // CALCOLA ACCESSO ADMIN (Manager o Superiore)
    const canAccessAdmin = useMemo(() => {
        if (!activeBarUser) return false;
        // Se è super admin virtuale o ha ruolo esplicito
        if (activeBarUser.role === 'super-admin') return true;
        
        // Cerca il livello del ruolo
        const roleDef = availableRoles.find(r => r.id === activeBarUser.role);
        // Livello 1 = Standard, Livello 2 = Manager, Livello 3 = Admin, Livello 4 = Super
        return roleDef ? roleDef.level >= 2 : false;
    }, [activeBarUser, availableRoles]);

    // Inizializza form profilo SOLO all'apertura del modale (FIX: Previene reset durante la digitazione)
    useEffect(() => {
        if (isProfileOpen && activeBarUser) {
            setProfileForm({
                username: activeBarUser.username || activeBarUser.name, // Default al nome se username mancante
                password: activeBarUser.password || '',
                rcSubGroup: activeBarUser.rcSubGroup || 1
            });
        }
    }, [isProfileOpen]); // Rimuovere activeBarUser dalle dipendenze per evitare re-render loop

    // Calcolo Utenti Online (Escluso me stesso)
    const otherOnlineUsers = useMemo(() => {
        if (!activeBarUser) return [];
        const now = getNow().getTime();
        const timeoutWindow = 10 * 60 * 1000; // 10 minuti di tolleranza
        
        return staff.filter(s => {
            // Escludi me stesso
            if (s.id === activeBarUser.id) return false; 
            // Deve avere un lastSeen
            if (!s.lastSeen) return false;
            
            // Check timeout
            const lastSeenTime = new Date(s.lastSeen).getTime();
            return (now - lastSeenTime) < timeoutWindow;
        });
    }, [staff, activeBarUser, getNow]); // getNow cambia ogni 30s (via BarContext o prop drilling se necessario, qui useremo il trigger del timer interno)

    // Force re-calc of online users every 30s using local state trigger if needed, 
    // but dependency on getNow (from context) or staff updates should be enough.
    
    const handleSaveProfile = async () => {
        if (!activeBarUser) return;
        try {
            await updateStaff({
                ...activeBarUser,
                username: profileForm.username.trim(),
                password: profileForm.password.trim(),
                rcSubGroup: profileForm.rcSubGroup
            });
            setIsProfileOpen(false); // Close modal first
            setTimeout(() => alert("Profilo aggiornato con successo!"), 100); // Alert slightly after
        } catch (e) {
            console.error(e);
            alert("Errore aggiornamento profilo.");
        }
    };

    // Cleanup old keys on mount to prevent Storage Full
    useEffect(() => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            if (localStorage) {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('postit_hidden_') && !key.includes(todayStr)) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch (e) {
            // Silently fail if storage is restricted or quota exceeded
            console.warn("Storage cleanup warning:", e);
        }
    }, []);

    // Sync Timer (Updates UI frequently for centiseconds)
    useEffect(() => {
        const updateTick = () => {
            const now = getNow();
            setCurrentTime(now);
            
            // Format Date (es. "Lunedì, 27 Ottobre 2025")
            const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            setCurrentDateString(now.toLocaleDateString('it-IT', options));

            // Grace Period Calculation
            const hour = now.getHours();
            
            const shiftStartTime = new Date(now);
            shiftStartTime.setMinutes(0);
            shiftStartTime.setSeconds(0);
            shiftStartTime.setMilliseconds(0);

            if (hour >= 8 && hour < 20) {
                shiftStartTime.setHours(8); // Turno Giorno iniziato alle 8
            } else if (hour >= 20) {
                shiftStartTime.setHours(20); // Turno Notte iniziato alle 20
            } else {
                shiftStartTime.setDate(shiftStartTime.getDate() - 1);
                shiftStartTime.setHours(20); // Turno Notte iniziato ieri alle 20
            }

            const elapsed = now.getTime() - shiftStartTime.getTime();
            const threeHoursMs = 3 * 60 * 60 * 1000;
            const remaining = threeHoursMs - elapsed;

            setGraceTimeLeft(remaining > 0 ? remaining : 0);

            // Active Shift Remaining Time Calculation
            let shiftEndTime = new Date(now);
            shiftEndTime.setMinutes(0);
            shiftEndTime.setSeconds(0);
            shiftEndTime.setMilliseconds(0);

            if (hour >= 8 && hour < 20) {
                shiftEndTime.setHours(20);
            } else if (hour >= 20) {
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                shiftEndTime.setHours(8);
            } else {
                shiftEndTime.setHours(8);
            }

            const remainingActive = shiftEndTime.getTime() - now.getTime();
            setActiveShiftTimeLeft(remainingActive > 0 ? remainingActive : 0);
        };

        updateTick(); // Initial call
        const timer = setInterval(updateTick, 41); 
        return () => clearInterval(timer);
    }, [getNow]);

    // Fetch Weather for Montepulciano (SI)
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                if (typeof navigator !== 'undefined' && !navigator.onLine) return;
                const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.1017&longitude=11.7868&current_weather=true');
                if (!response.ok) return;
                const data = await response.json();
                if (data.current_weather) {
                    setWeather(data.current_weather);
                }
            } catch (error) {}
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatCountdown = (ms: number) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((ms % (1000 * 60)) / 1000);
        const cs = Math.floor((ms % 1000) / 10); // Centesimi
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    const getWeatherEmoji = (code: number) => {
        if (code === 0) return '☀️';
        if (code >= 1 && code <= 3) return '⛅';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌦️';
        if (code >= 95) return '⛈️';
        return '☀️';
    };

    const animatedEmojis = useMemo(() => {
        if (!seasonalityConfig || seasonalityConfig.animationType === 'none' || !seasonalityConfig.emojis || seasonalityConfig.emojis.length === 0) {
            return [];
        }
        const count = 50;
        const emojiList = seasonalityConfig.emojis;
        return Array.from({ length: count }).map((_, i) => {
            const animType = seasonalityConfig.animationType;
            let animationName = 'fall';
            if (animType === 'rain') animationName = 'rainfall';
            if (animType === 'float') animationName = 'float';
            return {
                id: i,
                char: emojiList[Math.floor(Math.random() * emojiList.length)],
                left: `${Math.random() * 100}%`,
                top: animType === 'float' ? `${Math.random() * 100}%` : '-10%',
                animation: `${animationName} ${Math.random() * 20 + 10}s linear infinite`,
                delay: `-${Math.random() * 20}s`,
                size: `${Math.random() * 0.8 + 0.4}rem`,
                opacity: seasonalityConfig.opacity || 0.5
            };
        });
    }, [seasonalityConfig]);

    const activeShift = useMemo(() => {
        const hour = currentTime.getHours();
        const calculationDate = new Date(currentTime);
        if (hour < 8) {
            calculationDate.setDate(calculationDate.getDate() - 1);
        }
        calculationDate.setHours(12, 0, 0, 0);

        const anchorDate = new Date(2025, 11, 20, 12, 0, 0); 
        const anchorShift = 'b';

        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = shifts.indexOf(anchorShift.toLowerCase());
        
        let shiftIndex = (anchorIndex + diffDays) % 4;
        if (shiftIndex < 0) shiftIndex += 4;
        
        if (hour >= 20 || hour < 8) {
            shiftIndex = (shiftIndex - 1 + 4) % 4;
        }

        return shifts[shiftIndex];
    }, [currentTime]);

    const previousShiftCode = useMemo(() => {
        const shifts = ['a', 'b', 'c', 'd'];
        const currentIndex = shifts.indexOf(activeShift);
        const hour = currentTime.getHours();
        const isNight = hour >= 20 || hour < 8;

        const prevIndex = isNight 
            ? (currentIndex + 1) % 4 
            : (currentIndex - 2 + 4) % 4;

        return shifts[prevIndex];
    }, [activeShift, currentTime]);

    const previousShiftTill = useMemo(() => {
        return tills.find(t => t.shift === previousShiftCode);
    }, [tills, previousShiftCode]);

    const activeTill = useMemo(() => tills.find(t => t.shift === activeShift), [tills, activeShift]);
    const inactiveTills = useMemo(() => tills.filter(t => t.shift !== activeShift), [tills, activeShift]);

    // --- REMINDER LOGIC (OPTIMIZED DEPENDENCIES) ---
    // Extract primitives for stable dependencies to avoid 41ms re-renders
    const todayStr = useMemo(() => currentTime.toISOString().split('T')[0], [currentTime]);
    const dayOfWeek = useMemo(() => currentTime.getDay(), [currentTime]);
    const dayOfMonth = useMemo(() => currentTime.getDate(), [currentTime]);
    const month = useMemo(() => currentTime.getMonth(), [currentTime]);
    const year = useMemo(() => currentTime.getFullYear(), [currentTime]);

    const standardReminders = useMemo(() => {
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        return reminders.filter(rem => {
            if (rem.type === 'spot') {
                return rem.date === todayStr;
            } else if (rem.type === 'monthly') {
                if (rem.monthlyDetail === 'first-day') return dayOfMonth === 1;
                if (rem.monthlyDetail === 'last-day') return dayOfMonth === lastDayOfMonth;
                return false;
            } else {
                return rem.dayOfWeek === dayOfWeek;
            }
        });
    }, [reminders, todayStr, dayOfWeek, dayOfMonth, month, year]);

    const vehicleCheckReminders = useMemo(() => {
        // Mostra i controlli veicoli SOLO dopo le 8 di mattina
        if (currentTime.getHours() < 8) return [];

        const daysMap = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const todayName = daysMap[dayOfWeek];

        const opVehiclesToCheck = operationalVehicles.filter(v => v.checkDay === todayName);
        const fleetVehiclesToCheck = vehicles.filter(v => v.checkDay === todayName);

        const opReminders = opVehiclesToCheck.map(v => {
            const isDone = vehicleChecks.some(check => 
                check.vehicleId === v.id && 
                new Date(check.timestamp).toISOString().split('T')[0] === todayStr
            );
            return {
                id: `op_${v.id}`, 
                text: `Controllo ${v.model} ${v.plate}`,
                isDone: isDone,
                type: 'vehicle_op'
            };
        });

        const fleetReminders = fleetVehiclesToCheck.map(v => {
            const isDone = vehicleChecks.some(check => 
                check.vehicleId === v.id && 
                new Date(check.timestamp).toISOString().split('T')[0] === todayStr
            );
            return {
                id: `fl_${v.id}`, 
                text: `Controllo ${v.model} ${v.plate}`,
                isDone: isDone,
                type: 'vehicle_fleet'
            };
        });

        return [...opReminders, ...fleetReminders];
    }, [operationalVehicles, vehicles, vehicleChecks, todayStr, dayOfWeek, currentTime]);

    const allReminders = useMemo(() => {
        const standardList = standardReminders.map(r => ({
            ...r,
            isDone: r.completedDates.includes(todayStr),
            source: 'manual' as const
        }));
        
        const vehicleList = vehicleCheckReminders.map(r => ({
            id: r.id,
            text: r.text,
            isDone: r.isDone,
            source: r.type,
            completedDates: [] 
        }));

        return [...standardList, ...vehicleList];
    }, [standardReminders, vehicleCheckReminders, todayStr]);

    const areAllRemindersCompleted = useMemo(() => {
        if (allReminders.length === 0) return false;
        return allReminders.every(rem => rem.isDone);
    }, [allReminders]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const storageKey = `postit_hidden_${todayStr}`;
        
        let isHiddenInStorage = false;
        try {
            isHiddenInStorage = localStorage.getItem(storageKey) === 'true';
        } catch (e) {
            // Silently fail, assume false
        }

        if (areAllRemindersCompleted) {
            if (isHiddenInStorage) {
                setHidePostIt(true);
            } else {
                // FIXED TIMER: Reduced to 2 seconds to feel like "disappears when done" for shift change
                timer = setTimeout(() => {
                    setHidePostIt(true);
                    try {
                        localStorage.setItem(storageKey, 'true');
                    } catch (e) { 
                        console.warn("Could not save post-it preference (Storage Full)", e); 
                    }
                }, 2000); 
            }
        } else {
            setHidePostIt(false);
            try {
                localStorage.removeItem(storageKey);
            } catch (e) { 
                // Ignore removal errors
            }
        }
        return () => clearTimeout(timer);
    }, [areAllRemindersCompleted, todayStr]);

    const handleReminderClick = async (rem: any) => {
        if (rem.source === 'vehicle_op') {
            if (!rem.isDone) onSelectOperationalVehicles();
        } else if (rem.source === 'vehicle_fleet') {
            if (!rem.isDone) onSelectFleet();
        } else {
            if (onToggleReminder) await onToggleReminder(rem.id, todayStr, rem.completedDates);
        }
    };

    const backgroundColor = seasonalityConfig?.backgroundColor || '#f8fafc';
    const tombolaNumberCount = tombolaConfig?.status === 'active' ? (tombolaConfig.extractedNumbers?.length || 0) : 0;

    return (
        <div className="flex flex-col min-h-dvh relative overflow-hidden font-sans transition-colors duration-500" style={{ backgroundColor }}>
            
            {/* TOP LEFT: MY AVATAR FIRST, THEN OTHERS */}
            <div className="absolute top-4 left-4 z-50 mt-[env(safe-area-inset-top)] flex items-center -space-x-2 hover:space-x-1 transition-all">
                {/* 1. MY AVATAR (GREEN GLOW, ON TOP/LEFT) */}
                {activeBarUser && (
                    <div className="relative group z-30 flex-shrink-0" onClick={() => setIsProfileOpen(true)}>
                        <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-white shadow-[0_0_15px_#4ade80] flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform relative">
                            {activeBarUser.photoUrl ? (
                                <img src={activeBarUser.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">{activeBarUser.icon || '👤'}</span>
                            )}
                            {/* Green Dot Indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        {activeBarUser.grade && (
                            <div className="absolute -top-1 -right-1 scale-75 z-40 pointer-events-none">
                                <GradeBadge grade={activeBarUser.grade} />
                            </div>
                        )}
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Tu
                        </div>
                    </div>
                )}

                {/* 2. OTHER ONLINE USERS (ORANGE GLOW) */}
                {otherOnlineUsers.slice(0, 4).map((user, idx) => (
                    <div 
                        key={user.id} 
                        className="relative z-20 w-10 h-10 rounded-full border-2 border-white shadow-[0_0_15px_#f97316] overflow-hidden bg-slate-100 flex items-center justify-center group"
                        title={`${user.name} Online`}
                    >
                        {user.photoUrl ? (
                            <img src={user.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-lg">{user.icon || '👤'}</span>
                        )}
                        {/* Orange Dot Indicator */}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-orange-500 border border-white rounded-full"></div>
                        
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            {user.name.split(' ')[0]}
                        </div>
                    </div>
                ))}
                
                {otherOnlineUsers.length > 4 && (
                    <div className="relative z-10 w-10 h-10 rounded-full border-2 border-white bg-slate-800 text-white font-bold flex items-center justify-center shadow-md text-xs">
                        +{otherOnlineUsers.length - 4}
                    </div>
                )}
            </div>

            {/* TOP RIGHT: ONLINE COUNT + LOGOUT */}
            <div className="absolute top-4 right-4 z-50 mt-[env(safe-area-inset-top)] flex items-center gap-3">
                {/* Online Count Badge */}
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-600">
                        {otherOnlineUsers.length + 1} Online
                    </span>
                </div>

                {/* Logout Button (Red Door Open) */}
                <button 
                    onClick={logoutBarUser} 
                    className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center border-2 border-white/20" 
                    title="Esci"
                >
                    <LogOutIcon className="h-5 w-5 ml-0.5" />
                </button>
            </div>

            {/* PROFILE MODAL */}
            {isProfileOpen && activeBarUser && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <EditIcon className="h-5 w-5 text-blue-500"/> Il mio Profilo
                            </h3>
                            <button onClick={() => setIsProfileOpen(false)} className="text-2xl leading-none text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 mb-2 flex items-center justify-center text-3xl">
                                    {activeBarUser.photoUrl ? <img src={activeBarUser.photoUrl} className="w-full h-full object-cover" /> : (activeBarUser.icon || '👤')}
                                </div>
                                <span className="font-black text-lg text-slate-800">{activeBarUser.name}</span>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{activeBarUser.grade} - Turno {activeBarUser.shift.toUpperCase()}</span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Username (Login)</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.username} 
                                        onChange={e => setProfileForm({...profileForm, username: e.target.value})} 
                                        className="w-full border rounded-lg p-2 text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                        placeholder={activeBarUser.name}
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1">Usa questo nome per accedere rapidamente.</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Password</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={profileForm.password} 
                                            onChange={e => setProfileForm({...profileForm, password: e.target.value})} 
                                            className="w-full border rounded-lg p-2 text-sm font-mono text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 outline-none pr-8"
                                            placeholder="Password (opzionale)"
                                        />
                                        <LockIcon className="absolute right-2 top-2.5 h-4 w-4 text-slate-300" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gruppo Salto (Riposo)</label>
                                    <select 
                                        value={profileForm.rcSubGroup} 
                                        onChange={e => setProfileForm({...profileForm, rcSubGroup: parseInt(e.target.value)})} 
                                        className="w-full border rounded-lg p-2 text-sm font-bold text-purple-700 bg-purple-50 focus:ring-2 focus:ring-purple-200 outline-none border-purple-200"
                                    >
                                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Gruppo {n}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                            <button onClick={() => setIsProfileOpen(false)} className="flex-1 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200 text-xs">Annulla</button>
                            <button onClick={handleSaveProfile} className="flex-1 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md text-xs flex items-center justify-center gap-2">
                                <SaveIcon className="h-4 w-4" /> Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {seasonalityConfig?.animationType !== 'none' && (
                <div className="emoji-rain-container pointer-events-none">
                    {animatedEmojis.map(emoji => (
                        <span 
                            key={emoji.id} 
                            className="falling-emoji absolute" 
                            style={{ 
                                left: emoji.left, 
                                top: emoji.top === '-10%' ? undefined : emoji.top,
                                animation: emoji.animation, 
                                animationDelay: emoji.delay, 
                                fontSize: emoji.size,
                                opacity: emoji.opacity,
                                '--target-opacity': emoji.opacity
                            } as React.CSSProperties}
                        >
                            {emoji.char}
                        </span>
                    ))}
                </div>
            )}

            {notificationPermission === 'default' && onRequestNotification && (
                <button 
                    onClick={onRequestNotification}
                    className="absolute top-16 right-4 bg-white p-2 rounded-full shadow-md text-yellow-500 animate-bounce z-50 hover:bg-yellow-50 transition-colors mt-[env(safe-area-inset-top)]"
                    title="Attiva Notifiche"
                >
                    <BellIcon className="h-6 w-6" />
                </button>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 w-full max-w-7xl mx-auto pb-20 pt-16">
                
                <div className="mb-4 md:mb-8 relative group transform transition-all duration-500">
                    <img src="/logo.png" alt="Logo" className="h-20 w-auto md:h-32 object-contain drop-shadow-lg hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                <div className="text-center mb-8 md:mb-10">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter mb-2 drop-shadow-sm transition-all">DISTACCAMENTO VVF</span>
                        <span className="text-xl md:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm transition-all">Montepulciano</span>
                    </h1>
                    
                    <div className="mt-4 px-6 py-2 rounded-full inline-flex items-center gap-3 md:gap-4 bg-white/50 backdrop-blur-sm shadow-sm border border-white/40">
                        <p className="text-slate-600 font-bold text-sm md:text-xl tracking-wide capitalize">
                            {currentDateString}
                        </p>
                        {weather && (
                            <>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <div className="flex items-center gap-1 md:gap-2">
                                    <span className="text-2xl md:text-3xl filter drop-shadow-sm leading-none">
                                        {getWeatherEmoji(weather.weathercode)}
                                    </span>
                                    <span className="text-slate-700 font-black text-sm md:text-xl">{Math.round(weather.temperature)}°</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* --- 1. SEZIONE CASSA ATTIVA (TOP) --- */}
                {activeTill && (
                    <div className="grid grid-cols-1 w-full md:w-3/4 lg:w-2/3 mb-6 px-4 transition-all">
                        <div key={activeTill.id} className="h-40 md:h-64 flex gap-2 scale-[1.02] z-10 transition-all duration-500">
                            
                            {/* PULSANTE "SMONTANTE" */}
                            {graceTimeLeft > 0 && previousShiftTill && (
                                <button 
                                    onClick={() => onSelectTill(previousShiftTill.id)}
                                    className="w-1/4 bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl border border-slate-200 flex flex-col items-center justify-center hover:bg-white hover:border-red-200 hover:shadow-lg transition-all relative overflow-hidden group shadow-md"
                                >
                                    <div className="absolute top-2 w-full flex justify-center">
                                        <span className="bg-red-500 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
                                            SMONTANTE
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center mt-3 md:mt-4 gap-1">
                                        <div 
                                            className="rounded-full flex items-center justify-center shadow-inner w-10 h-10 md:w-14 md:h-14 transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: tillColors[previousShiftTill.id] || '#94a3b8' }}
                                        >
                                            <span className="text-lg md:text-2xl font-black text-white select-none">
                                                {previousShiftTill.shift.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-xs md:text-base font-sans font-extralight text-slate-700 tracking-widest tabular-nums">
                                            {formatCountdown(graceTimeLeft)}
                                        </span>
                                    </div>
                                </button>
                            )}

                            {/* PULSANTE TURNO ATTIVO */}
                            <button 
                                onClick={() => onSelectTill(activeTill.id)} 
                                className={`
                                    flex-grow relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 
                                    border-2 border-amber-100 flex flex-col items-center justify-center
                                    transition-all duration-500 ease-out hover:shadow-[0_0_25px_rgba(180,83,9,0.3)] shadow-xl
                                    group overflow-hidden
                                `}
                            >
                                <div className="absolute -bottom-8 -right-8 text-9xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                                    ☕
                                </div>

                                <span className="absolute top-2 right-2 md:top-3 md:right-3 bg-green-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm z-10">
                                    IN SERVIZIO
                                </span>
                                
                                <div className="relative z-10 flex flex-col items-center">
                                    <div 
                                        className="rounded-full flex items-center justify-center shadow-inner mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110 w-20 h-20 md:w-32 md:h-32"
                                        style={{ backgroundColor: tillColors[activeTill.id] || '#f97316' }}
                                    >
                                        <span className="font-black text-white select-none text-4xl md:text-6xl">
                                            {activeTill.shift.toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-700 leading-tight bg-slate-50/80 px-3 py-1 rounded-lg text-xl md:text-2xl backdrop-blur-sm uppercase">
                                        CASSA BAR TURNO {activeTill.shift.toUpperCase()}
                                    </span>
                                </div>

                                {activeShiftTimeLeft > 0 && (
                                    <span className="absolute bottom-3 right-4 text-[9px] md:text-[10px] font-sans font-extralight text-slate-600 tabular-nums opacity-90 z-10">
                                        -{formatCountdown(activeShiftTimeLeft)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- SEZIONE PROMEMORIA (POST-IT REDUCED SIZE) --- */}
                {allReminders.length > 0 && !hidePostIt && (
                    <div className="w-full md:w-3/4 lg:w-2/3 px-4 mb-6">
                        <div className="bg-yellow-200 p-4 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.15)] relative transform rotate-1 transition-transform hover:rotate-0 animate-fade-in">
                            {/* Titolo più piccolo */}
                            <h3 className="text-slate-900 text-sm mb-3 uppercase tracking-tighter text-left pl-2 font-bold leading-none" style={{ fontFamily: '"Fuzzy Bubbles", cursive' }}>
                                Da fare:
                            </h3>
                            <div className="space-y-1 flex flex-col">
                                {allReminders.map(rem => (
                                    <div key={rem.id} className="flex items-start gap-2 group w-full text-left">
                                        {/* Button più piccolo */}
                                        <button 
                                            onClick={() => handleReminderClick(rem)}
                                            className={`
                                                w-3.5 h-3.5 border-2 border-slate-800 flex-shrink-0 flex items-center justify-center 
                                                transition-all cursor-pointer rounded-sm bg-white/10 hover:bg-white/30 mt-0.5
                                                ${rem.isDone ? 'text-slate-900' : 'text-transparent'}
                                            `}
                                        >
                                            <CheckIcon className="h-3 w-3" strokeWidth={4} />
                                        </button>
                                        {/* Testo più piccolo (text-xs) */}
                                        <span 
                                            className={`text-xs text-slate-800 flex-grow leading-tight tracking-tight font-bold ${rem.isDone ? 'line-through opacity-60 decoration-2 decoration-slate-800' : ''}`}
                                            style={{ fontFamily: '"Fuzzy Bubbles", cursive' }}
                                        >
                                            {rem.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 2. SEZIONE CENTRALE: GRIGLIA FUNZIONALE A 2 COLONNE FISSE --- */}
                <div className="w-full md:w-3/4 lg:w-2/3 px-4 grid grid-cols-2 gap-3 md:gap-4 mb-4">
                    
                    {/* 1. INTERVENTI */}
                    <button 
                        onClick={onSelectInterventions}
                        className="w-full bg-white hover:bg-orange-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] border-2 border-orange-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🔥
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform drop-shadow-sm filter">🔥</span>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-sm md:text-xl uppercase tracking-widest text-slate-800 group-hover:text-orange-600 transition-colors">INTERVENTI</span>
                                <span className="text-[9px] md:text-xs font-bold text-orange-500 uppercase tracking-wider block">Registro Interventi</span>
                            </div>
                        </div>
                    </button>

                    {/* 2. MEZZI OPERATIVI */}
                    <button 
                        onClick={onSelectOperationalVehicles}
                        className="w-full bg-white hover:bg-red-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] border-2 border-red-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm z-20 flex items-center gap-1 animate-pulse">
                            <span>🚧</span> In Agg.
                        </div>

                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🚒
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                            <span className="text-4xl md:text-5xl filter drop-shadow-sm group-hover:scale-110 transition-transform">🚒</span>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-sm md:text-xl uppercase tracking-widest text-red-700 group-hover:text-red-600 transition-colors">Mezzi VVF</span>
                                <span className="text-[9px] md:text-xs font-bold text-red-400 uppercase tracking-wider block">Checklist & Controlli</span>
                            </div>
                        </div>
                    </button>

                    {/* 3. PRENOTAZIONE MEZZI */}
                    <button 
                        onClick={onSelectFleet}
                        className="w-full bg-white hover:bg-red-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] border-2 border-red-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🚗
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform drop-shadow-sm filter">🚗</span>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-sm md:text-xl uppercase tracking-widest text-slate-800 group-hover:text-red-600 transition-colors">Automezzi</span>
                                <span className="text-[9px] md:text-xs font-bold text-red-400 uppercase tracking-wider block">Prenotazioni</span>
                            </div>
                        </div>
                    </button>

                    {/* 4. LAVANDERIA */}
                    <button 
                        onClick={onSelectLaundry}
                        className="w-full bg-white hover:bg-blue-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] border-2 border-blue-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🫧
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform drop-shadow-sm filter">🫧</span>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-sm md:text-xl uppercase tracking-widest text-slate-800 group-hover:text-blue-600 transition-colors">Lavanderia</span>
                                <span className="text-[9px] md:text-xs font-bold text-blue-400 uppercase tracking-wider block">Consegna Capi</span>
                            </div>
                        </div>
                    </button>

                    {/* 5. EXTRA HUB */}
                    <button 
                        onClick={onSelectGames}
                        className="col-span-2 w-full bg-white hover:bg-green-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] border-2 border-green-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        {tombolaNumberCount > 0 && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-bounce z-20 border-2 border-white">
                                {tombolaNumberCount}
                            </div>
                        )}
                        <div className="absolute -bottom-6 -right-6 text-7xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🎮
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform drop-shadow-sm filter">🎮</span>
                            <div className="flex flex-col items-center">
                                <span className="font-black text-sm md:text-xl uppercase tracking-widest text-slate-800 group-hover:text-green-600 transition-colors">Extra Hub</span>
                                <span className="text-[9px] md:text-xs font-bold text-green-500 uppercase tracking-wider block">Intrattenimento</span>
                            </div>
                        </div>
                    </button>

                </div>

                {/* --- 3. SEZIONE BASSA --- */}
                <div className={`grid gap-3 w-full md:w-3/4 lg:w-2/3 px-4 mb-6 ${canAccessAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                    <button onClick={onSelectAttendance} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📋
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Presenze</span>
                    </button>

                    <button onClick={onSelectReports} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📊
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Report</span>
                    </button>

                    <button onClick={() => setIsProfileOpen(true)} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            <UserCircleIcon className="h-8 w-8 text-slate-800" />
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Profilo</span>
                    </button>
                    
                    {canAccessAdmin && (
                        <button onClick={onSelectAdmin} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                            <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                                🔐
                            </div>
                            <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Admin</span>
                        </button>
                    )}
                </div>

                {/* --- 4. SEZIONE CASSE NON ATTIVE --- */}
                {isSuperAdmin && inactiveTills.length > 0 && (
                    <div className="w-full md:w-3/4 lg:w-2/3 px-4 mb-6">
                        <div className="grid grid-cols-3 gap-3">
                            {inactiveTills.map(till => (
                                <button 
                                    key={till.id} 
                                    onClick={() => onSelectTill(till.id)} 
                                    className="group relative bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 flex flex-col items-center justify-center w-full transition-all duration-200 hover:shadow-lg h-20 opacity-80 hover:opacity-100 active:scale-95"
                                >
                                    <div 
                                        className="rounded-full flex items-center justify-center shadow-inner w-8 h-8 mb-1"
                                        style={{ backgroundColor: tillColors[till.id] || '#94a3b8' }}
                                    >
                                        <span className="font-black text-white select-none text-sm">
                                            {till.shift.toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">
                                        Cassa {till.shift.toUpperCase()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 text-center z-50 shadow-lg pb-[env(safe-area-inset-bottom)]">
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale VVF Montepulciano v4.3 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
