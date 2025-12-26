
import React, { useMemo, useState, useEffect } from 'react';

interface ChartPoint { label: string; value: number; isForecast?: boolean; }

interface Dataset {
    label: string;
    data: ChartPoint[];
    color: string;
}

interface LineChartProps { 
    data?: ChartPoint[]; 
    datasets?: Dataset[]; 
    height?: number; 
    color?: string;
    yAxisLabel?: string;
    xAxisLabel?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, datasets, height = 300, color = '#f97316', yAxisLabel, xAxisLabel }) => {
    
    const normalizedDatasets = useMemo(() => {
        if (datasets) return datasets;
        if (data) return [{ label: 'Dati', data: data, color: color }];
        return [];
    }, [data, datasets, color]);

    const maxValue = useMemo(() => {
        let max = 0;
        normalizedDatasets.forEach(ds => {
            ds.data.forEach(p => {
                if (p.value > max) max = p.value;
            });
        });
        // Aggiunge il 10% di margine superiore per evitare che la linea tocchi il bordo
        return (max || 10) * 1.1;
    }, [normalizedDatasets]);

    const paddingLeft = 50; 
    const paddingBottom = 40; 
    const paddingTop = 20;
    const paddingRight = 20;
    
    const width = 800;
    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    const labels = useMemo(() => {
        if(normalizedDatasets.length === 0) return [];
        const longest = normalizedDatasets.reduce((prev, current) => (prev.data.length > current.data.length) ? prev : current);
        return longest.data.map(d => d.label);
    }, [normalizedDatasets]);

    // Safety fix: If only 1 point, center it. If 0 points, doesn't matter (loop won't run).
    const getX = (index: number, totalPoints: number) => {
        if (totalPoints <= 1) return paddingLeft + chartWidth / 2;
        return paddingLeft + (index / (totalPoints - 1)) * chartWidth;
    };
    
    const getY = (value: number) => height - paddingBottom - ((value / maxValue) * chartHeight);

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

    const [drawProgress, setDrawProgress] = useState(0);
    useEffect(() => {
        setDrawProgress(0);
        const anim = requestAnimationFrame(() => setDrawProgress(1));
        return () => cancelAnimationFrame(anim);
    }, [normalizedDatasets]);

    return (
        <div className="w-full relative overflow-hidden select-none" style={{ height: `${height}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                
                {/* NEON GLOW FILTER */}
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

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

                {/* Axis Labels */}
                {yAxisLabel && (
                    <text 
                        x={15} 
                        y={height / 2} 
                        transform={`rotate(-90, 15, ${height/2})`} 
                        textAnchor="middle" 
                        className="text-[10px] fill-slate-400 font-bold uppercase tracking-wider"
                    >
                        {yAxisLabel}
                    </text>
                )}
                {xAxisLabel && (
                    <text 
                        x={width / 2} 
                        y={height - 5} 
                        textAnchor="middle" 
                        className="text-[10px] fill-slate-400 font-bold uppercase tracking-wider"
                    >
                        {xAxisLabel}
                    </text>
                )}

                {/* Datasets */}
                {normalizedDatasets.map((ds, dsIndex) => {
                    const points = ds.data.map((d, i) => ({ 
                        x: getX(i, ds.data.length), 
                        y: getY(d.value), 
                        val: d.value,
                        label: d.label
                    }));
                    
                    const pathD = getSmoothPath(points);
                    const pathLength = 2000; 

                    return (
                        <g key={ds.label}>
                            {/* The Line with Glow */}
                            {points.length > 1 && (
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
                                    filter="url(#glow)" 
                                />
                            )}

                            {/* Data Points (Invisible but Interactable) - Render also single points */}
                            {points.map((p, i) => (
                                <g key={i} className="group">
                                    {/* Visible Dot if single point or hover */}
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r={points.length === 1 ? "4" : "6"} 
                                        fill={points.length === 1 ? ds.color : "transparent"} 
                                        stroke="none" 
                                        className="cursor-pointer"
                                    />
                                    
                                    {/* Tooltip on Hover */}
                                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                        <rect x={p.x - 40} y={p.y - 50} width="80" height="40" rx="4" fill="rgba(255,255,255,0.95)" stroke="#e2e8f0" strokeWidth="1" className="shadow-lg" />
                                        <text x={p.x} y={p.y - 35} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="bold">
                                            {p.label}
                                        </text>
                                        <text x={p.x} y={p.y - 20} textAnchor="middle" fill={ds.color} fontSize="12" fontWeight="black">
                                            €{p.val.toFixed(2)}
                                        </text>
                                    </g>
                                </g>
                            ))}
                        </g>
                    );
                })}

                {/* X-Axis Labels */}
                {labels.map((label, i) => {
                    if (labels.length > 10 && i % Math.ceil(labels.length / 8) !== 0 && i !== labels.length - 1) return null;
                    const x = getX(i, labels.length);
                    return (
                        <text key={i} x={x} y={height - 20} textAnchor="middle" className="text-[9px] fill-slate-500 font-sans font-medium">
                            {label}
                        </text>
                    );
                })}

            </svg>
        </div>
    );
};
export default LineChart;
