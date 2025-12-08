
import React from 'react';

interface ChartData {
    name: string;
    value: number;
    icon?: string;
}

interface BarChartProps {
    data: ChartData[];
    format?: 'currency' | 'integer';
    barColor?: string; // Classe CSS per il colore della barra (es. 'bg-blue-500')
}

const BarChart: React.FC<BarChartProps> = ({ data, format = 'integer', barColor = 'bg-primary' }) => {
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
                    <div className="w-32 text-sm text-slate-600 truncate text-right flex items-center justify-end gap-2">
                        {item.icon && <span className="text-lg">{item.icon}</span>}
                        <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                        <div
                            className={`${barColor} h-full rounded-full flex items-center justify-end px-3 transition-all duration-700 ease-out relative`}
                            style={{ width: `${(item.value / maxValue) * 100}%`, minWidth: '2rem' }}
                        >
                            <span className="text-white font-bold text-xs">
                               {formatValue(item.value)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            {data.length === 0 && <p className="text-center text-slate-400 text-xs italic py-4">Nessun dato disponibile</p>}
        </div>
    );
};

export default BarChart;
