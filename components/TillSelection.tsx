
import React, { useMemo, useEffect, useState } from 'react';
import { Till, TillColors, SeasonalityConfig, ShiftSettings, TombolaConfig } from '../types';
import { BellIcon, TruckIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectGames: () => void;
    onSelectCalendar: () => void;
    onSelectAttendance: () => void;
    onSelectFleet: () => void; // New Prop
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
    shiftSettings?: ShiftSettings;
    tombolaConfig?: TombolaConfig;
    isSuperAdmin?: boolean | null;
    notificationPermission?: NotificationPermission;
    onRequestNotification?: () => void;
}

interface WeatherData {
    temperature: number;
    weathercode: number;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, onSelectGames, onSelectCalendar, onSelectAttendance, onSelectFleet, tillColors, seasonalityConfig, shiftSettings, tombolaConfig, isSuperAdmin, notificationPermission, onRequestNotification }) => {
    
    // Context for Reliable Time
    const { getNow } = useBar();

    // WEATHER & DATE STATE
    const [currentDateString, setCurrentDateString] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    
    // TIMER STATES
    const [graceTimeLeft, setGraceTimeLeft] = useState<number>(0);
    const [activeShiftTimeLeft, setActiveShiftTimeLeft] = useState<number>(0);

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

    const visibleTills = useMemo(() => {
        const active = tills.find(t => t.shift === activeShift);
        if (isSuperAdmin) {
            const others = tills.filter(t => t.shift !== activeShift);
            return active ? [active, ...others] : tills;
        }
        return active ? [active] : []; 
    }, [tills, activeShift, isSuperAdmin]);

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
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter mb-2 drop-shadow-sm transition-all">BAR VVF</span>
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

                <div className="grid grid-cols-3 md:grid-cols-3 gap-4 w-full md:w-3/4 lg:w-2/3 mb-6 px-4 transition-all">
                    {visibleTills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        const isActiveShift = till.shift === activeShift;
                        
                        // Layout principale per il turno attivo
                        if (isActiveShift) {
                            return (
                                <div key={till.id} className="col-span-3 h-40 md:h-64 flex gap-2 order-first scale-[1.02] z-10 transition-all duration-500">
                                    
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
                                                {/* FONT RIDOTTO QUI */}
                                                <span className="text-xs md:text-base font-sans font-extralight text-slate-700 tracking-widest tabular-nums">
                                                    {formatCountdown(graceTimeLeft)}
                                                </span>
                                            </div>
                                        </button>
                                    )}

                                    {/* PULSANTE TURNO ATTIVO */}
                                    <button 
                                        onClick={() => onSelectTill(till.id)} 
                                        className={`
                                            flex-grow relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 
                                            border border-slate-100 flex flex-col items-center justify-center
                                            transition-all duration-500 ease-out hover:shadow-2xl shadow-xl border-primary/20
                                        `}
                                    >
                                        <span className="absolute top-4 right-4 bg-green-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                                            IN SERVIZIO
                                        </span>
                                        
                                        <div 
                                            className="rounded-full flex items-center justify-center shadow-inner mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110 w-20 h-20 md:w-32 md:h-32"
                                            style={{ backgroundColor: bgColor }}
                                        >
                                            <span className="font-black text-white select-none text-4xl md:text-6xl">
                                                {till.shift.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-700 leading-tight bg-slate-50 px-3 py-1 rounded-lg text-xl md:text-2xl">
                                            {till.name}
                                        </span>

                                        {/* ACTIVE SHIFT COUNTDOWN */}
                                        {activeShiftTimeLeft > 0 && (
                                            <span className="absolute bottom-3 right-4 text-[9px] md:text-[10px] font-sans font-extralight text-slate-600 tabular-nums opacity-90">
                                                -{formatCountdown(activeShiftTimeLeft)}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        }

                        // Layout standard per altri turni (se visibili, es. admin)
                        return (
                            <button 
                                key={till.id} 
                                onClick={() => onSelectTill(till.id)} 
                                className="group relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 border border-slate-100 flex flex-col items-center justify-center w-full transition-all duration-500 ease-out hover:shadow-2xl col-span-1 h-20 md:h-40 opacity-90 hover:opacity-100 hover:scale-[1.02]"
                            >
                                <div 
                                    className="rounded-full flex items-center justify-center shadow-inner mb-1 md:mb-2 transition-transform duration-300 group-hover:scale-110 w-10 h-10 md:w-20 md:h-20"
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <span className="font-black text-white select-none text-xl md:text-4xl">
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className="font-bold text-slate-700 leading-tight bg-slate-50 px-3 py-1 rounded-lg hidden md:block text-xs md:text-lg">
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* GESTIONE (GRID UNICA CON EXTRA HUB) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-3/4 lg:w-2/3 px-4 transition-all">
                    {/* Pulsante: Presenze */}
                    <button onClick={onSelectAttendance} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-indigo-500/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-slate-100 p-2 md:p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24 md:h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📋
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Presenze</span>
                    </button>

                    {/* Pulsante: Report */}
                    <button onClick={onSelectReports} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-violet-500/10 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-slate-100 p-2 md:p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24 md:h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            📊
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-violet-600 transition-colors">Report</span>
                    </button>
                    
                    {/* Pulsante: Admin */}
                    <button onClick={onSelectAdmin} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-slate-500/10 hover:shadow-[0_0_15px_rgba(100,116,139,0.5)] border border-slate-100 p-2 md:p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24 md:h-24">
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            🔐
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-slate-900 transition-colors">Admin</span>
                    </button>

                    {/* Pulsante: Extra Hub (Spostato qui) */}
                    <button onClick={onSelectGames} className="relative bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-slate-100 p-2 md:p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 group h-24 md:h-24">
                        {tombolaNumberCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce z-20 border-2 border-white">
                                {tombolaNumberCount}
                            </div>
                        )}
                        <div className="text-2xl md:text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
                            🎮
                        </div>
                        <span className="block font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-wider group-hover:text-amber-600 transition-colors">Extra Hub</span>
                    </button>
                </div>

                {/* NEW VEHICLE RESERVATION BUTTON - ENHANCED (WHITE + GLOW) */}
                <div className="w-full md:w-3/4 lg:w-2/3 px-4 mt-6 pt-6 border-t border-slate-200">
                    <button 
                        onClick={onSelectFleet}
                        className="w-full bg-white hover:bg-red-50 text-slate-800 rounded-2xl shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] border-2 border-red-50 p-6 relative overflow-hidden transition-all duration-300 group transform active:scale-95 h-32 md:h-40 flex items-center justify-center"
                    >
                        {/* Background Emoji Effect */}
                        <div className="absolute -bottom-8 -right-8 text-9xl opacity-10 group-hover:opacity-20 transform rotate-[-10deg] filter grayscale-0 pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-0">
                            🚗
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
                            <span className="text-5xl md:text-7xl group-hover:scale-110 transition-transform drop-shadow-sm filter">🚗</span>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="font-black text-xl md:text-3xl uppercase tracking-widest text-slate-800 group-hover:text-red-600 transition-colors">Automezzi</span>
                                <span className="text-[10px] md:text-xs font-bold text-red-400 uppercase tracking-wider">Prenotazioni & Gestione</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 text-center z-50 shadow-lg pb-[env(safe-area-inset-bottom)]">
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale Bar v3.7 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
