
import React from 'react';

interface ChartPoint { label: string; value: number; }
interface LineChartProps { data: ChartPoint[]; height?: number; }

const LineChart: React.FC<LineChartProps> = ({ data, height = 300 }) => {
    if (data.length < 2) return <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">Dati insufficienti</div>;

    const maxValue = Math.max(...data.map(d => d.value)) * 1.1; // Add 10% headroom
    const padding = 40;
    const width = 800; // viewBox width
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    // Helper to calculate coords
    const getX = (index: number) => padding + (index / (data.length - 1)) * chartWidth;
    const getY = (value: number) => height - padding - (value / maxValue) * chartHeight;

    // Generate Points
    const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));

    // Bezier Curve Logic
    const svgPath = (points: {x:number, y:number}[], command: (point: {x:number, y:number}, i: number, a: {x:number, y:number}[]) => string) => {
        const d = points.reduce((acc, point, i, a) => i === 0
            ? `M ${point.x},${point.y}`
            : `${acc} ${command(point, i, a)}`
        , '');
        return d;
    }

    const lineCommand = (point: {x:number, y:number}, i: number, a: {x:number, y:number}[]) => {
        // Catmull-Rom to Bezier control points
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

    const pathD = svgPath(points, lineCommand);
    const fillD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

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

                {/* Area Sfumata */}
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={fillD} fill="url(#chartGradient)" stroke="none" />

                {/* Linea Curva */}
                <path d={pathD} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Punti */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#f97316" strokeWidth="2" />
                ))}

                {/* Assi X Labels */}
                {points.map((p, i) => {
                    // Mostra solo alcune date se sono troppe
                    const showLabel = data.length > 10 ? i % Math.ceil(data.length / 6) === 0 : true;
                    if(!showLabel) return null;
                    return (
                        <text key={i} x={p.x} y={height - 15} textAnchor="middle" className="text-[10px] fill-slate-500 font-sans">
                            {data[i].label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};
export default LineChart;
