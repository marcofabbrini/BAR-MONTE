
import React, { useMemo } from 'react';

interface ChartPoint { label: string; value: number; isForecast?: boolean; }
interface LineChartProps { data: ChartPoint[]; height?: number; }

const LineChart: React.FC<LineChartProps> = ({ data, height = 300 }) => {
    
    // Logica per estendere i dati ad almeno una settimana e creare previsioni
    const processedData = useMemo(() => {
        let chartData = [...data];
        
        // Se non ci sono dati, creiamo una settimana vuota
        if (chartData.length === 0) {
            const today = new Date();
            for(let i=6; i>=0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                chartData.push({ label: d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: 0 });
            }
        } 
        // Se ci sono pochi dati (meno di 7), estendiamo l'asse X nel passato
        else if (chartData.length < 7) {
            const firstDateStr = chartData[0].label; // Assumiamo formato DD/MM
            // Non possiamo parsare facilmente DD/MM senza anno, quindi usiamo un approccio fittizio per riempire
            // Se i dati reali sono pochi, aggiungiamo placeholder all'inizio per non "stirare"
            const missing = 7 - chartData.length;
            const prefix = Array.from({length: missing}).map((_, i) => ({
                label: '.', // Label vuota o placeholder
                value: 0
            }));
            chartData = [...prefix, ...chartData];
        }

        // GENERAZIONE PREVISIONE (FORECAST)
        // Semplice regressione lineare sugli ultimi punti per proiettare i prossimi 3 giorni
        if (data.length >= 2) {
            const lastValues = data.slice(-5).map(d => d.value); // Ultimi 5 valori reali
            const n = lastValues.length;
            // Calcolo pendenza media (molto semplificato)
            let slope = 0;
            if (n > 1) {
                slope = (lastValues[n-1] - lastValues[0]) / (n-1);
            }
            
            const lastRealPoint = chartData[chartData.length - 1];
            let lastValue = lastRealPoint.value;

            // Aggiungiamo 3 punti di previsione
            for(let i=1; i<=3; i++) {
                const nextVal = Math.max(0, lastValue + (slope * i)); // Non andare sotto zero
                chartData.push({
                    label: `+${i}g`, // Label previsione
                    value: nextVal,
                    isForecast: true
                });
            }
        }

        return chartData;
    }, [data]);

    const maxValue = Math.max(...processedData.map(d => d.value)) * 1.1 || 100; // Scala minima 100
    const padding = 40;
    const width = 800; // viewBox width
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    // Helper to calculate coords
    const getX = (index: number) => padding + (index / (processedData.length - 1)) * chartWidth;
    const getY = (value: number) => height - padding - (value / maxValue) * chartHeight;

    // Generate Points
    const allPoints = processedData.map((d, i) => ({ x: getX(i), y: getY(d.value), isForecast: d.isForecast, val: d.value, label: d.label }));
    
    // Separiamo i punti reali da quelli forecast
    // Troviamo l'indice dove inizia il forecast
    const firstForecastIndex = allPoints.findIndex(p => p.isForecast);
    const realPoints = firstForecastIndex === -1 ? allPoints : allPoints.slice(0, firstForecastIndex + 1); // +1 per collegare la linea
    const forecastPoints = firstForecastIndex === -1 ? [] : allPoints.slice(firstForecastIndex - 1); // -1 per collegare all'ultimo reale

    // Funzioni per disegnare curve
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
    
    // Area fill solo per dati reali
    const fillPath = realPoints.length > 0 
        ? `${realPath} L ${realPoints[realPoints.length - 1].x},${height - padding} L ${realPoints[0].x},${height - padding} Z` 
        : '';

    return (
        <div className="w-full relative overflow-hidden" style={{ height: `${height}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                {/* Griglia Y */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                    const yVal = getY(maxValue * p);
                    return (
                        <g key={i}>
                            <line x1={padding} y1={yVal} x2={width - padding} y2={yVal} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={padding - 5} y={yVal + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-sans">
                                €{(maxValue * p).toFixed(0)}
                            </text>
                        </g>
                    )
                })}

                {/* Area Sfumata (Solo Real Data) */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#chartGradient)" stroke="none" />

                {/* Linea Reale */}
                <path d={realPath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Linea Previsione (Grigio Tratteggiato) */}
                <path d={forecastPath} fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />

                {/* Punti */}
                {allPoints.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r={p.isForecast ? "2" : "3"} fill={p.isForecast ? "#cbd5e1" : "#fff"} stroke={p.isForecast ? "none" : "#f97316"} strokeWidth="2" />
                        
                        {/* Label Asse X */}
                        <text x={p.x} y={height - 15} textAnchor="middle" className={`text-[9px] font-sans ${p.isForecast ? 'fill-slate-300 italic' : 'fill-slate-500'}`}>
                            {p.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};
export default LineChart;
