
import React, { useMemo, useEffect, useState } from 'react';
import { Till, TillColors, SeasonalityConfig, ShiftSettings, TombolaConfig, Reminder, OperationalVehicle, VehicleCheck, Vehicle } from '../types';
import { BellIcon, TruckIcon, ShirtIcon, FireIcon, PinIcon, CheckIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

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
    
    // Context for Reliable Time
    const { getNow } = useBar();

    // WEATHER & DATE STATE
    const [currentDateString, setCurrentDateString] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    
    // TIMER STATES
    const [graceTimeLeft, setGraceTimeLeft] = useState<number>(0);
    const [activeShiftTimeLeft, setActiveShiftTimeLeft] = useState<number>(0);

    // POST-IT STATE
    const [hidePostIt, setHidePostIt] = useState(false);

    // Sync Timer (Updates UI frequently for centiseconds)
    useEffect(() => {
        const updateTick = () => {
            const now = getNow();
            setCurrentTime(now);
            
            // Format Date (es. "Lunedì, 27 Ottobre 2025")
            // Aggiorniamo la stringa data solo se cambia il giorno per efficienza, ma qui lo facciamo ad ogni tick per semplicità dato che è leggero
            const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            setCurrentDateString(now.toLocaleDateString('it-IT', options));

            // Grace Period Calculation
            const hour = now.getHours();
            
            // Determina l'orario di inizio dell'ultimo turno (08:00 o 20:00)
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
                // Giorno: finisce alle 20:00
                shiftEndTime.setHours(20);
            } else if (hour >= 20) {
                // Notte (prima di mezzanotte): finisce domani alle 08:00
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                shiftEndTime.setHours(8);
            } else {
                // Notte (dopo mezzanotte): finisce oggi alle 08:00
                shiftEndTime.setHours(8);
            }

            const remainingActive = shiftEndTime.getTime() - now.getTime();
            setActiveShiftTimeLeft(remainingActive > 0 ? remainingActive : 0);
        };

        updateTick(); // Initial call
        // Refresh rate ~41ms (approx 24fps) to show centiseconds smoothly without killing CPU
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
        const cs = Math.floor((ms % 1000) / 10); // Centesimi (2 cifre)
        
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    const getWeatherEmoji = (code: number) => {
        if (code === 0) return '☀️'; // Sereno
        if (code >= 1 && code <= 3) return '⛅'; // Parz. nuvoloso
        if (code >= 45 && code <= 48) return '🌫️'; // Nebbia
        if (code >= 51 && code <= 67) return '🌧️'; // Pioggia
        if (code >= 71 && code <= 77) return '❄️'; // Neve
        if (code >= 80 && code <= 82) return '🌦️'; // Rovesci
        if (code >= 95) return '⛈️'; // Temporale
        return '☀️'; // Default
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
        
        // Data operativa (se prima delle 8, conta come ieri)
        const calculationDate = new Date(currentTime);
        if (hour < 8) {
            calculationDate.setDate(calculationDate.getDate() - 1);
        }
        calculationDate.setHours(12, 0, 0, 0);

        // ANCORAGGIO ESPLICITO: 20 Dicembre 2025 = B
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0); // Mese 11 = Dicembre
        const anchorShift = 'b'; // Index 1

        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = shifts.indexOf(anchorShift.toLowerCase());
        
        // ROTAZIONE IN AVANTI (A->B->C->D)
        // Formula: (Anchor + Diff) % 4
        // Aggiungiamo un multiplo di 4 grande per gestire diff negativi
        let shiftIndex = (anchorIndex + diffDays) % 4;
        if (shiftIndex < 0) shiftIndex += 4;
        
        // LOGICA NOTTE: "Quando B smonta (20:00), monta A".
        // Quindi la notte è il turno precedente nell'alfabeto.
        if (hour >= 20 || hour < 8) {
            shiftIndex = (shiftIndex - 1 + 4) % 4;
        }

        return shifts[shiftIndex];
    }, [currentTime]);

    // Calcolo "Smontante" (Chi c'era prima del turno attivo)
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

    // Split tills into active and others (for Super Admin layout)
    const activeTill = useMemo(() => tills.find(t => t.shift === activeShift), [tills, activeShift]);
    const inactiveTills = useMemo(() => tills.filter(t => t.shift !== activeShift), [tills, activeShift]);

    // --- REMINDER & VEHICLE CHECK LOGIC ---
    
    // 1. Promemoria Standard
    const standardReminders = useMemo(() => {
        const todayStr = currentTime.toISOString().split('T')[0];
        const dayOfWeek = currentTime.getDay(); 
        const dayOfMonth = currentTime.getDate(); 
        const year = currentTime.getFullYear();
        const month = currentTime.getMonth();
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
    }, [reminders, currentTime]);

    // 2. Controlli Veicoli (Dynamic Reminders) - OPERATIONAL & FLEET
    const vehicleCheckReminders = useMemo(() => {
        const dayOfWeek = currentTime.getDay(); 
        const daysMap = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const todayName = daysMap[dayOfWeek];
        const todayStr = currentTime.toISOString().split('T')[0];

        // Filtra veicoli operativi che hanno il controllo OGGI
        const opVehiclesToCheck = operationalVehicles.filter(v => v.checkDay === todayName);
        
        // Filtra automezzi (Fleet) che hanno il controllo OGGI
        const fleetVehiclesToCheck = vehicles.filter(v => v.checkDay === todayName);

        // Mappa Operational in formato Reminder
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

        // Mappa Fleet in formato Reminder
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
    }, [operationalVehicles, vehicles, vehicleChecks, currentTime]);

    // Merge Lists
    const allReminders = useMemo(() => {
        const standardList = standardReminders.map(r => ({
            ...r,
            isDone: r.completedDates.includes(currentTime.toISOString().split('T')[0]),
            source: 'manual' as const
        }));
        
        const vehicleList = vehicleCheckReminders.map(r => ({
            id: r.id,
            text: r.text,
            isDone: r.isDone,
            source: r.type, // 'vehicle_op' or 'vehicle_fleet'
            completedDates: [] // Dummy
        }));

        return [...standardList, ...vehicleList];
    }, [standardReminders, vehicleCheckReminders, currentTime]);

    // --- CHECK ALL COMPLETED & AUTO HIDE (WITH PERSISTENCE) ---
    const areAllRemindersCompleted = useMemo(() => {
        if (allReminders.length === 0) return false;
        return allReminders.every(rem => rem.isDone);
    }, [allReminders]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const now = getNow();
        const todayStr = now.toISOString().split('T')[0];
        const storageKey = `postit_hidden_${todayStr}`;
        
        // Verifica se è stato già nascosto oggi (persistenza)
        // SAFEGUARD LOCAL STORAGE ACCESS
        let isHiddenInStorage = false;
        try {
            isHiddenInStorage = localStorage.getItem(storageKey) === 'true';
        } catch (e) {
            console.warn("LocalStorage access failed (Quota Exceeded or blocked)", e);
        }

        if (areAllRemindersCompleted) {
            if (isHiddenInStorage) {
                setHidePostIt(true);
            } else {
                // Avvia timer per nascondere e salvare persistenza
                // FIX: Rimosso currentTime dalle dipendenze per evitare reset del timer ogni 41ms
                timer = setTimeout(() => {
                    setHidePostIt(true);
                    try {
                        localStorage.setItem(storageKey, 'true');
                    } catch (e) { console.warn("LocalStorage save failed", e); }
                }, 60000);
            }
        } else {
            setHidePostIt(false);
            // Se l'utente toglie la spunta, rimuovi la persistenza
            try {
                localStorage.removeItem(storageKey);
            } catch (e) { console.warn("LocalStorage remove failed", e); }
        }
        return () => clearTimeout(timer);
    }, [areAllRemindersCompleted, getNow]);

    const handleReminderClick = async (rem: any) => {
        if (rem.source === 'vehicle_op') {
            // Se è un controllo veicolo operativo e NON è fatto, manda alla pagina
            if (!rem.isDone) {
                onSelectOperationalVehicles();
            }
        } else if (rem.source === 'vehicle_fleet') {
            // Se è un controllo automezzo e NON è fatto, manda alla pagina automezzi
            if (!rem.isDone) {
                onSelectFleet();
            }
        } else {
            // Promemoria standard
            const todayStr = currentTime.toISOString().split('T')[0];
            if (onToggleReminder) {
                await onToggleReminder(rem.id, todayStr, rem.completedDates);
            }
        }
    };

    const backgroundColor = seasonalityConfig?.backgroundColor || '#f8fafc';
    const tombolaNumberCount = tombolaConfig?.status === 'active' ? (tombolaConfig.extractedNumbers?.length || 0) : 0;

    return (
        <div className="flex flex-col min-h-dvh relative overflow-hidden font-sans transition-colors duration-500" style={{ backgroundColor }}>
            
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
                    className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-md text-yellow-500 animate-bounce z-50 hover:bg-yellow-50 transition-colors mt-[env(safe-area-inset-top)]"
                    title="Attiva Notifiche"
                >
                    <BellIcon className="h-6 w-6" />
                </button>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 w-full max-w-7xl mx-auto pb-20">
                
                <div className="mb-4 md:mb-8 relative group transform transition-all duration-500 mt-[env(safe-area-inset-top)]">
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
                            
                            {/* PULSANTE "SMONTANTE" (TURNO PRECEDENTE) */}
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

                            {/* PULSANTE TURNO ATTIVO (STILE COFFEE GLOW) */}
                            <button 
                                onClick={() => onSelectTill(activeTill.id)} 
                                className={`
                                    flex-grow relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 
                                    border-2 border-amber-100 flex flex-col items-center justify-center
                                    transition-all duration-500 ease-out hover:shadow-[0_0_25px_rgba(180,83,9,0.3)] shadow-xl
                                    group overflow-hidden
                                `}
                            >
                                {/* Background Emoji Effect - COFFEE */}
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

                                {/* ACTIVE SHIFT COUNTDOWN */}
                                {activeShiftTimeLeft > 0 && (
                                    <span className="absolute bottom-3 right-4 text-[9px] md:text-[10px] font-sans font-extralight text-slate-600 tabular-nums opacity-90 z-10">
                                        -{formatCountdown(activeShiftTimeLeft)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- SEZIONE PROMEMORIA (POST-IT) --- */}
                {allReminders.length > 0 && !hidePostIt && (
                    <div className="w-full md:w-3/4 lg:w-2/3 px-4 mb-6">
                        <div className="bg-yellow-200 p-6 rounded-xl shadow-[5px_5px_15px_rgba(0,0,0,0.15)] relative transform rotate-1 transition-transform hover:rotate-0">
                            {/* Titolo spostato a SINISTRA, Font Fuzzy Bubbles, Bold, Tighter spacing, Smaller */}
                            <h3 className="text-slate-900 text-lg mb-3 uppercase tracking-tighter text-left pl-2 font-bold leading-none" style={{ fontFamily: '"Fuzzy Bubbles", cursive' }}>
                                Da fare:
                            </h3>
                            <div className="space-y-1.5 flex flex-col">
                                {allReminders.map(rem => (
                                    <div key={rem.id} className="flex items-start gap-2 group w-full text-left">
                                        {/* Button a SINISTRA - Quadratino bordo scuro */}
                                        <button 
                                            onClick={() => handleReminderClick(rem)}
                                            className={`
                                                w-4 h-4 border-2 border-slate-800 flex-shrink-0 flex items-center justify-center 
                                                transition-all cursor-pointer rounded-md bg-white/10 hover:bg-white/30 mt-0.5
                                                ${rem.isDone ? 'text-slate-900' : 'text-transparent'}
                                            `}
                                        >
                                            <CheckIcon className="h-3 w-3" strokeWidth={4} />
                                        </button>
                                        {/* Testo a DESTRA - Smaller (text-sm), Tighter spacing */}
                                        <span 
                                            className={`text-sm text-slate-800 flex-grow leading-tight tracking-tight ${rem.isDone ? 'line-through opacity-60 decoration-2 decoration-slate-800' : ''}`}
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
                    
                    {/* 1. INTERVENTI (ARANCIONE) */}
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

                    {/* 2. MEZZI OPERATIVI (ROSSO) */}
                    <button 
                        onClick={onSelectOperationalVehicles}
                        className="w-full bg-white hover:bg-red-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] border-2 border-red-50 p-4 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 flex items-center justify-center"
                    >
                        {/* BADGE IN AGGIORNAMENTO */}
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

                    {/* 3. PRENOTAZIONE MEZZI (ROSSO SCURO/AUTO) */}
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

                    {/* 4. LAVANDERIA (BLU) */}
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

                    {/* 5. EXTRA HUB (VERDE) - FULL WIDTH (COL-SPAN-2) */}
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

                {/* --- 3. SEZIONE BASSA: GRIGLIA FUNZIONALE (PRESENZE, REPORT, ADMIN) --- */}
                <div className="grid grid-cols-3 gap-3 w-full md:w-3/4 lg:w-2/3 px-4 mb-6">
                    {/* Pulsante: Presenze (Glow Nero/Slate) */}
                    <button onClick={onSelectAttendance} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📋
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Presenze</span>
                    </button>

                    {/* Pulsante: Report (Glow Nero/Slate) */}
                    <button onClick={onSelectReports} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📊
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Report</span>
                    </button>
                    
                    {/* Pulsante: Admin (Glow Nero/Slate) */}
                    <button onClick={onSelectAdmin} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/20 hover:shadow-[0_0_15px_rgba(71,85,105,0.4)] border border-slate-200 p-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            🔐
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Admin</span>
                    </button>
                </div>

                {/* --- 4. SEZIONE CASSE NON ATTIVE (SOLO SUPER ADMIN) --- */}
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
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale Bar VVF v4.3 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
