
import React, { useMemo } from 'react';

interface ChartPoint { label: string; value: number; isForecast?: boolean; }
interface LineChartProps { 
    data: ChartPoint[]; 
    height?: number; 
    color?: string; // Hex color code preferred
}

const LineChart: React.FC<LineChartProps> = ({ data, height = 300, color = '#f97316' }) => {
    
    const strokeColor = color;

    const processedData = useMemo(() => {
        let chartData = [...data];
        
        // Fill empty if no data
        if (chartData.length === 0) {
            const today = new Date();
            for(let i=6; i>=0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                chartData.push({ label: d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: 0 });
            }
        } 
        
        // Generate Simple Forecast (Linear Projection)
        if (data.length >= 3) {
            const lastValues = data.slice(-3).map(d => d.value);
            const n = lastValues.length;
            // Average slope of last 3 points
            const slope = (lastValues[n-1] - lastValues[0]) / (n-1);
            
            const lastRealPoint = chartData[chartData.length - 1];
            let lastValue = lastRealPoint.value;

            for(let i=1; i<=2; i++) {
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

    // Calculate scaling
    const maxValue = Math.max(...processedData.map(d => d.value)) || 10;
    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 20;
    const paddingRight = 20;
    
    // ViewBox dimensions
    const width = 800;
    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    // Coordinate mapping functions
    const getX = (index: number) => paddingLeft + (index / (processedData.length - 1)) * chartWidth;
    // Ensure Y doesn't go below bottom line, using max value to scale
    const getY = (value: number) => height - paddingBottom - ((value / maxValue) * chartHeight);

    const allPoints = processedData.map((d, i) => ({ 
        x: getX(i), 
        y: getY(d.value), 
        isForecast: d.isForecast, 
        val: d.value, 
        label: d.label 
    }));
    
    // Split points into Real vs Forecast for different styling
    const firstForecastIndex = allPoints.findIndex(p => p.isForecast);
    const realPoints = firstForecastIndex === -1 ? allPoints : allPoints.slice(0, firstForecastIndex + 1);
    const forecastPoints = firstForecastIndex === -1 ? [] : allPoints.slice(firstForecastIndex - 1); // Start from last real point to connect

    // Linear Path Generator (L command) - accurate representation
    const generatePath = (points: {x:number, y:number}[]) => {
        if (points.length === 0) return '';
        return points.reduce((acc, point, i) => i === 0
            ? `M ${point.x},${point.y}`
            : `${acc} L ${point.x},${point.y}`
        , '');
    }

    const realPath = generatePath(realPoints);
    const forecastPath = generatePath(forecastPoints);
    
    // Fill Area Path (for gradient)
    const fillPath = realPoints.length > 0 
        ? `${realPath} L ${realPoints[realPoints.length - 1].x},${height - paddingBottom} L ${realPoints[0].x},${height - paddingBottom} Z` 
        : '';

    return (
        <div className="w-full relative overflow-hidden select-none" style={{ height: `${height}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                
                {/* Horizontal Grid Lines */}
                {[0, 0.5, 1].map((p, i) => {
                    const yVal = getY(maxValue * p);
                    return (
                        <g key={i}>
                            <line x1={paddingLeft} y1={yVal} x2={width - paddingRight} y2={yVal} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={paddingLeft - 8} y={yVal + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-sans font-medium">
                                {(maxValue * p).toFixed(0)}
                            </text>
                        </g>
                    )
                })}

                {/* Axes */}
                <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />
                <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#cbd5e1" strokeWidth="1" />

                <defs>
                    <linearGradient id={`chartGradient-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Filled Area */}
                <path d={fillPath} fill={`url(#chartGradient-${strokeColor.replace('#', '')})`} stroke="none" />

                {/* Real Data Line */}
                <path d={realPath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Forecast Line (Dashed) */}
                <path d={forecastPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />

                {/* Data Points */}
                {allPoints.map((p, i) => (
                    <g key={i} className="group">
                        <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={p.isForecast ? "2.5" : "3.5"} 
                            fill={p.isForecast ? "#cbd5e1" : "#fff"} 
                            stroke={p.isForecast ? "none" : strokeColor} 
                            strokeWidth="2" 
                            className="transition-all duration-200 group-hover:r-5"
                        />
                        
                        {/* Hover Value Label (or Always visible for sparse data) */}
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect x={p.x - 20} y={p.y - 25} width="40" height="18" rx="4" fill="#1e293b" />
                            <text x={p.x} y={p.y - 13} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{p.val.toFixed(0)}</text>
                        </g>

                        {/* X-Axis Labels (Skip some if too many) */}
                        {(allPoints.length <= 10 || i % Math.ceil(allPoints.length / 8) === 0 || i === allPoints.length -1) && (
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
