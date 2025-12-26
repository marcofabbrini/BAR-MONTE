
import React, { useMemo, useState } from 'react';
import { Order, Product, StaffMember, Shift, GeneralSettings, TombolaConfig, AnalottoConfig, AttendanceRecord } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { LogoIcon, DropletIcon, LayersIcon, ChartBarIcon, GamepadIcon, FilterIcon, BanknoteIcon } from './Icons';

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

    // LOCAL STATES FOR CHART FILTERS (Multi-select)
    const [shiftRevenueFilter, setShiftRevenueFilter] = useState<string[]>(['A', 'B', 'C', 'D']);

    const activeOrders = useMemo(() => filteredOrders.filter(o => !o.isDeleted), [filteredOrders]);
    const totalSales = useMemo(() => activeOrders.reduce((sum, order) => sum + order.total, 0), [activeOrders]);

    // Helper per toggle filtri multipli
    const toggleChartFilter = (currentFilters: string[], setFilters: (f: string[]) => void, value: string) => {
        if (value === 'all') {
            setFilters(['A', 'B', 'C', 'D']);
            return;
        }
        
        let newFilters = [...currentFilters];
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }
        
        if (newFilters.length === 0) newFilters = ['A', 'B', 'C', 'D']; // Fallback a tutti se vuoto
        setFilters(newFilters);
    };

    // Helper per calcolare la Data Operativa (Turno Notturno accorpato al giorno di inizio)
    // Se un ordine è fatto tra le 00:00 e le 08:00, conta come il giorno prima.
    const getOperationalDate = (timestamp: string) => {
        const d = new Date(timestamp);
        if (d.getHours() < 8) {
            d.setDate(d.getDate() - 1);
        }
        return d.toISOString().split('T')[0];
    };

    // CALCOLO RIEPILOGO QUOTE ACQUA (FILTERED) - Mantenuto solo per il box KPI in alto
    const waterSummary = useMemo(() => {
        if (!attendanceRecords) return { totalValue: 0, totalCount: 0 };
        const unitPrice = generalSettings?.waterQuotaPrice || 0;
        let totalCount = 0;

        attendanceRecords.forEach(record => {
            const recDate = new Date(record.date).toISOString().split('T')[0];
            const start = startDate ? new Date(startDate).toISOString().split('T')[0] : '0000-00-00';
            const end = endDate ? new Date(endDate).toISOString().split('T')[0] : '9999-99-99';
            
            // Filtro Data
            if (recDate < start || recDate > end) return;

            // Filtro Turno
            const shift = record.tillId.replace('T', '').toLowerCase();
            if (selectedShift !== 'all' && shift !== selectedShift) return;

            const idsToCheck = record.attendanceDetails 
                ? Object.keys(record.attendanceDetails) 
                : record.presentStaffIds;

            idsToCheck.forEach(id => {
                // Filtro Staff
                if (selectedStaffId !== 'all' && id !== selectedStaffId) return;
                
                // Cassa non paga
                if (id.includes('Cassa') || id.includes('cassa')) return;

                let isPaying = false;
                if (record.attendanceDetails && record.attendanceDetails[id]) {
                    const status = record.attendanceDetails[id];
                    // Pay statuses: P, S, S1, S2, S3
                    if (['present', 'substitution', 'sub1', 'sub2', 'sub3'].includes(status as string)) {
                        isPaying = true;
                    }
                } else if (record.presentStaffIds.includes(id)) {
                    isPaying = true; // Legacy fallback
                }

                if (isPaying) {
                    totalCount++;
                }
            });
        });

        return { totalCount, totalValue: totalCount * unitPrice };
    }, [attendanceRecords, generalSettings, startDate, endDate, selectedShift, selectedStaffId]);

    // 1. DATA FOR SHIFT REVENUE CHART (Renamed logic order)
    const shiftRevenueData = useMemo(() => {
        const dailyTotals: Record<string, {A: number, B: number, C: number, D: number}> = {};
        
        activeOrders.forEach(o => {
            // USIAMO LA DATA OPERATIVA (Accorpa turno notturno)
            const dateKey = getOperationalDate(o.timestamp);
            
            if (!dailyTotals[dateKey]) dailyTotals[dateKey] = { A: 0, B: 0, C: 0, D: 0 };
            
            const member = allStaff.find(s => s.id === o.staffId);
            if (member && member.shift) {
                const s = member.shift.toUpperCase() as 'A'|'B'|'C'|'D';
                dailyTotals[dateKey][s] += o.total;
            }
        });

        const sortedDates = Object.keys(dailyTotals).sort();
        const colors = { A: '#ef4444', B: '#3b82f6', C: '#22c55e', D: '#eab308' };

        const allDatasets = ['A', 'B', 'C', 'D'].map(shift => ({
            label: `Turno ${shift}`,
            data: sortedDates.map(d => ({ 
                label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), 
                value: dailyTotals[d][shift as 'A'|'B'|'C'|'D'] 
            })).filter(p => p.value > 0.01), // STRICT FILTER: Rimuove i punti a zero
            color: colors[shift as keyof typeof colors]
        }));

        // Filter based on multi-selection
        return allDatasets.filter(ds => shiftRevenueFilter.some(f => ds.label.includes(f)));
    }, [activeOrders, allStaff, shiftRevenueFilter]);


    // 2. DATA FOR TOTAL REVENUE CHART
    const totalRevenueTrend = useMemo(() => {
        const dailyTotals: Record<string, number> = {};
        activeOrders.forEach(o => {
            // USIAMO LA DATA OPERATIVA (Accorpa turno notturno)
            const dateKey = getOperationalDate(o.timestamp);
            dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + o.total;
        });

        const sortedDates = Object.keys(dailyTotals).sort();
        
        return [{
            label: 'Incasso Totale',
            data: sortedDates.map(d => ({
                label: new Date(d).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}),
                value: dailyTotals[d]
            })).filter(p => p.value > 0.01), // STRICT FILTER: Rimuove i punti a zero
            color: '#f59e0b' // Amber/Gold
        }];
    }, [activeOrders]);


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

    const ChartFilterButtons = ({ current, setFilter }: { current: string[], setFilter: (val: string) => void }) => (
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${current.length === 4 ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Tutti
            </button>
            {['A', 'B', 'C', 'D'].map(v => {
                const isActive = current.includes(v);
                return (
                    <button
                        key={v}
                        onClick={() => setFilter(v)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isActive ? 'bg-white shadow text-slate-800 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {v}
                    </button>
                )
            })}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="hidden print:block mb-4 text-center border-b pb-2">
                <h1 className="text-xl font-bold">Report Bar VVF</h1>
                <p className="text-slate-500 text-xs">{startDate || 'Inizio'} - {endDate || 'Oggi'}</p>
            </div>

            {/* FILTRI COMPATTI */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden">
                <div className="flex justify-between items-center mb-2">
                     <h2 className="text-lg font-bold text-slate-800">Filtri Globali</h2>
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

            {/* TOP KPI: WATER QUOTA SUMMARY (Informazione mantenuta, ma grafico rimosso) */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md p-4 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest opacity-90 flex items-center gap-2 mb-1">
                        <DropletIcon className="h-4 w-4"/> Riepilogo Acqua (Periodo Selezionato)
                    </h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black">€{waterSummary.totalValue.toFixed(2)}</span>
                        <span className="text-sm font-medium opacity-80">({waterSummary.totalCount} quote)</span>
                    </div>
                </div>
                <div className="relative z-10 mt-2 md:mt-0 text-right">
                    <p className="text-[10px] font-bold opacity-75 uppercase">Filtri Attivi</p>
                    <p className="text-xs font-bold">{selectedShift === 'all' ? 'Tutti i Turni' : `Turno ${selectedShift.toUpperCase()}`}</p>
                </div>
                {/* Background Decor */}
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                    <DropletIcon className="h-32 w-32" />
                </div>
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                    <h3 className="text-center font-bold text-slate-700 uppercase text-xs tracking-widest mb-2">Incassi per Turno</h3>
                    {revenueByShift.length > 0 ? <PieChart2D data={revenueByShift} /> : <p className="text-center text-xs text-slate-400 py-4">Nessun dato</p>}
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex flex-col justify-center">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1"><ChartBarIcon className="h-3 w-3"/> Incasso Bar</h2>
                        <h2 className="text-3xl font-black text-slate-800">€{totalSales.toFixed(2)}</h2>
                        <p className="text-xs text-slate-400">Totale vendite periodo</p>
                    </div>
                    <div className="bg-white border-l-4 border-purple-500 p-4 rounded-xl shadow-sm flex flex-col justify-center">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1"><GamepadIcon className="h-3 w-3"/> Montepremi Attivi</h2>
                        <h2 className="text-3xl font-black text-slate-800">€{currentJackpotTotal.toFixed(2)}</h2>
                        <p className="text-xs text-slate-400">Tombola + Analotto</p>
                    </div>
                </div>
            </div>

            {/* --- GRAFICI DETTAGLIATI --- */}

            {/* 1. ANDAMENTO INCASSI PER TURNO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        <ChartBarIcon className="h-6 w-6 text-orange-500"/>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Trend Incassi Turni</h3>
                            <p className="text-[10px] text-slate-400">Andamento vendite per squadra (giorni di riposo nascosti, turni notturni accorpati)</p>
                        </div>
                    </div>
                    <ChartFilterButtons 
                        current={shiftRevenueFilter} 
                        setFilter={(v) => toggleChartFilter(shiftRevenueFilter, setShiftRevenueFilter, v)} 
                    />
                </div>
                <div className="h-[300px] w-full">
                    <LineChart 
                        datasets={shiftRevenueData} 
                        height={300}
                        yAxisLabel="Incasso (€)"
                        xAxisLabel="Giorno"
                    />
                </div>
            </div>

            {/* 2. ANDAMENTO INCASSO COMPLESSIVO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                    <BanknoteIcon className="h-6 w-6 text-yellow-500"/>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Trend Incasso Complessivo</h3>
                        <p className="text-[10px] text-slate-400">Totale entrate bar (giorni attivi, turni notturni accorpati)</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <LineChart 
                        datasets={totalRevenueTrend} 
                        height={300}
                        yAxisLabel="Totale (€)"
                        xAxisLabel="Giorno"
                    />
                </div>
            </div>

            {/* BOTTOM CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold mb-2 text-slate-700 flex items-center gap-2"><LayersIcon className="h-4 w-4 text-purple-500"/> Categorie</h3>
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
                <button onClick={handlePrintPdf} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 text-xs shadow-md">Stampa PDF</button>
            </div>
        </div>
    );
};

export default StatisticsView;
