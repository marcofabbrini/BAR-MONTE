
import React, { useMemo, useState, useEffect } from 'react';

interface ChartPoint { label: string; value: number; isForecast?: boolean; }

interface Dataset {
    label: string;
    data: ChartPoint[];
    color: string;
}

interface LineChartProps { 
    data?: ChartPoint[]; // Backward compatibility
    datasets?: Dataset[]; // New multi-line support
    height?: number; 
    color?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, datasets, height = 300, color = '#f97316' }) => {
    
    // Normalize input: use datasets if provided, otherwise wrap single data
    const normalizedDatasets = useMemo(() => {
        if (datasets) return datasets;
        if (data) return [{ label: 'Dati', data: data, color: color }];
        return [];
    }, [data, datasets, color]);

    // Calculate Global Max Value for Y-Axis scaling
    const maxValue = useMemo(() => {
        let max = 0;
        normalizedDatasets.forEach(ds => {
            ds.data.forEach(p => {
                if (p.value > max) max = p.value;
            });
        });
        return max || 10; // Avoid division by zero
    }, [normalizedDatasets]);

    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 20;
    const paddingRight = 20;
    
    const width = 800;
    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    // Determine Labels (X-Axis) - Assume all datasets share roughly same timeframe or pick the first one
    const labels = useMemo(() => {
        if(normalizedDatasets.length === 0) return [];
        // Use the dataset with most points to define X axis labels
        const longest = normalizedDatasets.reduce((prev, current) => (prev.data.length > current.data.length) ? prev : current);
        return longest.data.map(d => d.label);
    }, [normalizedDatasets]);

    const getX = (index: number, totalPoints: number) => paddingLeft + (index / (totalPoints - 1)) * chartWidth;
    const getY = (value: number) => height - paddingBottom - ((value / maxValue) * chartHeight);

    // SMOOTH CURVE FUNCTION (Catmull-Rom or Cubic Bezier)
    const getSmoothPath = (points: {x:number, y:number}[]) => {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i !== points.length - 2 ? points[i + 2] : p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    };

    // Animation Effect
    const [drawProgress, setDrawProgress] = useState(0);
    useEffect(() => {
        setDrawProgress(0);
        const anim = requestAnimationFrame(() => setDrawProgress(1));
        return () => cancelAnimationFrame(anim);
    }, [normalizedDatasets]); // Reset animation when data changes

    return (
        <div className="w-full relative overflow-hidden select-none" style={{ height: `${height}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
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

                {/* Datasets */}
                {normalizedDatasets.map((ds, dsIndex) => {
                    const points = ds.data.map((d, i) => ({ 
                        x: getX(i, labels.length || ds.data.length), 
                        y: getY(d.value), 
                        val: d.value,
                        label: d.label
                    }));
                    
                    const pathD = getSmoothPath(points);
                    
                    // Simple path length animation
                    const pathLength = 2000; 

                    return (
                        <g key={ds.label}>
                            {/* The Line */}
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke={ds.color} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeDasharray={pathLength}
                                strokeDashoffset={pathLength * (1 - drawProgress)}
                                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                            />

                            {/* Data Points (Dots) */}
                            {points.map((p, i) => (
                                <g key={i} className="group">
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r="4" 
                                        fill="white" 
                                        stroke={ds.color} 
                                        strokeWidth="2" 
                                        className="transition-all duration-200 group-hover:r-6 cursor-pointer"
                                        style={{ opacity: drawProgress === 1 ? 1 : 0, transition: `opacity 0.3s ${i * 0.05}s` }}
                                    />
                                    
                                    {/* Tooltip */}
                                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                        <rect x={p.x - 30} y={p.y - 35} width="60" height="24" rx="4" fill="rgba(0,0,0,0.8)" />
                                        <text x={p.x} y={p.y - 19} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                                            {ds.label}: {p.val.toFixed(0)}
                                        </text>
                                    </g>
                                </g>
                            ))}
                        </g>
                    );
                })}

                {/* X-Axis Labels */}
                {labels.map((label, i) => {
                    // Show sparse labels if too many
                    if (labels.length > 10 && i % Math.ceil(labels.length / 8) !== 0 && i !== labels.length - 1) return null;
                    const x = getX(i, labels.length);
                    return (
                        <text key={i} x={x} y={height - 10} textAnchor="middle" className="text-[9px] fill-slate-500 font-sans font-medium">
                            {label}
                        </text>
                    );
                })}

            </svg>
        </div>
    );
};
export default LineChart;
