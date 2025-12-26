
import React, { useState, useMemo } from 'react';
import { StaffMember, Shift } from '../types';
import { BackArrowIcon, CheckIcon, FilterIcon, ShirtIcon, PrinterIcon, TrashIcon } from './Icons';
import { GradeBadge } from './StaffManagement';
import { useBar } from '../contexts/BarContext';
import { VVF_GRADES } from '../constants';

interface LaundryViewProps {
    onGoBack: () => void;
    staff: StaffMember[];
}

interface LaundryItemState {
    id: string;
    name: string;
    quantity: number;
}

// Fallback items if none are configured in DB
const DEFAULT_ITEMS_FALLBACK = [
    "Giacca Intervento",
    "Sovrapantalone Intervento",
    "Guanti",
    "Sottocasco",
    "Divisa (Giacca)",
    "Divisa (Pantalone)",
    "Polo / T-Shirt",
    "Felpa",
    "Lenzuolo Singolo",
    "Federa",
    "Asciugamano",
    "Telo Doccia",
    "Coperta"
];

const LaundryView: React.FC<LaundryViewProps> = ({ onGoBack, staff }) => {
    const { laundryItems } = useBar();

    // Initialize items state based on context or fallback
    const initialItems = useMemo(() => {
        if (laundryItems.length > 0) {
            return laundryItems.map(item => ({ id: item.id, name: item.name, quantity: 0 }));
        }
        return DEFAULT_ITEMS_FALLBACK.map((name, index) => ({ id: `default-${index}`, name, quantity: 0 }));
    }, [laundryItems]);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [staffShiftFilter, setStaffShiftFilter] = useState<Shift | 'all'>('all');
    
    // Items State
    const [items, setItems] = useState<LaundryItemState[]>(initialItems);

    // Update state when context items change (only if quantities are 0 to avoid resetting user input)
    // React.useEffect(() => {
    //     if (items.every(i => i.quantity === 0) && laundryItems.length > 0) {
    //         setItems(laundryItems.map(item => ({ id: item.id, name: item.name, quantity: 0 })));
    //     }
    // }, [laundryItems]);

    // Filtered Staff List with Rank Sorting
    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            if (s.name.toLowerCase().includes('cassa')) return false;
            if (staffShiftFilter !== 'all' && s.shift !== staffShiftFilter) return false;
            return true;
        }).sort((a, b) => {
            // Sort by Rank High -> Low
            const getRankIndex = (gId?: string) => VVF_GRADES.findIndex(g => g.id === gId);
            const rankA = getRankIndex(a.grade);
            const rankB = getRankIndex(b.grade);
            
            if (rankA !== rankB) {
                // Higher index in VVF_GRADES means higher rank usually? 
                // Let's check VVF_GRADES definition. VIG is 0, CRE is last. 
                // So higher index = higher rank. We want descending.
                return rankB - rankA;
            }
            // Fallback alphabetical
            return a.name.localeCompare(b.name);
        });
    }, [staff, staffShiftFilter]);

    const selectedStaffMember = useMemo(() => staff.find(s => s.id === selectedStaffId), [staff, selectedStaffId]);

    const handleQuantityChange = (id: string, delta: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }));
    };

    const handlePrint = () => {
        if (!selectedStaffId) {
            alert("Seleziona chi sta consegnando la lavanderia.");
            return;
        }
        if (items.every(i => i.quantity === 0)) {
            alert("Inserisci almeno un capo.");
            return;
        }
        window.print();
    };

    const handleReset = () => {
        if(confirm("Vuoi cancellare tutto?")) {
            setItems(items.map(i => ({ ...i, quantity: 0 })));
            setSelectedStaffId('');
        }
    };

    // Calculate total items for summary
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            
            {/* HEADER (Hidden in Print) */}
            <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)] print:hidden">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-blue-700/40 px-4 py-2 rounded-full hover:bg-blue-700/60 transition-colors backdrop-blur-sm"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <ShirtIcon className="h-8 w-8" />
                    <span>Lavanderia</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6 print:p-0 print:max-w-none">

                {/* PRINT HEADER (Visible only in Print) */}
                <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-black uppercase">Distaccamento VVF Montepulciano</h1>
                    <h2 className="text-xl font-bold uppercase mt-2">Scheda Consegna Lavanderia</h2>
                    <p className="text-sm mt-4">
                        Data: <b>{new Date(date).toLocaleDateString('it-IT')}</b>
                    </p>
                    {selectedStaffMember && (
                        <p className="text-sm mt-1">
                            Consegnato da: <b>{selectedStaffMember.name}</b> (Turno {selectedStaffMember.shift.toUpperCase()})
                        </p>
                    )}
                </div>

                {/* SELEZIONE DATA E PERSONALE (Hidden in Print if confirmed) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Data */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Consegna</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none font-bold text-slate-700" 
                            />
                        </div>

                        {/* Filtro Turno */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                                <FilterIcon className="h-3 w-3"/> Filtra Personale
                            </label>
                            <div className="flex gap-2">
                                {['all', 'a', 'b', 'c', 'd'].map(shift => (
                                    <button
                                        key={shift}
                                        onClick={() => setStaffShiftFilter(shift as Shift | 'all')}
                                        className={`
                                            flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all border
                                            ${staffShiftFilter === shift 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-blue-50'}
                                        `}
                                    >
                                        {shift === 'all' ? 'Tutti' : shift}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Griglia Personale */}
                    <div className="mt-4">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Seleziona Consegnatario *</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-1 border rounded-xl bg-slate-50">
                            {filteredStaff.map(s => {
                                const isSelected = selectedStaffId === s.id;
                                return (
                                    <div 
                                        key={s.id}
                                        onClick={() => setSelectedStaffId(s.id)}
                                        className={`
                                            relative flex flex-col items-center p-2 rounded-xl border-2 cursor-pointer transition-all group
                                            ${isSelected 
                                                ? 'bg-blue-50 border-blue-500 shadow-md transform scale-105' 
                                                : 'bg-white border-slate-200 hover:border-blue-300'
                                            }
                                        `}
                                    >
                                        {isSelected && (
                                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm z-10">
                                                <CheckIcon className="h-2 w-2" />
                                            </div>
                                        )}
                                        
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                                                {s.photoUrl ? (
                                                    <img src={s.photoUrl} className="w-full h-full object-cover" alt={s.name} />
                                                ) : (
                                                    <span>{s.icon || '👤'}</span>
                                                )}
                                            </div>
                                            {s.grade && (
                                                <div className="absolute -bottom-1 -right-1 scale-75">
                                                    <GradeBadge grade={s.grade} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <span className={`text-[9px] font-bold text-center mt-1 truncate w-full ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                            {s.name.split(' ')[0]}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* LISTA CAPI (Input Interface) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2">
                            <ShirtIcon className="h-5 w-5 text-blue-500"/> Elenco Capi
                        </h2>
                        {totalItems > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                Totale: {totalItems} pezzi
                            </span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-blue-200 transition-colors">
                                <span className="font-bold text-sm text-slate-700">{item.name}</span>
                                <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                                    <button 
                                        onClick={() => handleQuantityChange(item.id, -1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors font-bold text-lg disabled:opacity-30"
                                        disabled={item.quantity === 0}
                                    >
                                        -
                                    </button>
                                    <span className={`w-6 text-center font-bold text-lg ${item.quantity > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                        {item.quantity}
                                    </span>
                                    <button 
                                        onClick={() => handleQuantityChange(item.id, 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors font-bold text-lg"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button 
                            onClick={handleReset}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <TrashIcon className="h-5 w-5" /> Reset
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedStaffId || totalItems === 0}
                        >
                            <PrinterIcon className="h-5 w-5" /> Stampa Distinta
                        </button>
                    </div>
                </div>

                {/* PRINT VIEW (Table Only) */}
                <div className="hidden print:block">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-2 text-sm font-black uppercase">Descrizione Capo</th>
                                <th className="py-2 text-sm font-black uppercase text-right w-24">Quantità</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                            {items.filter(i => i.quantity > 0).map(item => (
                                <tr key={item.id}>
                                    <td className="py-3 text-sm font-bold">{item.name}</td>
                                    <td className="py-3 text-sm font-bold text-right font-mono text-lg">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black">
                                <td className="py-4 text-base font-black uppercase">Totale Pezzi</td>
                                <td className="py-4 text-base font-black text-right">{totalItems}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-16 flex justify-between px-8">
                        <div className="text-center">
                            <p className="text-xs uppercase border-t border-black pt-2 w-48">Firma Consegnatario</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs uppercase border-t border-black pt-2 w-48">Firma Lavanderia (Ritiro)</p>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default LaundryView;
