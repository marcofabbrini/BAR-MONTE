
import React from 'react';

interface ChartPoint { label: string; value: number; }
interface LineChartProps { data: ChartPoint[]; height?: number; }

const LineChart: React.FC<LineChartProps> = ({ data, height = 200 }) => {
    if (data.length < 2) return <div className="h-[200px] flex items-center justify-center text-slate-400">Dati insufficienti</div>;
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.value / maxValue) * 100}`).join(' ');

    return (
        <div className="w-full relative" style={{ height: `${height}px` }}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <polyline fill="none" stroke="#f97316" strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="absolute bottom-[-20px] left-0 w-full flex justify-between text-[10px] text-slate-500">
                <span>{data[0].label}</span><span>{data[data.length - 1].label}</span>
            </div>
        </div>
    );
};
export default LineChart;
