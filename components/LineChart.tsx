
import React, { useMemo } from 'react';

interface ChartPoint { label: string; value: number; isForecast?: boolean; }
interface LineChartProps { 
    data: ChartPoint[]; 
    height?: number; 
    color?: string; // Classe CSS tailwind per il colore principale (es. 'text-blue-500' o hex) o nome colore standard
}

const LineChart: React.FC<LineChartProps> = ({ data, height = 300, color = '#f97316' }) => {
    
    // Mappa colori se vengono passate classi tailwind o nomi comuni
    const strokeColor = useMemo(() => {
        if (color.startsWith('#')) return color;
        if (color.includes('green')) return '#22c55e';
        if (color.includes('blue')) return '#3b82f6';
        if (color.includes('cyan')) return '#06b6d4';
        if (color.includes('red')) return '#ef4444';
        if (color.includes('purple')) return '#a855f7';
        return '#f97316'; // Default Orange
    }, [color]);

    const processedData = useMemo(() => {
        let chartData = [...data];
        
        if (chartData.length === 0) {
            const today = new Date();
            for(let i=6; i>=0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                chartData.push({ label: d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: 0 });
            }
        } 
        else if (chartData.length < 7) {
            const missing = 7 - chartData.length;
            const prefix = Array.from({length: missing}).map((_, i) => ({
                label: '',
                value: 0
            }));
            chartData = [...prefix, ...chartData];
        }

        if (data.length >= 2) {
            const lastValues = data.slice(-5).map(d => d.value);
            const n = lastValues.length;
            let slope = 0;
            if (n > 1) {
                slope = (lastValues[n-1] - lastValues[0]) / (n-1);
            }
            
            const lastRealPoint = chartData[chartData.length - 1];
            let lastValue = lastRealPoint.value;

            for(let i=1; i<=3; i++) {
                const nextVal = Math.max(0, lastValue + (slope * i));
                chartData.push({
                    label: `+${i}g`,
                    value: nextVal,
                    isForecast: true
                });
            }
        }

        return chartData;
    }, [data]);

    const maxValue = Math.max(...processedData.map(d => d.value)) * 1.1 || 10;
    const paddingLeft = 50;
    const paddingBottom = 30;
    const paddingTop = 20;
    const paddingRight = 20;
    
    const width = 800;
    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    const getX = (index: number) => paddingLeft + (index / (processedData.length - 1)) * chartWidth;
    const getY = (value: number) => height - paddingBottom - (value / maxValue) * chartHeight;

    const allPoints = processedData.map((d, i) => ({ x: getX(i), y: getY(d.value), isForecast: d.isForecast, val: d.value, label: d.label }));
    
    const firstForecastIndex = allPoints.findIndex(p => p.isForecast);
    const realPoints = firstForecastIndex === -1 ? allPoints : allPoints.slice(0, firstForecastIndex + 1);
    const forecastPoints = firstForecastIndex === -1 ? [] : allPoints.slice(firstForecastIndex - 1);

    const lineCommand = (point: {x:number, y:number}, i: number, a: {x:number, y:number}[]) => {
        const cps = controlPoint(a[i - 1], a[i - 2], point);
        const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
        return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point.x},${point.y}`;
    }

    const controlPoint = (current: any, previous: any, next: any, reverse?: boolean) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.2;
        const o = line(p, n);
        const angle = o.angle + (reverse ? Math.PI : 0);
        const length = o.length * smoothing;
        const x = current.x + Math.cos(angle) * length;
        const y = current.y + Math.sin(angle) * length;
        return [x, y];
    }

    const line = (pointA: any, pointB: any) => {
        const lengthX = pointB.x - pointA.x;
        const lengthY = pointB.y - pointA.y;
        return {
            length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
            angle: Math.atan2(lengthY, lengthX)
        };
    }

    const svgPath = (points: {x:number, y:number}[]) => {
        if (points.length === 0) return '';
        return points.reduce((acc, point, i, a) => i === 0
            ? `M ${point.x},${point.y}`
            : `${acc} ${lineCommand(point, i, a)}`
        , '');
    }

    const realPath = svgPath(realPoints);
    const forecastPath = svgPath(forecastPoints);
    
    const fillPath = realPoints.length > 0 
        ? `${realPath} L ${realPoints[realPoints.length - 1].x},${height - paddingBottom} L ${realPoints[0].x},${height - paddingBottom} Z` 
        : '';

    return (
        <div className="w-full relative overflow-hidden" style={{ height: `${height}px` }}>
            <style>{`
                @keyframes draw {
                    from { stroke-dashoffset: 2000; }
                    to { stroke-dashoffset: 0; }
                }
                .path-animate {
                    stroke-dasharray: 2000;
                    stroke-dashoffset: 0;
                    animation: draw 2s ease-out forwards;
                }
                @keyframes fadeArea {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .area-animate {
                    animation: fadeArea 2s ease-out forwards;
                }
            `}</style>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                    const yVal = getY(maxValue * p);
                    return (
                        <g key={i}>
                            <line x1={paddingLeft} y1={yVal} x2={width - paddingRight} y2={yVal} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={paddingLeft - 8} y={yVal + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-sans font-medium">
                                {(maxValue * p).toFixed(0)}
                            </text>
                        </g>
                    )
                })}

                <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />
                <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />

                <defs>
                    <linearGradient id={`chartGradient-${strokeColor}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={fillPath} fill={`url(#chartGradient-${strokeColor})`} stroke="none" className="area-animate" />

                <path d={realPath} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="path-animate" />
                
                <path d={forecastPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" className="path-animate" />

                {allPoints.map((p, i) => (
                    <g key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <circle cx={p.x} cy={p.y} r={p.isForecast ? "2" : "3"} fill={p.isForecast ? "#cbd5e1" : "#fff"} stroke={p.isForecast ? "none" : strokeColor} strokeWidth="2" />
                        
                        {(i % Math.ceil(allPoints.length / 8) === 0 || i === allPoints.length -1) && (
                            <text x={p.x} y={height - 10} textAnchor="middle" className={`text-[9px] font-sans ${p.isForecast ? 'fill-slate-300 italic' : 'fill-slate-500 font-bold'}`}>
                                {p.label}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};
export default LineChart;
