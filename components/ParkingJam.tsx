
import React, { useState, useEffect } from 'react';
import { BackArrowIcon, TruckIcon } from './Icons';

interface ParkingJamProps {
    onGoBack: () => void;
}

interface Car {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'hero' | 'horizontal' | 'vertical'; // hero = APS, horizontal = Campagnola/Van, vertical = Autoscala
    color: string; // Non usato direttamente per il colore CSS ora, ma tenuto per compatibilità logica se serve
}

interface Level {
    id: number;
    cars: Car[];
}

const LEVELS: Level[] = [
    {
        id: 1,
        cars: [
            { id: 1, x: 1, y: 2, width: 2, height: 1, type: 'hero', color: 'red' }, // APS Rossa
            { id: 2, x: 0, y: 0, width: 1, height: 3, type: 'vertical', color: 'red' }, // Autoscala
            { id: 3, x: 3, y: 0, width: 1, height: 3, type: 'vertical', color: 'red' }, // Autoscala
            { id: 4, x: 0, y: 4, width: 2, height: 1, type: 'horizontal', color: 'grey' }, // Jeep
            { id: 5, x: 4, y: 4, width: 1, height: 2, type: 'vertical', color: 'grey' }, // Supporto
            { id: 6, x: 2, y: 5, width: 2, height: 1, type: 'horizontal', color: 'grey' }, // Jeep
        ]
    },
    {
        id: 2,
        cars: [
            { id: 1, x: 0, y: 2, width: 2, height: 1, type: 'hero', color: 'red' },
            { id: 2, x: 2, y: 0, width: 1, height: 3, type: 'vertical', color: 'red' },
            { id: 3, x: 3, y: 1, width: 1, height: 3, type: 'vertical', color: 'red' },
            { id: 4, x: 0, y: 3, width: 2, height: 1, type: 'horizontal', color: 'grey' },
            { id: 5, x: 4, y: 4, width: 2, height: 1, type: 'horizontal', color: 'grey' },
            { id: 6, x: 5, y: 0, width: 1, height: 3, type: 'vertical', color: 'grey' },
        ]
    },
    {
        id: 3,
        cars: [
             { id: 1, x: 1, y: 2, width: 2, height: 1, type: 'hero', color: 'red' },
             { id: 2, x: 3, y: 2, width: 1, height: 2, type: 'vertical', color: 'red' },
             { id: 3, x: 4, y: 1, width: 1, height: 3, type: 'vertical', color: 'grey' },
             { id: 4, x: 0, y: 0, width: 1, height: 3, type: 'vertical', color: 'red' },
             { id: 5, x: 1, y: 0, width: 2, height: 1, type: 'horizontal', color: 'grey' },
             { id: 6, x: 1, y: 4, width: 2, height: 1, type: 'horizontal', color: 'grey' },
             { id: 7, x: 2, y: 3, width: 2, height: 1, type: 'horizontal', color: 'grey' },
        ]
    }
];

const GRID_SIZE = 6;

const ParkingJam: React.FC<ParkingJamProps> = ({ onGoBack }) => {
    const [levelIndex, setLevelIndex] = useState(0);
    const [cars, setCars] = useState<Car[]>([]);
    const [selectedCar, setSelectedCar] = useState<number | null>(null);
    const [isWon, setIsWon] = useState(false);

    useEffect(() => {
        loadLevel(levelIndex);
    }, [levelIndex]);

    const loadLevel = (index: number) => {
        if (index >= LEVELS.length) index = 0;
        setCars(JSON.parse(JSON.stringify(LEVELS[index].cars)));
        setIsWon(false);
        setSelectedCar(null);
    };

    const isOccupied = (x: number, y: number, excludeId: number) => {
        if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return true;
        return cars.some(c => {
            if (c.id === excludeId) return false;
            const cRight = c.x + c.width - 1;
            const cBottom = c.y + c.height - 1;
            return x >= c.x && x <= cRight && y >= c.y && y <= cBottom;
        });
    };

    const handleCarClick = (id: number) => {
        if (isWon) return;
        setSelectedCar(id === selectedCar ? null : id);
    };

    const moveCar = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (selectedCar === null || isWon) return;

        const newCars = [...cars];
        const carIndex = newCars.findIndex(c => c.id === selectedCar);
        const car = newCars[carIndex];
        
        let dx = 0;
        let dy = 0;

        if (direction === 'left' && car.width > 1) dx = -1;
        if (direction === 'right' && car.width > 1) dx = 1;
        if (direction === 'up' && car.height > 1) dy = -1;
        if (direction === 'down' && car.height > 1) dy = 1;

        if (dx === 0 && dy === 0) return;

        const targetX = car.x + dx;
        const targetY = car.y + dy;

        let collision = false;
        for (let w = 0; w < car.width; w++) {
            for (let h = 0; h < car.height; h++) {
                if (isOccupied(targetX + w, targetY + h, car.id)) {
                    collision = true;
                    break;
                }
            }
        }

        if (!collision) {
            car.x = targetX;
            car.y = targetY;
            setCars(newCars);
            checkWin(car);
        }
    };

    const checkWin = (hero: Car) => {
        if (hero.type === 'hero' && hero.x === GRID_SIZE - 2) {
            setIsWon(true);
        }
    };

    const nextLevel = () => {
        setLevelIndex((prev) => (prev + 1) % LEVELS.length);
    };

    // Renderizza l'interno del veicolo in base al tipo (APS, Scala, Jeep)
    const renderCarVisuals = (car: Car) => {
        if (car.type === 'hero') {
            return (
                <div className="w-full h-full relative rounded-md shadow-lg overflow-hidden border-b-4 border-r-4 border-red-900/40" 
                     style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
                    {/* Tetto APS */}
                    <div className="absolute inset-[15%] bg-red-500 rounded-sm border border-red-800/50 flex items-center justify-center">
                        <span className="text-[10px] text-white font-black tracking-tighter opacity-80">115</span>
                    </div>
                    {/* Parabrezza */}
                    <div className="absolute top-[10%] left-[70%] w-[20%] h-[80%] bg-blue-900/60 rounded-sm border border-blue-900"></div>
                    {/* Sirene */}
                    <div className="absolute top-1 left-[50%] w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_#60a5fa]"></div>
                    <div className="absolute bottom-1 left-[50%] w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_#60a5fa]"></div>
                    {/* Scaletta sul tetto */}
                    <div className="absolute top-[30%] left-2 w-[50%] h-[40%] flex flex-col justify-between opacity-30">
                        <div className="h-0.5 bg-white w-full"></div>
                        <div className="h-0.5 bg-white w-full"></div>
                        <div className="h-0.5 bg-white w-full"></div>
                    </div>
                </div>
            );
        }
        if (car.type === 'vertical') {
            return (
                <div className="w-full h-full relative rounded-md shadow-lg overflow-hidden border-b-4 border-r-4 border-red-900/40"
                     style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
                    {/* Cabina Autoscala */}
                    <div className="absolute top-1 left-1 right-1 h-[20%] bg-red-500 rounded-sm border border-red-800">
                         <div className="absolute top-1 left-[10%] w-[80%] h-[40%] bg-blue-950/50 rounded-sm"></div>
                    </div>
                    {/* Corpo Scala */}
                    <div className="absolute top-[25%] left-[20%] right-[20%] bottom-2 bg-slate-300 border-x-2 border-slate-400 flex flex-col items-center justify-evenly">
                         {Array.from({length: 8}).map((_, i) => (
                             <div key={i} className="w-[80%] h-0.5 bg-slate-500"></div>
                         ))}
                    </div>
                </div>
            );
        }
        // Horizontal (Jeep/Campagnola)
        return (
            <div className="w-full h-full relative rounded-md shadow-lg overflow-hidden border-b-4 border-r-4 border-slate-700/40"
                 style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>
                {/* Cofano */}
                <div className="absolute top-1 bottom-1 left-1 w-[30%] bg-slate-500 rounded-sm border border-slate-600"></div>
                {/* Tetto */}
                <div className="absolute top-1 bottom-1 left-[35%] right-1 bg-slate-600 rounded-sm border border-slate-800">
                    {/* Scritta VVF */}
                    <div className="absolute inset-0 flex items-center justify-center transform -rotate-90 md:rotate-0">
                         <span className="text-[9px] text-white/50 font-bold">VVF</span>
                    </div>
                </div>
                {/* Parabrezza */}
                <div className="absolute top-[15%] bottom-[15%] left-[32%] w-[4%] bg-sky-900/80"></div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 font-sans">
            <header className="bg-red-700 text-white p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center border-b-4 border-red-900">
                <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-white/90 hover:text-white">
                    <BackArrowIcon className="h-5 w-5" /> Esci
                </button>
                <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                    <TruckIcon className="h-6 w-6" /> Fire Parking Jam
                </h1>
                <span className="bg-red-900 px-3 py-1 rounded-full text-xs font-bold border border-red-500">Lv. {levelIndex + 1}</span>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 w-full bg-[#e2e8f0]">
                
                <div className="mb-4 text-center">
                    {isWon ? (
                        <div className="animate-bounce bg-green-500 text-white px-6 py-2 rounded-full font-black text-xl shadow-lg transform rotate-[-2deg]">
                            🚒 APPLAUSI! Strada libera! 🚒
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-wide">Libera l'Autopompa Rossa (APS)!</p>
                    )}
                </div>

                {/* GAME CONTAINER - PIAZZALE */}
                <div className="relative rounded-xl border-[8px] border-slate-600 shadow-2xl overflow-hidden bg-slate-300" 
                     style={{ 
                         width: 'min(90vw, 400px)', 
                         height: 'min(90vw, 400px)',
                         backgroundImage: 'radial-gradient(circle, transparent 20%, #cbd5e1 20%, #cbd5e1 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #cbd5e1 20%, #cbd5e1 80%, transparent 80%, transparent)',
                         backgroundSize: '20px 20px',
                         backgroundPosition: '0 0, 10px 10px'
                     }}>
                    
                    {/* EXIT ZONE */}
                    <div className="absolute right-0 top-[33.33%] w-4 h-[16.66%] bg-yellow-400 border-l-4 border-dashed border-black z-0 flex items-center justify-center shadow-inner">
                        <span className="text-[8px] font-black -rotate-90 text-black">USCITA</span>
                    </div>

                    {/* GRID CARS */}
                    {cars.map((car) => {
                        const isSelected = selectedCar === car.id;
                        const cellSize = 100 / GRID_SIZE;
                        
                        return (
                            <div
                                key={car.id}
                                onClick={() => handleCarClick(car.id)}
                                className={`
                                    absolute transition-all duration-300 ease-out cursor-pointer p-0.5
                                    ${isSelected ? 'z-20 scale-[1.02] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]' : 'z-10'}
                                `}
                                style={{
                                    left: `${car.x * cellSize}%`,
                                    top: `${car.y * cellSize}%`,
                                    width: `${car.width * cellSize}%`,
                                    height: `${car.height * cellSize}%`,
                                }}
                            >
                                {renderCarVisuals(car)}
                                {isSelected && (
                                    <div className="absolute inset-0 border-2 border-yellow-400 rounded-md animate-pulse pointer-events-none"></div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* CONTROLS */}
                <div className="mt-8 grid grid-cols-3 gap-3 w-[180px]">
                    <div></div>
                    <button 
                        onClick={() => moveCar('up')} 
                        className="w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▲
                    </button>
                    <div></div>
                    <button 
                        onClick={() => moveCar('left')} 
                        className="w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ◀
                    </button>
                    <div className="w-14 h-14 flex items-center justify-center">
                        <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                    </div>
                    <button 
                        onClick={() => moveCar('right')} 
                        className="w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▶
                    </button>
                    <div></div>
                    <button 
                        onClick={() => moveCar('down')} 
                        className="w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▼
                    </button>
                    <div></div>
                </div>

                {isWon && (
                    <button 
                        onClick={nextLevel}
                        className="mt-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-10 rounded-full shadow-xl animate-pulse text-lg tracking-wider border-b-4 border-green-800"
                    >
                        Prossimo Livello →
                    </button>
                )}
            </main>
        </div>
    );
};

export default ParkingJam;
