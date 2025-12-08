
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
    color: string;
}

interface Level {
    id: number;
    cars: Car[];
}

const LEVELS: Level[] = [
    {
        id: 1,
        cars: [
            { id: 1, x: 1, y: 2, width: 2, height: 1, type: 'hero', color: 'bg-red-600' }, // APS Rossa
            { id: 2, x: 0, y: 0, width: 1, height: 3, type: 'vertical', color: 'bg-red-800' }, // Autoscala
            { id: 3, x: 3, y: 0, width: 1, height: 3, type: 'vertical', color: 'bg-red-800' }, // Autoscala
            { id: 4, x: 0, y: 4, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' }, // Jeep
            { id: 5, x: 4, y: 4, width: 1, height: 2, type: 'vertical', color: 'bg-slate-600' }, // Supporto
            { id: 6, x: 2, y: 5, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' }, // Jeep
        ]
    },
    {
        id: 2,
        cars: [
            { id: 1, x: 0, y: 2, width: 2, height: 1, type: 'hero', color: 'bg-red-600' },
            { id: 2, x: 2, y: 0, width: 1, height: 3, type: 'vertical', color: 'bg-red-800' },
            { id: 3, x: 3, y: 1, width: 1, height: 3, type: 'vertical', color: 'bg-red-800' },
            { id: 4, x: 0, y: 3, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' },
            { id: 5, x: 4, y: 4, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' },
            { id: 6, x: 5, y: 0, width: 1, height: 3, type: 'vertical', color: 'bg-slate-600' },
        ]
    },
    {
        id: 3,
        cars: [
             { id: 1, x: 1, y: 2, width: 2, height: 1, type: 'hero', color: 'bg-red-600' },
             { id: 2, x: 3, y: 2, width: 1, height: 2, type: 'vertical', color: 'bg-red-800' },
             { id: 3, x: 4, y: 1, width: 1, height: 3, type: 'vertical', color: 'bg-slate-600' },
             { id: 4, x: 0, y: 0, width: 1, height: 3, type: 'vertical', color: 'bg-red-800' },
             { id: 5, x: 1, y: 0, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' },
             { id: 6, x: 1, y: 4, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' },
             { id: 7, x: 2, y: 3, width: 2, height: 1, type: 'horizontal', color: 'bg-slate-500' },
        ]
    }
];

const GRID_SIZE = 6;

const ParkingJam: React.FC<ParkingJamProps> = ({ onGoBack }) => {
    const [levelIndex, setLevelIndex] = useState(0);
    const [cars, setCars] = useState<Car[]>([]);
    const [selectedCar, setSelectedCar] = useState<number | null>(null);
    const [isWon, setIsWon] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number, carX: number, carY: number } | null>(null);

    useEffect(() => {
        loadLevel(levelIndex);
    }, [levelIndex]);

    const loadLevel = (index: number) => {
        if (index >= LEVELS.length) index = 0;
        // Deep copy
        setCars(JSON.parse(JSON.stringify(LEVELS[index].cars)));
        setIsWon(false);
        setSelectedCar(null);
    };

    const isOccupied = (x: number, y: number, excludeId: number) => {
        // Bounds check
        if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return true;
        
        // Car collision check
        return cars.some(c => {
            if (c.id === excludeId) return false;
            // A car occupies cells from (c.x, c.y) to (c.x + width -1, c.y + height -1)
            const cRight = c.x + c.width - 1;
            const cBottom = c.y + c.height - 1;
            return x >= c.x && x <= cRight && y >= c.y && y <= cBottom;
        });
    };

    const handleCarClick = (id: number) => {
        if (isWon) return;
        setSelectedCar(id === selectedCar ? null : id);
    };

    // Simplified movement: Click car, then arrow buttons or tap adjacent cells (simulated with logic below)
    // Actually, let's implement a visual control pad for the selected car
    const moveCar = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (selectedCar === null || isWon) return;

        const newCars = [...cars];
        const carIndex = newCars.findIndex(c => c.id === selectedCar);
        const car = newCars[carIndex];
        
        let dx = 0;
        let dy = 0;

        if (direction === 'left' && car.width > 1) dx = -1; // Horizontal car
        if (direction === 'right' && car.width > 1) dx = 1;
        if (direction === 'up' && car.height > 1) dy = -1; // Vertical car
        if (direction === 'down' && car.height > 1) dy = 1;

        // Valid move direction check
        if (dx === 0 && dy === 0) return; // Car cannot move in this direction

        const targetX = car.x + dx;
        const targetY = car.y + dy;

        // Check head collision (if moving forward) or tail collision (if moving backward)
        // Simplified: check all cells the car WOULD occupy
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

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 font-sans">
            <header className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
                <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-white/90 hover:text-white">
                    <BackArrowIcon className="h-5 w-5" /> Esci
                </button>
                <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                    <TruckIcon className="h-6 w-6" /> Fire Parking Jam
                </h1>
                <span className="bg-red-800 px-2 py-1 rounded text-xs font-bold">Livello {levelIndex + 1}</span>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 w-full">
                
                <div className="mb-4 text-center text-slate-500 text-sm font-bold">
                    {isWon ? (
                        <div className="animate-bounce text-green-600 text-xl">
                            🚒 APPLAUSI! Strada libera! 🚒
                        </div>
                    ) : (
                        "Libera l'Autopompa Rossa (APS)!"
                    )}
                </div>

                {/* GAME CONTAINER */}
                <div className="relative bg-slate-300 rounded-lg border-4 border-slate-500 shadow-2xl overflow-hidden" 
                     style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}>
                    
                    {/* EXIT ZONE */}
                    <div className="absolute right-0 top-[33.33%] w-2 h-[16.66%] bg-yellow-400 border-l-2 border-dashed border-black z-0 flex items-center justify-center">
                        <span className="text-[10px] font-black -rotate-90">EXIT</span>
                    </div>

                    {/* GRID */}
                    {cars.map((car) => {
                        const isSelected = selectedCar === car.id;
                        const cellSize = 100 / GRID_SIZE;
                        
                        return (
                            <div
                                key={car.id}
                                onClick={() => handleCarClick(car.id)}
                                className={`
                                    absolute transition-all duration-200 cursor-pointer rounded-md shadow-md border-2
                                    ${car.color}
                                    ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-300 z-10' : 'border-black/20 z-0'}
                                    flex items-center justify-center
                                `}
                                style={{
                                    left: `${car.x * cellSize}%`,
                                    top: `${car.y * cellSize}%`,
                                    width: `${car.width * cellSize}%`,
                                    height: `${car.height * cellSize}%`,
                                }}
                            >
                                {/* Car Visuals */}
                                <div className="w-full h-full relative">
                                    {car.type === 'hero' && (
                                        <>
                                            <div className="absolute top-1 left-1 w-2 h-2 bg-blue-300 rounded-full animate-pulse shadow-glow"></div>
                                            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-300 rounded-full animate-pulse shadow-glow"></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xs tracking-tighter opacity-80">APS</span>
                                        </>
                                    )}
                                    {car.type === 'vertical' && (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-50">
                                            <div className="w-2/3 h-full border-x-2 border-white/30"></div>
                                        </div>
                                    )}
                                    {car.type === 'horizontal' && (
                                        <div className="w-full h-full flex items-center justify-center opacity-50">
                                            <span className="text-[10px] text-white font-bold">VVF</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CONTROLS */}
                <div className="mt-8 grid grid-cols-3 gap-2 w-[150px]">
                    <div></div>
                    <button 
                        onClick={() => moveCar('up')} 
                        className="w-12 h-12 bg-slate-200 rounded-full shadow-md active:bg-slate-300 flex items-center justify-center text-xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▲
                    </button>
                    <div></div>
                    <button 
                        onClick={() => moveCar('left')} 
                        className="w-12 h-12 bg-slate-200 rounded-full shadow-md active:bg-slate-300 flex items-center justify-center text-xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ◀
                    </button>
                    <div className="w-12 h-12 flex items-center justify-center">
                        <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
                    </div>
                    <button 
                        onClick={() => moveCar('right')} 
                        className="w-12 h-12 bg-slate-200 rounded-full shadow-md active:bg-slate-300 flex items-center justify-center text-xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▶
                    </button>
                    <div></div>
                    <button 
                        onClick={() => moveCar('down')} 
                        className="w-12 h-12 bg-slate-200 rounded-full shadow-md active:bg-slate-300 flex items-center justify-center text-xl font-black text-slate-700"
                        disabled={!selectedCar || isWon}
                    >
                        ▼
                    </button>
                    <div></div>
                </div>

                {isWon && (
                    <button 
                        onClick={nextLevel}
                        className="mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg animate-pulse"
                    >
                        Prossimo Livello →
                    </button>
                )}

                <p className="mt-6 text-xs text-slate-400 text-center max-w-xs">
                    Tocca un veicolo per selezionarlo, poi usa le frecce per spostarlo.
                </p>
            </main>
        </div>
    );
};

export default ParkingJam;
