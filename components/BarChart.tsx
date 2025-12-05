import React from 'react';

interface ChartData {
    name: string;
    value: number;
}

interface BarChartProps {
    data: ChartData[];
    format?: 'currency' | 'integer';
}

const BarChart: React.FC<BarChartProps> = ({ data, format = 'integer' }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);

    const formatValue = (value: number) => {
        if (format === 'currency') {
            return `€${value.toFixed(2)}`;
        }
        return Math.round(value).toString();
    };

    return (
        <div className="w-full space-y-3">
            {data.map((item, index) => (
                <div key={index} className="flex items-center gap-3 group">
                    <div className="w-28 text-sm text-slate-600 truncate text-right">{item.name}</div>
                    <div className="flex-1 bg-slate-200 rounded-full h-6">
                        <div
                            className="bg-primary h-6 rounded-full flex items-center justify-end px-2 transition-all duration-500 ease-out"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                        >
                            <span className="text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                               {formatValue(item.value)}
                            </span>
                        </div>
                    </div>
                     <div className="w-16 text-sm font-semibold text-slate-800 text-left">
                        {formatValue(item.value)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BarChart;
