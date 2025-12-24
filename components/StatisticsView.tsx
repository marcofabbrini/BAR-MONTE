
import React, { useMemo } from 'react';
import { Order, Product, StaffMember, Shift, GeneralSettings, TombolaConfig, AnalottoConfig, AttendanceRecord } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { LogoIcon, DropletIcon, LayersIcon, ChartBarIcon, GamepadIcon } from './Icons';

interface StatisticsViewProps {
    filteredOrders: Order[];
    allProducts: Product[];
    allStaff: StaffMember[];
    filters: { startDate: string; endDate: string; selectedShift: Shift | 'all'; selectedStaffId: string; selectedProductId: string; };
    onSetFilters: { setStartDate: (d: string) => void; setEndDate: (d: string) => void; setSelectedShift: (s: Shift | 'all') => void; setSelectedStaffId: (id: string) => void; setSelectedProductId: (id: string) => void; };
    generalSettings?: GeneralSettings;
    tombolaConfig?: TombolaConfig;
    analottoConfig?: AnalottoConfig;
    attendanceRecords?: AttendanceRecord[];
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ filteredOrders, allProducts, allStaff, filters, onSetFilters, generalSettings, tombolaConfig, analottoConfig, attendanceRecords }) => {
    const { startDate, endDate, selectedShift, selectedStaffId, selectedProductId } = filters;
    const { setStartDate, setEndDate, setSelectedShift, setSelectedStaffId, setSelectedProductId } = onSetFilters;

    const activeOrders = useMemo(() => filteredOrders.filter(o => !o.isDeleted), [filteredOrders]);
    const totalSales = useMemo(() => activeOrders.reduce((sum, order) => sum + order.total, 0), [activeOrders]);

    // --- NUOVA LOGICA CALCOLO ACQUA (Basata ESCLUSIVAMENTE sulle Presenze) ---
    const waterStatsFromAttendance = useMemo(() => {
        const stats = {
            total: { count: 0, revenue: 0 },
            a: { count: 0, revenue: 0 },
            b: { count: 0, revenue: 0 },
            c: { count: 0, revenue: 0 },
            d: { count: 0, revenue: 0 },
        };
        
        const price = generalSettings?.waterQuotaPrice || 0;
        
        if (!attendanceRecords) return stats;

        attendanceRecords.forEach(record => {
            // Filtro Data
            const recDate = new Date(record.date).toISOString().split('T')[0];
            const start = startDate ? new Date(startDate).toISOString().split('T')[0] : '0000-00-00';
            const end = endDate ? new Date(endDate).toISOString().split('T')[0] : '9999-99-99';
            if (recDate < start || recDate > end) return;

            // Determina il turno dal record (es. "TA" -> "a") o dallo staff
            const recordShift = record.tillId.replace('T', '').toLowerCase() as 'a'|'b'|'c'|'d';

            // Itera su tutti i membri dello staff per verificare la presenza in questo record
            allStaff.forEach(member => {
                // Salta utenti "Cassa"
                if(member.name.toLowerCase().includes('cassa')) return;

                let isPresent = false;
                
                // Controlla dettagli se esistono
                if (record.attendanceDetails && record.attendanceDetails[member.id]) {
                    const status = record.attendanceDetails[member.id];
                    // Paga solo se Presente o Sostituzione
                    if (status === 'present' || status === 'substitution') isPresent = true;
                } else if (record.presentStaffIds.includes(member.id)) {
                    // Fallback legacy
                    isPresent = true;
                }

                if (isPresent) {
                    const memberShift = member.shift; // Turno di appartenenza del membro
                    
                    stats.total.count++;
                    stats.total.revenue += price;

                    if (stats[memberShift]) {
                        stats[memberShift].count++;
                        stats[memberShift].revenue += price;
                    }
                }
            });
        });

        return stats;
    }, [attendanceRecords, allStaff, generalSettings, startDate, endDate]);

    const currentJackpotTotal = useMemo(() => {
        const t = tombolaConfig?.jackpot || 0;
        const a = analottoConfig?.jackpot || 0;
        return t + a;
    }, [tombolaConfig, analottoConfig]);

    const salesByStaff = useMemo(() => {
        const staffSales: { [key: string]: number } = {};
        activeOrders.forEach(o => { staffSales[o.staffName || 'Sconosciuto'] = (staffSales[o.staffName || 'Sconosciuto'] || 0) + o.total; });
        return Object.entries(staffSales)
            .map(([name, value]) => {
                const member = allStaff.find(s => s.name === name);
                return { name, value, icon: member?.icon || '👤' };
            })
            .sort((a, b) => b.value - a.value);
    }, [activeOrders, allStaff]);

    const salesByProduct = useMemo(() => {
        const prodSales: { [key: string]: { name: string, value: number, icon: string } } = {};
        activeOrders.forEach(o => o.items.forEach(i => {
            if (!prodSales[i.product.id]) {
                const prod = allProducts.find(p => p.id === i.product.id);
                prodSales[i.product.id] = { name: i.product.name, value: 0, icon: prod?.icon || '📦' };
            }
            prodSales[i.product.id].value += i.quantity;
        }));
        return Object.values(prodSales).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [activeOrders, allProducts]);

    const categoryVolumes = useMemo(() => {
        const catVols: { [key: string]: number } = {};
        activeOrders.forEach(o => o.items.forEach(i => {
            const cat = i.product.category || 'Altro';
            catVols[cat] = (catVols[cat] || 0) + i.quantity;
        }));
        return Object.entries(catVols).map(([name, value]) => ({ name, value, icon: '' })).sort((a,b) => b.value - a.value);
    }, [activeOrders]);

    // Data for Pie Chart (Revenue by Shift)
    const revenueByShift = useMemo(() => {
        const data = { A: 0, B: 0, C: 0, D: 0 };
        activeOrders.forEach(o => {
            const staffMember = allStaff.find(s => s.id === o.staffId);
            if (staffMember && staffMember.shift) {
                const shiftKey = staffMember.shift.toUpperCase() as keyof typeof data;
                if(data[shiftKey] !== undefined) {
                    data[shiftKey] += o.total;
                }
            }
        });
        return [
            { label: 'Turno A', value: data.A, color: '#ef4444' },
            { label: 'Turno B', value: data.B, color: '#3b82f6' },
            { label: 'Turno C', value: data.C, color: '#22c55e' },
            { label: 'Turno D', value: data.D, color: '#eab308' },
        ].filter(d => d.value > 0);
    }, [activeOrders, allStaff]);

    // --- MULTI-LINE TREND LOGIC ---
    const multiLineShiftTrend = useMemo(() => {
        const dailyTotals: Record<string, {A: number, B: number, C: number, D: number}> = {};
        
        // 1. Riempi date (sparse)
        activeOrders.forEach(o => {
            const dateKey = new Date(o.timestamp).toISOString().split('T')[0];
            if (!dailyTotals[dateKey]) dailyTotals[dateKey] = { A: 0, B: 0, C: 0, D: 0 };
            
            const member = allStaff.find(s => s.id === o.staffId);
            if (member && member.shift) {
                const s = member.shift.toUpperCase() as 'A'|'B'|'C'|'D';
                dailyTotals[dateKey][s] += o.total;
            }
        });

        // 2. Sort dates
        const sortedDates = Object.keys(dailyTotals).sort();
        
        // 3. Create datasets
        const datasetA = sortedDates.map(d => ({ label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: dailyTotals[d].A }));
        const datasetB = sortedDates.map(d => ({ label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: dailyTotals[d].B }));
        const datasetC = sortedDates.map(d => ({ label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: dailyTotals[d].C }));
        const datasetD = sortedDates.map(d => ({ label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value: dailyTotals[d].D }));

        return [
            { label: 'Turno A', data: datasetA, color: '#ef4444' },
            { label: 'Turno B', data: datasetB, color: '#3b82f6' },
            { label: 'Turno C', data: datasetC, color: '#22c55e' },
            { label: 'Turno D', data: datasetD, color: '#eab308' },
        ];
    }, [activeOrders, allStaff]);

    const handlePrintPdf = () => window.print();

    const setDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const end = today.toISOString().split('T')[0];
        let start = '';
        if (range === 'today') start = end;
        else if (range === 'week') { const day = today.getDay() || 7; if(day!==1) today.setHours(-24*(day-1)); start = today.toISOString().split('T')[0]; }
        else if (range === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        else { start = ''; setEndDate(''); }
        setStartDate(start);
        if(range !== 'all') setEndDate(end);
    };

    // Standard 2D Pie Chart
    const PieChart2D = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
        const total = data.reduce((acc, d) => acc + d.value, 0);
        let currentAngle = 0;
        const gradientString = data.map(d => {
            const deg = (d.value / total) * 360;
            const str = `${d.color} ${currentAngle}deg ${currentAngle + deg}deg`;
            currentAngle += deg;
            return str;
        }).join(', ');

        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div 
                    className="w-32 h-32 rounded-full relative shadow-sm border border-slate-100"
                    style={{
                        background: `conic-gradient(${gradientString})`
                    }}
                ></div>
                
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1">
                    {data.map(d => (
                        <div key={d.label} className="flex items-center gap-1.5 text-[10px]">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <span className="font-medium text-slate-500">{d.label}</span>
                            <span className="font-bold text-slate-700">€{d.value.toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="hidden print:block mb-4 text-center border-b pb-2">
                <h1 className="text-xl font-bold">Report Bar VVF</h1>
                <p className="text-slate-500 text-xs">{startDate || 'Inizio'} - {endDate || 'Oggi'}</p>
            </div>

            {/* FILTRI COMPATTI */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden">
                <div className="flex justify-between items-center mb-2">
                     <h2 className="text-lg font-bold text-slate-800">Filtri</h2>
                     <div className="flex gap-1">
                        {['today','week','month','all'].map((r: any) => (
                            <button key={r} onClick={() => setDateRange(r)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">{r}</button>
                        ))}
                     </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-1 rounded text-xs" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-1 rounded text-xs" />
                    <select value={selectedShift} onChange={e => setSelectedShift(e.target.value as any)} className="w-full border p-1 rounded text-xs"><option value="all">Turni: Tutti</option><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select>
                    <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full border p-1 rounded text-xs"><option value="all">Staff: Tutti</option>{allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border p-1 rounded text-xs"><option value="all">Prod: Tutti</option>{allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
            </div>

            {/* TOP ROW: GRAPH AND KPIS SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* 1. PIE CHART (Left Side) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <h3 className="text-center font-bold text-slate-700 uppercase text-xs tracking-widest mb-2">Incassi per Turno</h3>
                    {revenueByShift.length > 0 ? <PieChart2D data={revenueByShift} /> : <p className="text-center text-xs text-slate-400 py-4">Nessun dato</p>}
                </div>

                {/* 2. KPI CARDS (Right Side - Spanning 2 cols) */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex flex-col justify-center">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <ChartBarIcon className="h-3 w-3"/> Incasso Bar
                        </h2>
                        <h2 className="text-3xl font-black text-slate-800">€{totalSales.toFixed(2)}</h2>
                        <p className="text-xs text-slate-400">Totale vendite periodo</p>
                    </div>

                    <div className="bg-white border-l-4 border-purple-500 p-4 rounded-xl shadow-sm flex flex-col justify-center">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <GamepadIcon className="h-3 w-3"/> Montepremi Attivi
                        </h2>
                        <h2 className="text-3xl font-black text-slate-800">€{currentJackpotTotal.toFixed(2)}</h2>
                        <p className="text-xs text-slate-400">Tombola + Analotto</p>
                    </div>
                </div>
            </div>

            {/* WATER DETAILED SECTION (Corrected Logic) */}
            <div className="bg-blue-50/50 p-4 rounded-xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                        <DropletIcon className="h-4 w-4"/> Quote Acqua (da Registro Presenze)
                    </h3>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                        Prezzo: €{(generalSettings?.waterQuotaPrice || 0).toFixed(2)}
                    </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* TOTAL */}
                    <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">TOTALE PRESENZE</span>
                        <span className="text-2xl font-black text-blue-600">{waterStatsFromAttendance.total.count}</span>
                        <span className="text-xs font-bold text-slate-600">€{waterStatsFromAttendance.total.revenue.toFixed(2)}</span>
                    </div>
                    {/* A */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-red-400 uppercase">Turno A</span>
                        <span className="text-xl font-black text-slate-700">{waterStatsFromAttendance.a.count}</span>
                        <span className="text-[10px] text-slate-500">€{waterStatsFromAttendance.a.revenue.toFixed(2)}</span>
                    </div>
                    {/* B */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Turno B</span>
                        <span className="text-xl font-black text-slate-700">{waterStatsFromAttendance.b.count}</span>
                        <span className="text-[10px] text-slate-500">€{waterStatsFromAttendance.b.revenue.toFixed(2)}</span>
                    </div>
                    {/* C */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-green-400 uppercase">Turno C</span>
                        <span className="text-xl font-black text-slate-700">{waterStatsFromAttendance.c.count}</span>
                        <span className="text-[10px] text-slate-500">€{waterStatsFromAttendance.c.revenue.toFixed(2)}</span>
                    </div>
                    {/* D */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-yellow-500 uppercase">Turno D</span>
                        <span className="text-xl font-black text-slate-700">{waterStatsFromAttendance.d.count}</span>
                        <span className="text-[10px] text-slate-500">€{waterStatsFromAttendance.d.revenue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* GRAFICI TREND */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                 <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4 text-orange-500"/> Andamento Incassi per Turno (€)
                 </h3>
                 <div className="h-[300px] w-full">
                     {/* Passiamo i dataset multipli al LineChart aggiornato */}
                     <LineChart datasets={multiLineShiftTrend} height={300} />
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold mb-2 text-slate-700 flex items-center gap-2">
                        <LayersIcon className="h-4 w-4 text-purple-500"/> Categorie
                    </h3>
                    <BarChart data={categoryVolumes.slice(0, 6)} format="integer" barColor="bg-purple-500" />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold mb-2 text-slate-700">Top Prodotti</h3>
                    <BarChart data={salesByProduct} format="integer" barColor="bg-orange-500" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold mb-2 text-slate-700">Classifica Staff (€)</h3>
                <BarChart data={salesByStaff} format="currency" barColor="bg-blue-600" />
            </div>

             <div className="text-center py-2 print:hidden">
                <button onClick={handlePrintPdf} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 text-xs shadow-md">
                    Stampa PDF
                </button>
            </div>
        </div>
    );
};
export default StatisticsView;
