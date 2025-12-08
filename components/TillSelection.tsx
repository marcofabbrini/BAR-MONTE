
import React, { useMemo, useEffect, useState } from 'react';
import { Till, TillColors, SeasonalityConfig, ShiftSettings } from '../types';
import { ChartBarIcon, LockIcon, CalendarIcon, GamepadIcon, SunIcon, CloudSunIcon, RainIcon, SnowIcon, BoltIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectGames: () => void;
    onSelectCalendar: () => void;
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
    shiftSettings?: ShiftSettings;
}

interface WeatherData {
    temperature: number;
    weathercode: number;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, onSelectGames, onSelectCalendar, tillColors, seasonalityConfig, shiftSettings }) => {
    
    // WEATHER & DATE STATE
    const [currentDate, setCurrentDate] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        // Format Date (es. "Lunedì, 27 Ottobre 2025")
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        setCurrentDate(now.toLocaleDateString('it-IT', options));

        // Fetch Weather for Montepulciano (SI)
        // Lat: 43.1017, Lon: 11.7868
        const fetchWeather = async () => {
            try {
                const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.1017&longitude=11.7868&current_weather=true');
                const data = await response.json();
                if (data.current_weather) {
                    setWeather(data.current_weather);
                }
            } catch (error) {
                console.error("Failed to fetch weather", error);
            }
        };

        fetchWeather();
        // Refresh weather every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getWeatherIcon = (code: number) => {
        if (code === 0) return <SunIcon className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />;
        if (code >= 1 && code <= 3) return <CloudSunIcon className="h-5 w-5 md:h-6 md:w-6 text-slate-400" />;
        if (code >= 45 && code <= 48) return <CloudSunIcon className="h-5 w-5 md:h-6 md:w-6 text-slate-500" />; // Fog
        if (code >= 51 && code <= 67) return <RainIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />;
        if (code >= 71 && code <= 77) return <SnowIcon className="h-5 w-5 md:h-6 md:w-6 text-sky-300" />;
        if (code >= 80 && code <= 82) return <RainIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />;
        if (code >= 95) return <BoltIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />;
        return <SunIcon className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />; // Default
    };

    // Generazione emoji animate basata sulla config avanzata
    const animatedEmojis = useMemo(() => {
        if (!seasonalityConfig || seasonalityConfig.animationType === 'none' || !seasonalityConfig.emojis || seasonalityConfig.emojis.length === 0) {
            return [];
        }

        const count = 50; // Numero particelle
        const emojiList = seasonalityConfig.emojis;

        return Array.from({ length: count }).map((_, i) => {
            const animType = seasonalityConfig.animationType;
            let animationName = 'fall'; // Default snow
            if (animType === 'rain') animationName = 'rainfall';
            if (animType === 'float') animationName = 'float';

            return {
                id: i,
                char: emojiList[Math.floor(Math.random() * emojiList.length)],
                left: `${Math.random() * 100}%`,
                top: animType === 'float' ? `${Math.random() * 100}%` : '-10%', // Float parte sparso
                animation: `${animationName} ${Math.random() * 20 + 10}s linear infinite`,
                delay: `-${Math.random() * 20}s`, // Start immediately at random point
                size: `${Math.random() * 0.8 + 0.4}rem`,
                opacity: seasonalityConfig.opacity || 0.5
            };
        });
    }, [seasonalityConfig]);

    // Algoritmo per calcolare il turno attivo ADESSO usando ANCORA DINAMICA
    const activeShift = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        
        // Se è tra mezzanotte e le 8:00, stiamo ancora "vivendo" il turno di notte iniziato ieri sera
        const calculationDate = new Date(now);
        if (hour < 8) {
            calculationDate.setDate(calculationDate.getDate() - 1);
        }
        
        // Normalize time to noon to avoid DST issues
        calculationDate.setHours(12, 0, 0, 0);

        // Se non abbiamo settings, fallback a B oggi (come richiesto)
        // Ma grazie a App.tsx, shiftSettings avrà un default
        const anchorDateStr = shiftSettings?.anchorDate || new Date().toISOString().split('T')[0];
        const anchorShift = shiftSettings?.anchorShift || 'b';

        const anchorDate = new Date(anchorDateStr);
        anchorDate.setHours(12, 0, 0, 0); // Importantissimo

        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Round è più sicuro

        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = shifts.indexOf(anchorShift.toLowerCase());
        
        let shiftIndex = (anchorIndex + diffDays) % 4;
        if (shiftIndex < 0) shiftIndex += 4;
        
        return shifts[shiftIndex];
    }, [shiftSettings]);

    // Ordina le casse: prima quella attiva, poi le altre
    const sortedTills = useMemo(() => {
        const active = tills.find(t => t.shift === activeShift);
        const others = tills.filter(t => t.shift !== activeShift);
        return active ? [active, ...others] : tills;
    }, [tills, activeShift]);

    // Colore sfondo dinamico
    const backgroundColor = seasonalityConfig?.backgroundColor || '#f8fafc';

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden font-sans transition-colors duration-500" style={{ backgroundColor }}>
            
            {/* CONTAINER ANIMAZIONE */}
            {seasonalityConfig?.animationType !== 'none' && (
                <div className="emoji-rain-container pointer-events-none">
                    {animatedEmojis.map(emoji => (
                        <span 
                            key={emoji.id} 
                            className="falling-emoji absolute" 
                            style={{ 
                                left: emoji.left, 
                                top: emoji.top === '-10%' ? undefined : emoji.top, // Solo per float
                                animation: emoji.animation, 
                                animationDelay: emoji.delay, 
                                fontSize: emoji.size,
                                opacity: emoji.opacity,
                                '--target-opacity': emoji.opacity // Variabile CSS per i keyframes
                            } as React.CSSProperties}
                        >
                            {emoji.char}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 w-full max-w-7xl mx-auto pb-16">
                
                {/* LOGO E TITOLO */}
                <div className="mb-4 md:mb-8 relative group transform transition-all duration-500">
                    <img src="/logo.png" alt="Logo" className="h-20 w-auto md:h-32 object-contain drop-shadow-lg hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                <div className="text-center mb-8 md:mb-10">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter mb-2 drop-shadow-sm transition-all">BAR VVF</span>
                        <span className="text-xl md:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm transition-all">Montepulciano</span>
                    </h1>
                    
                    {/* DATA E METEO */}
                    <div className="mt-4 px-6 py-2 rounded-full inline-flex items-center gap-3 md:gap-4 bg-white/50 backdrop-blur-sm shadow-sm border border-white/40">
                        <p className="text-slate-600 font-bold text-sm md:text-xl tracking-wide capitalize">
                            {currentDate}
                        </p>
                        {weather && (
                            <>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <div className="flex items-center gap-1 md:gap-2">
                                    {getWeatherIcon(weather.weathercode)}
                                    <span className="text-slate-700 font-black text-sm md:text-xl">{Math.round(weather.temperature)}°</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* GRIGLIA CASSE DINAMICA */}
                <div className="grid grid-cols-3 md:grid-cols-3 gap-4 w-full md:w-3/4 lg:w-2/3 mb-6 px-4 transition-all">
                    {sortedTills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        const isActiveShift = till.shift === activeShift;

                        const gridClass = isActiveShift 
                            ? "col-span-3 h-40 md:h-64 shadow-xl border-primary/20 scale-[1.02] z-10 order-first" 
                            : "col-span-1 h-32 md:h-48 opacity-90 hover:opacity-100 hover:scale-[1.02]";

                        return (
                            <button 
                                key={till.id} 
                                onClick={() => onSelectTill(till.id)} 
                                className={`
                                    group relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 
                                    border border-slate-100 flex flex-col items-center justify-center w-full 
                                    transition-all duration-500 ease-out hover:shadow-2xl
                                    ${gridClass}
                                `}
                            >
                                {isActiveShift && (
                                    <span className="absolute top-4 right-4 bg-green-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                                        IN SERVIZIO
                                    </span>
                                )}
                                
                                <div 
                                    className={`
                                        rounded-full flex items-center justify-center shadow-inner mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110
                                        ${isActiveShift ? 'w-20 h-20 md:w-32 md:h-32' : 'w-10 h-10 md:w-20 md:h-20'}
                                    `} 
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <span className={`font-black text-white select-none ${isActiveShift ? 'text-4xl md:text-6xl' : 'text-xl md:text-4xl'}`}>
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className={`font-bold text-slate-700 leading-tight bg-slate-50 px-3 py-1 rounded-lg ${isActiveShift ? 'text-xl md:text-2xl' : 'hidden md:block text-xs md:text-lg'}`}>
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* GESTIONE & EXTRA - GRIGLIA UNIFICATA E COERENTE */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-3/4 lg:w-2/3 px-4 transition-all">
                    {/* Pulsante 1: Extra Hub */}
                    <button onClick={onSelectGames} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 transition-all duration-300 group h-24 md:h-24">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all shrink-0">
                            <GamepadIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex flex-col items-center md:items-start min-w-0">
                            <span className="block font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider group-hover:text-amber-600 transition-colors">Extra Hub</span>
                            <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate w-full">Svago & Extra</span>
                        </div>
                    </button>

                    {/* Pulsante 2: Turnario */}
                    <button onClick={onSelectCalendar} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 transition-all duration-300 group h-24 md:h-24">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center group-hover:bg-sky-100 group-hover:scale-110 transition-all shrink-0">
                            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex flex-col items-center md:items-start min-w-0">
                            <span className="block font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider group-hover:text-sky-600 transition-colors">Turnario</span>
                            <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate w-full">Calendario VVF</span>
                        </div>
                    </button>

                    {/* Pulsante 3: Report */}
                    <button onClick={onSelectReports} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 transition-all duration-300 group h-24 md:h-24">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center group-hover:bg-violet-100 group-hover:scale-110 transition-all shrink-0">
                            <ChartBarIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex flex-col items-center md:items-start min-w-0">
                            <span className="block font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider group-hover:text-violet-600 transition-colors">Report</span>
                            <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate w-full">Statistiche</span>
                        </div>
                    </button>
                    
                    {/* Pulsante 4: Admin */}
                    <button onClick={onSelectAdmin} className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 transition-all duration-300 group h-24 md:h-24">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-slate-100 group-hover:scale-110 transition-all shrink-0">
                            <LockIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex flex-col items-center md:items-start min-w-0">
                            <span className="block font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider group-hover:text-slate-900 transition-colors">Admin</span>
                            <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate w-full">Area Riservata</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 text-center z-50 shadow-lg">
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale Bar v3.4 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
