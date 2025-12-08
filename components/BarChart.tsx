
import React from 'react';

interface ChartData {
    name: string;
    value: number;
    icon?: string;
}

interface BarChartProps {
    data: ChartData[];
    format?: 'currency' | 'integer';
    barColor?: string; // Classe CSS per il colore della barra
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
                    {/* Nome esterno per leggibilità */}
                    <div className="w-28 text-xs font-bold text-slate-500 truncate text-right">
                        {item.name}
                    </div>
                    
                    {/* Barra */}
                    <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden relative">
                        <div
                            className={`${barColor} h-full rounded-full flex items-center justify-between px-2 transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max((item.value / maxValue) * 100, 10)}%` }} // Min width 10% per mostrare l'icona
                        >
                            {/* Icona interna a sinistra */}
                            <span className="text-base filter drop-shadow-sm select-none">
                                {item.icon || '📦'}
                            </span>
                            
                            {/* Valore interno a destra */}
                            <span className="text-white font-bold text-xs whitespace-nowrap drop-shadow-md">
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
