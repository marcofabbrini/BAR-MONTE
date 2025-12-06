
import React from 'react';

interface ChartPoint {
    label: string;
    value: number;
}

interface LineChartProps {
    data: ChartPoint[];
    height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, height = 200 }) => {
    if (data.length < 2) return <div className="h-[200px] flex items-center justify-center text-slate-400">Dati insufficienti per il grafico (minimo 2 giorni)</div>;

    const maxValue = Math.max(...data.map(d => d.value)) * 1.1; // Add 10% headroom
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.value / maxValue) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full relative" style={{ height: `${height}px` }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300 pointer-events-none">
                <div className="border-b border-slate-100 w-full h-0 relative"><span className="absolute -top-3 right-0">€{maxValue.toFixed(0)}</span></div>
                <div className="border-b border-slate-100 w-full h-0 relative"><span className="absolute -top-3 right-0">€{(maxValue/2).toFixed(0)}</span></div>
                <div className="border-b border-slate-100 w-full h-0 relative"><span className="absolute -top-3 right-0">€0</span></div>
            </div>

            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Area Gradient */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Area under line */}
                <polygon 
                    points={`0,100 ${points} 100,100`} 
                    fill="url(#chartGradient)" 
                />

                {/* The Line */}
                <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Dots */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - (d.value / maxValue) * 100;
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="1.5"
                            fill="#fff"
                            stroke="#ea580c"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                            className="hover:r-4 transition-all"
                        >
                            <title>{d.label}: €{d.value.toFixed(2)}</title>
                        </circle>
                    );
                })}
            </svg>
            
            {/* X-Axis Labels */}
            <div className="absolute bottom-[-20px] left-0 w-full flex justify-between text-[10px] text-slate-500">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
            </div>
        </div>
    );
};

export default LineChart;
