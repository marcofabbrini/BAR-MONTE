
import React, { useState, useMemo } from 'react';
import { StaffMember, Shift, LaundryEntry, LaundryShipment } from '../types';
import { BackArrowIcon, CheckIcon, FilterIcon, ShirtIcon, PrinterIcon, TrashIcon, SortIcon, ListIcon, TruckIcon, BoxIcon } from './Icons';
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
    const { laundryItems, laundryEntries, laundryShipments, addLaundryEntry, deleteLaundryEntry, createLaundryShipment, updateLaundryShipment } = useBar();

    // VIEW STATE
    const [activeTab, setActiveTab] = useState<'entry' | 'shipment' | 'incoming'>('entry');

    // UI State for Sections
    const [isInputOpen, setIsInputOpen] = useState(true); 
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); 

    // Initialize items state based on context or fallback
    const initialItems = useMemo(() => {
        if (laundryItems.length > 0) {
            return laundryItems.map(item => ({ id: item.id, name: item.name, quantity: 0 }));
        }
        return DEFAULT_ITEMS_FALLBACK.map((name, index) => ({ id: `default-${index}`, name, quantity: 0 }));
    }, [laundryItems]);

    // Form State (New Entry)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [staffShiftFilter, setStaffShiftFilter] = useState<Shift | 'all'>('all');
    const [items, setItems] = useState<LaundryItemState[]>(initialItems);

    // Filtered Staff List with Rank Sorting
    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            if (s.name.toLowerCase().includes('cassa')) return false;
            if (staffShiftFilter !== 'all' && s.shift !== staffShiftFilter) return false;
            return true;
        }).sort((a, b) => {
            const getRankIndex = (gId?: string) => VVF_GRADES.findIndex(g => g.id === gId);
            const rankA = getRankIndex(a.grade);
            const rankB = getRankIndex(b.grade);
            if (rankA !== rankB) return rankB - rankA;
            return a.name.localeCompare(b.name);
        });
    }, [staff, staffShiftFilter]);

    const handleQuantityChange = (id: string, delta: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }));
    };

    const handleSaveEntry = async () => {
        if (!selectedStaffId) return alert("Seleziona chi sta consegnando la lavanderia.");
        if (items.every(i => i.quantity === 0)) return alert("Inserisci almeno un capo.");

        if (window.confirm("Confermi la consegna? Verrà aggiunta alla lista 'Da Inviare'.")) {
            const staffMember = staff.find(s => s.id === selectedStaffId);
            const activeItems = items.filter(i => i.quantity > 0).map(i => ({ name: i.name, quantity: i.quantity }));
            const total = activeItems.reduce((acc, i) => acc + i.quantity, 0);

            try {
                await addLaundryEntry({
                    date: date,
                    staffId: selectedStaffId,
                    staffName: staffMember?.name || 'Sconosciuto',
                    shift: staffMember?.shift || '?',
                    items: activeItems,
                    totalItems: total,
                    timestamp: new Date().toISOString()
                });
                alert("Consegna registrata!");
                handleReset();
            } catch (e) {
                console.error(e);
                alert("Errore salvataggio consegna.");
            }
        }
    };

    const handleReset = () => {
        setItems(items.map(i => ({ ...i, quantity: 0 })));
        setSelectedStaffId('');
    };

    // --- LOGICA SPEDIZIONE ---
    
    // Filtra solo le entry che NON hanno uno shipmentId (sono ancora in cesta)
    const pendingEntries = useMemo(() => {
        return laundryEntries.filter(e => !e.shipmentId);
    }, [laundryEntries]);

    // Calcola il riepilogo totale per la spedizione
    const shipmentSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        pendingEntries.forEach(entry => {
            entry.items.forEach(item => {
                summary[item.name] = (summary[item.name] || 0) + item.quantity;
            });
        });
        return Object.entries(summary).map(([name, totalQuantity]) => ({ name, totalQuantity, returnedQuantity: 0 }));
    }, [pendingEntries]);

    const handleCreateShipment = async () => {
        if (pendingEntries.length === 0) return alert("Nessun capo da inviare.");
        
        if (confirm("Creare la spedizione? Verrà generato il PDF da inviare per email.")) {
            try {
                const now = new Date();
                const shipmentData = {
                    sentDate: now.toISOString().split('T')[0],
                    timestamp: now.toISOString(),
                    items: shipmentSummary,
                    status: 'in_transit' as const,
                    notes: `Spedizione del ${now.toLocaleDateString()}`
                };

                const entryIds = pendingEntries.map(e => e.id);
                
                await createLaundryShipment(shipmentData, entryIds);
                
                // 1. Apri Client Posta
                const subject = encodeURIComponent(`Ritiro Lavanderia VVF Montepulciano - ${now.toLocaleDateString()}`);
                const body = encodeURIComponent(`In allegato il riepilogo dei capi consegnati in data odierna.\n\nDistaccamento VVF Montepulciano`);
                window.open(`mailto:marcofabbrini@gmail.com?subject=${subject}&body=${body}`);

                // 2. Apri Stampa (PDF)
                setTimeout(() => window.print(), 1000);

            } catch (e) {
                console.error(e);
                alert("Errore creazione spedizione.");
            }
        }
    };

    // --- LOGICA IN ARRIVO (CHECKLIST) ---
    const incomingShipments = useMemo(() => laundryShipments.filter(s => s.status === 'in_transit'), [laundryShipments]);

    const handleCheckItem = async (shipmentId: string, itemName: string, currentReturned: number, total: number) => {
        // Toggle logic: if not fully returned, mark full. If full, mark 0.
        const newReturned = currentReturned < total ? total : 0;
        
        const shipment = laundryShipments.find(s => s.id === shipmentId);
        if(!shipment) return;

        const newItems = shipment.items.map(i => i.name === itemName ? { ...i, returnedQuantity: newReturned } : i);
        
        await updateLaundryShipment(shipmentId, { items: newItems });
    };

    const handleCompleteShipment = async (shipmentId: string) => {
        if(confirm("Confermi che TUTTI i capi sono rientrati? La spedizione verrà archiviata.")) {
            await updateLaundryShipment(shipmentId, { status: 'completed' });
        }
    };

    const totalInputItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            
            {/* HEADER (Hidden in Print) */}
            <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)] print:hidden">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-700/40 flex items-center justify-center">
                        <BackArrowIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <ShirtIcon className="h-8 w-8" />
                    <span>Lavanderia</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
            </header>

            {/* TAB BAR (Hidden in Print) */}
            <div className="bg-white shadow-sm border-b border-slate-200 sticky top-[72px] z-40 print:hidden">
                <div className="flex justify-center max-w-5xl mx-auto">
                    <button onClick={() => setActiveTab('entry')} className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase tracking-wide border-b-4 transition-colors ${activeTab === 'entry' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        📥 Consegna
                    </button>
                    <button onClick={() => setActiveTab('shipment')} className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase tracking-wide border-b-4 transition-colors ${activeTab === 'shipment' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        📦 Da Inviare <span className="ml-1 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{pendingEntries.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('incoming')} className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase tracking-wide border-b-4 transition-colors ${activeTab === 'incoming' ? 'border-green-600 text-green-600 bg-green-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        🚚 In Arrivo <span className="ml-1 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{incomingShipments.length}</span>
                    </button>
                </div>
            </div>

            <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6 print:p-0 print:max-w-none">

                {/* --- TAB 1: NUOVA CONSEGNA --- */}
                {activeTab === 'entry' && (
                    <div className="print:hidden animate-fade-in space-y-6">
                        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Consegna</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-3 text-sm font-bold text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filtra Personale</label>
                                        <div className="flex gap-2">
                                            {['all', 'a', 'b', 'c', 'd'].map(shift => (
                                                <button key={shift} onClick={() => setStaffShiftFilter(shift as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${staffShiftFilter === shift ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                                    {shift === 'all' ? 'Tutti' : shift}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Seleziona Consegnatario *</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-1 border rounded-xl bg-slate-50">
                                        {filteredStaff.map(s => {
                                            const isSelected = selectedStaffId === s.id;
                                            return (
                                                <div key={s.id} onClick={() => setSelectedStaffId(s.id)} className={`relative flex flex-col items-center p-2 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md scale-105' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                                                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <span>{s.icon || '👤'}</span>}
                                                    </div>
                                                    <span className={`text-[9px] font-bold text-center mt-1 truncate w-full ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{s.name.split(' ')[0]}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2"><ListIcon className="h-5 w-5 text-blue-500"/> Elenco Capi</h2>
                                    {totalInputItems > 0 && <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Totale: {totalInputItems}</span>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                                            <span className="font-bold text-sm text-slate-700">{item.name}</span>
                                            <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                                                <button onClick={() => handleQuantityChange(item.id, -1)} className="w-8 h-8 rounded-md text-slate-400 hover:text-red-500 font-bold" disabled={item.quantity === 0}>-</button>
                                                <span className={`w-6 text-center font-bold text-lg ${item.quantity > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{item.quantity}</span>
                                                <button onClick={() => handleQuantityChange(item.id, 1)} className="w-8 h-8 rounded-md text-slate-400 hover:text-blue-500 font-bold">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <button onClick={handleReset} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl">Reset</button>
                                    <button onClick={handleSaveEntry} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50" disabled={!selectedStaffId || totalInputItems === 0}>
                                        <CheckIcon className="h-5 w-5 inline mr-2" /> Salva Consegna
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: SPEDIZIONE (Pending) --- */}
                {activeTab === 'shipment' && (
                    <div className="animate-fade-in print:animate-none">
                        
                        {/* PRINT HEADER */}
                        <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
                            <h1 className="text-2xl font-black uppercase">Distaccamento VVF Montepulciano</h1>
                            <h2 className="text-xl font-bold uppercase mt-2">Distinta Spedizione Lavanderia</h2>
                            <p className="text-sm mt-4">Data Invio: <b>{new Date().toLocaleDateString('it-IT')}</b></p>
                        </div>

                        {pendingEntries.length === 0 ? (
                            <div className="text-center py-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 print:hidden">
                                <p className="text-slate-400 font-bold text-lg">Cesta vuota!</p>
                                <p className="text-sm text-slate-400">Nessun capo in attesa di spedizione.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                                <div className="p-6 bg-orange-50 border-b border-orange-100 print:bg-white print:border-none print:p-0">
                                    <h2 className="text-lg font-black text-orange-800 uppercase flex items-center gap-2 print:hidden">
                                        <BoxIcon className="h-6 w-6" /> Riepilogo Cesta (Da Inviare)
                                    </h2>
                                    <p className="text-xs text-orange-600 mt-1 print:hidden">
                                        Ci sono {pendingEntries.length} consegne individuali in attesa.
                                    </p>
                                </div>

                                <div className="p-0">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200 print:bg-white print:text-black print:border-black">
                                            <tr>
                                                <th className="p-4 print:p-2">Descrizione Capo</th>
                                                <th className="p-4 text-right print:p-2">Quantità Totale</th>
                                                <th className="p-4 text-center print:hidden">Stato</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                                            {shipmentSummary.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 print:hover:bg-white">
                                                    <td className="p-4 font-bold text-slate-700 print:p-2 print:text-black">{item.name}</td>
                                                    <td className="p-4 text-right font-black text-lg text-slate-800 print:p-2 print:text-black">{item.totalQuantity}</td>
                                                    <td className="p-4 text-center print:hidden">
                                                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Pending</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-white print:border-black">
                                            <tr>
                                                <td className="p-4 font-black text-slate-800 uppercase print:p-2">TOTALE PEZZI</td>
                                                <td className="p-4 text-right font-black text-xl text-blue-600 print:p-2 print:text-black">
                                                    {shipmentSummary.reduce((a,b) => a + b.totalQuantity, 0)}
                                                </td>
                                                <td className="print:hidden"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-200 print:hidden">
                                    <button 
                                        onClick={handleCreateShipment}
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg transition-transform active:scale-95"
                                    >
                                        <PrinterIcon className="h-6 w-6" /> Invia a Lavanderia & Genera PDF
                                    </button>
                                    <p className="text-[10px] text-center text-slate-400 mt-2">
                                        Cliccando, i capi verranno segnati come "In Transito", verrà generato il PDF e si aprirà il client di posta.
                                    </p>
                                </div>

                                {/* FIRME PRINT ONLY */}
                                <div className="hidden print:flex justify-between mt-20 px-8">
                                    <div className="text-center w-1/3 border-t border-black pt-2">
                                        <p className="text-xs font-bold uppercase">Firma VVF (Consegna)</p>
                                    </div>
                                    <div className="text-center w-1/3 border-t border-black pt-2">
                                        <p className="text-xs font-bold uppercase">Firma Lavanderia (Ritiro)</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 3: IN ARRIVO (Incoming Check) --- */}
                {activeTab === 'incoming' && (
                    <div className="animate-fade-in space-y-6 print:hidden">
                        {incomingShipments.length === 0 ? (
                            <div className="text-center py-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                                <p className="text-slate-400 font-bold text-lg">Nessuna spedizione in arrivo.</p>
                            </div>
                        ) : (
                            incomingShipments.map(shipment => (
                                <div key={shipment.id} className="bg-white rounded-xl shadow-md border-l-4 border-green-500 overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm uppercase">Spedizione del {new Date(shipment.sentDate).toLocaleDateString()}</h3>
                                            <p className="text-xs text-slate-500">{shipment.notes}</p>
                                        </div>
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase animate-pulse">In Transito</span>
                                    </div>
                                    
                                    <div className="p-0">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                                <tr>
                                                    <th className="p-3">Capo</th>
                                                    <th className="p-3 text-center">Qt. Inviata</th>
                                                    <th className="p-3 text-center">Qt. Rientrata</th>
                                                    <th className="p-3 text-center">Spunta</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {shipment.items.map((item, i) => {
                                                    const isComplete = item.returnedQuantity === item.totalQuantity;
                                                    return (
                                                        <tr key={i} className={isComplete ? 'bg-green-50/50' : ''}>
                                                            <td className="p-3 font-medium text-slate-700">{item.name}</td>
                                                            <td className="p-3 text-center font-bold">{item.totalQuantity}</td>
                                                            <td className={`p-3 text-center font-bold ${isComplete ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {item.returnedQuantity}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button 
                                                                    onClick={() => handleCheckItem(shipment.id, item.name, item.returnedQuantity, item.totalQuantity)}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-green-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 hover:bg-green-200'}`}
                                                                >
                                                                    <CheckIcon className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                        {shipment.items.every(i => i.returnedQuantity === i.totalQuantity) ? (
                                            <button 
                                                onClick={() => handleCompleteShipment(shipment.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
                                            >
                                                <CheckIcon className="h-5 w-5" /> Archivia come Completo
                                            </button>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Spunta tutti i capi per archiviare.</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

export default LaundryView;
