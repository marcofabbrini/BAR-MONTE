
import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleBooking, StaffMember, Shift, VehicleCheck } from '../types';
import { BackArrowIcon, CalendarIcon, CheckIcon, TrashIcon, SortIcon, PrinterIcon, TruckIcon, EditIcon } from './Icons';
import { VVF_GRADES } from '../constants';
import { GradeBadge } from './StaffManagement';
import { useBar } from '../contexts/BarContext';

interface VehicleBookingViewProps {
    onGoBack: () => void;
    vehicles: Vehicle[];
    bookings: VehicleBooking[];
    staff: StaffMember[];
    onAddBooking: (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => Promise<void>;
    onDeleteBooking: (id: string) => Promise<void>;
    isSuperAdmin?: boolean | null;
    vehicleChecks?: VehicleCheck[];
    onAddCheck?: (c: Omit<VehicleCheck, 'id'>) => Promise<void>;
}

// --- TRAFFIC ANIMATION COMPONENT ---
const TrafficHeader = () => {
    // Genera veicoli statici per evitare re-render, ma con proprietà random
    const trafficItems = useMemo(() => {
        const items = [];
        const count = 10; // Numero di veicoli

        for (let i = 0; i < count; i++) {
            const isRight = i % 2 === 0; // Alterna direzione
            const isEmergency = Math.random() > 0.8; // 20% probabilità emergenza

            // Velocità: Emergenza veloce (2-5s), Normali lente (12-20s)
            const duration = isEmergency ? 2 + Math.random() * 3 : 12 + Math.random() * 8;
            const delay = Math.random() * 20; // Delay iniziale
            
            // Dimensione ridotta come richiesto
            const size = 1.8; // rem

            // Logica Colori
            let emoji = '🚗';
            let filterStyle = 'drop-shadow(1px 2px 3px rgba(0,0,0,0.3))';

            if (isEmergency) {
                // Veicoli emergenza (Vigili del Fuoco o Auto Civetta Rossa)
                emoji = Math.random() > 0.5 ? '🚒' : '🚗';
                filterStyle += ' saturate(2) brightness(1.1)'; // Rosso acceso
            } else {
                const type = Math.floor(Math.random() * 4); // 0, 1, 2, 3
                if (type === 0) {
                    emoji = '🚗'; // Auto Rossa
                    filterStyle += ' saturate(1.2)';
                } else if (type === 1) {
                    emoji = '🚙'; // SUV Blu -> Grigio
                    filterStyle += ' grayscale(1) brightness(1.2)';
                } else if (type === 2) {
                    emoji = '🚗'; // Auto Rossa -> Celeste
                    // Red hue is 0. Blue is 240. Light blue/Cyan ~180-200.
                    filterStyle += ' hue-rotate(200deg) brightness(1.2)';
                } else {
                    emoji = '🛻'; // Pickup 
                    // Grigio scuro
                    filterStyle += ' grayscale(1) brightness(0.8)';
                }
            }

            items.push({
                id: i,
                emoji,
                isRight,
                isEmergency,
                style: {
                    animation: `drive-${isRight ? 'right' : 'left'} ${duration}s linear infinite`,
                    animationDelay: `-${delay}s`,
                    filter: filterStyle,
                    bottom: '6px', 
                    position: 'absolute' as 'absolute',
                    fontSize: `${size}rem`,
                    zIndex: isEmergency ? 10 : 1,
                    opacity: 1,
                    left: isRight ? '-15%' : '115%', // Partenza fuori schermo
                    transformOrigin: 'center bottom'
                }
            });
        }
        return items;
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 w-full h-full">
            <style>
                {`
                @keyframes drive-left {
                    0% { transform: translateX(0); left: 110%; }
                    100% { transform: translateX(0); left: -20%; }
                }
                @keyframes drive-right {
                    0% { transform: translateX(0) scaleX(-1); left: -20%; }
                    100% { transform: translateX(0) scaleX(-1); left: 110%; }
                }
                @keyframes siren-flash-blue {
                    0%, 100% { opacity: 0; transform: scale(0.5); }
                    50% { opacity: 1; transform: scale(1.5); background: radial-gradient(circle, #3b82f6 0%, transparent 70%); }
                }
                @keyframes siren-flash-red {
                    0%, 100% { opacity: 1; transform: scale(1.5); background: radial-gradient(circle, #ef4444 0%, transparent 70%); }
                    50% { opacity: 0; transform: scale(0.5); }
                }
                `}
            </style>
            {trafficItems.map(item => (
                <div key={item.id} style={item.style} className="absolute leading-none flex justify-center items-center">
                    {item.emoji}
                    {item.isEmergency && (
                        // Sirene "attaccate" (-top-1)
                        <div className="absolute -top-1 w-full flex justify-center gap-0.5 pointer-events-none">
                            <div className="w-1.5 h-1.5 rounded-full animate-[siren-flash-blue_0.2s_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full animate-[siren-flash-red_0.2s_infinite]" />
                        </div>
                    )}
                </div>
            ))}
            {/* Road gradient overlay */}
            <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-t from-red-900/40 to-transparent"></div>
        </div>
    );
};

const VehicleBookingView: React.FC<VehicleBookingViewProps> = ({ 
    onGoBack, vehicles, bookings, staff, onAddBooking, onDeleteBooking, isSuperAdmin, vehicleChecks = [], onAddCheck
}) => {
    const { getNow, updateBooking, activeBarUser } = useBar();
    
    // Edit Mode State
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

    // Form State
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('18:00');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [serviceType, setServiceType] = useState('Servizio Comando');
    const [destination, setDestination] = useState('');
    
    // Requester State
    const [isExternal, setIsExternal] = useState(false);
    const [internalStaffId, setInternalStaffId] = useState('');
    const [extGrade, setExtGrade] = useState('');
    const [extName, setExtName] = useState('');
    const [extSurname, setExtSurname] = useState('');
    const [extLocation, setExtLocation] = useState('');

    // UI States
    const [isFormOpen, setIsFormOpen] = useState(true); // Open by default for immediate selection
    const [staffShiftFilter, setStaffShiftFilter] = useState<Shift | 'all'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sorted bookings by TIMESTAMP DESCENDING
    const sortedBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [bookings]);

    // Filtered Staff List (Exclude 'Cassa' and filter by Shift, Sort by Rank)
    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            // Escludi utenti "Cassa"
            if (s.name.toLowerCase().includes('cassa')) return false;
            
            // Escludi SUPER ADMIN
            if (s.role === 'super-admin') return false;

            // Filtra per turno se selezionato
            if (staffShiftFilter !== 'all' && s.shift !== staffShiftFilter) return false;
            
            return true;
        }).sort((a, b) => {
            // Sort by Rank High -> Low
            const getRankIndex = (gId?: string) => VVF_GRADES.findIndex(g => g.id === gId);
            const rankA = getRankIndex(a.grade);
            const rankB = getRankIndex(b.grade);
            
            if (rankA !== rankB) {
                // Higher index = higher rank in VVF_GRADES array order (VIG..CRE)
                return rankB - rankA;
            }
            // Fallback alphabetical
            return a.name.localeCompare(b.name);
        });
    }, [staff, staffShiftFilter]);

    const resetForm = () => {
        setStartDate('');
        setStartTime('08:00');
        setEndDate('');
        setEndTime('18:00');
        setSelectedVehicle('');
        setServiceType('Servizio Comando');
        setDestination('');
        setIsExternal(false);
        setInternalStaffId('');
        setExtGrade('');
        setExtName('');
        setExtSurname('');
        setExtLocation('');
        setEditingBookingId(null);
    };

    const handleEdit = (booking: VehicleBooking) => {
        setEditingBookingId(booking.id);
        
        // Parse dates
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        
        // Helper per formattare l'orario correttamente HH:mm
        const formatTime = (date: Date) => {
            return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        };

        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(formatTime(start));
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(formatTime(end));
        
        setSelectedVehicle(booking.vehicleId);
        setServiceType(booking.serviceType);
        setDestination(booking.destination);
        
        if (booking.requesterType === 'external') {
            setIsExternal(true);
            setExtGrade(booking.externalGrade || '');
            setExtLocation(booking.externalLocation || '');
            
            // Tentativo parsing nome
            const parts = booking.requesterName.split(' ');
            if (parts.length >= 2) {
                setExtName(parts[1] || ''); // Skip Grade
                setExtSurname(parts.slice(2).join(' ').split('(')[0].trim());
            }
        } else {
            setIsExternal(false);
            setInternalStaffId(booking.internalStaffId || '');
        }

        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!startDate || !endDate || !selectedVehicle || !destination) {
            alert("Compila tutti i campi obbligatori.");
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
        const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
        
        const startTs = new Date(startDateTime).getTime();
        const endTs = new Date(endDateTime).getTime();

        if (endTs <= startTs) {
            alert("La data di ritorno deve essere successiva alla partenza.");
            return;
        }

        // --- VERIFICA SOVRAPPOSIZIONE (CONFLICT CHECK) ---
        const hasOverlap = bookings.some(booking => {
            if (booking.id === editingBookingId) return false; // Ignora se stesso in modifica
            if (booking.isCancelled) return false; // Ignora cancellati
            if (booking.vehicleId !== selectedVehicle) return false; // Controllo solo lo stesso veicolo

            const bStart = new Date(booking.startDate).getTime();
            const bEnd = new Date(booking.endDate).getTime();

            // Logica di sovrapposizione:
            // (StartA < EndB) && (EndA > StartB)
            return startTs < bEnd && endTs > bStart;
        });

        if (hasOverlap) {
            alert("⚠️ Il mezzo selezionato è GIÀ IMPEGNATO in questo intervallo di tempo. Controlla il prospetto e scegli un altro orario o un altro mezzo.");
            return;
        }
        // --------------------------------------------------

        let requesterName = '';
        if (isExternal) {
            if (!extName || !extSurname || !extLocation) {
                alert("Compila i dati del richiedente esterno.");
                return;
            }
            const gradeLabel = VVF_GRADES.find(g => g.id === extGrade)?.label || extGrade;
            requesterName = `${gradeLabel || ''} ${extName} ${extSurname} (${extLocation})`.trim();
        } else {
            if (!internalStaffId) {
                alert("Seleziona il personale interno.");
                return;
            }
            const staffMember = staff.find(s => s.id === internalStaffId);
            requesterName = staffMember?.name || 'Sconosciuto';
        }

        const vehicle = vehicles.find(v => v.id === selectedVehicle);
        const vehicleName = vehicle ? `${vehicle.model} - ${vehicle.plate}` : 'Veicolo';

        setIsSubmitting(true);
        try {
            const basePayload = {
                vehicleId: selectedVehicle,
                vehicleName,
                startDate: startDateTime,
                endDate: endDateTime,
                requesterType: isExternal ? 'external' : 'internal' as const,
                requesterName,
                serviceType: serviceType as any,
                destination
            };

            let finalPayload: any = { ...basePayload };

            if (isExternal) {
                finalPayload.externalGrade = extGrade || '';
                finalPayload.externalLocation = extLocation || '';
                finalPayload.internalStaffId = null;
            } else {
                finalPayload.internalStaffId = internalStaffId;
                finalPayload.externalGrade = null;
                finalPayload.externalLocation = null;
            }

            if (editingBookingId) {
                await updateBooking({ id: editingBookingId, ...finalPayload });
                alert("Prenotazione aggiornata!");
            } else {
                await onAddBooking(finalPayload);
                alert("Prenotazione confermata!");
            }
            
            // Reset Form e chiudi
            resetForm();
            // Mantieni aperto per comodità
        } catch (error: any) {
            console.error("Booking Error:", error);
            alert("Errore durante la prenotazione: " + (error.message || "Controlla i dati e riprova."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Annullare questa prenotazione? Rimarrà visibile ma barrata.")) return;
        try {
            await updateBooking({ 
                id, 
                isCancelled: true, 
                cancelledBy: activeBarUser?.name || 'Utente',
                cancelledAt: new Date().toISOString()
            } as VehicleBooking); // Partial update handled by service
        } catch(e) {
            console.error(e);
            alert("Errore annullamento.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("ELIMINAZIONE DEFINITIVA: Vuoi cancellare totalmente questa prenotazione dal database?")) {
            await onDeleteBooking(id);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleQuickCheck = async (e: React.MouseEvent, v: Vehicle) => {
        e.stopPropagation();
        if(!onAddCheck) return;
        
        if (confirm(`Confermi di aver effettuato il controllo ordinario per ${v.model} (${v.plate})?\n\nVerrà registrato come "Completo" nel registro.`)) {
            try {
                const now = getNow();
                
                await onAddCheck({
                    vehicleId: v.id,
                    vehicleName: `${v.model} (${v.plate})`,
                    date: now.toISOString().split('T')[0],
                    timestamp: now.toISOString(),
                    shift: '?', 
                    status: 'ok',
                    missingItems: [],
                    notes: 'Controllo ordinario automezzo (Senza caricamento)'
                });
                alert("Controllo registrato!");
            } catch(e) {
                console.error(e);
                alert("Errore registrazione.");
            }
        }
    };

    const todayDayName = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][getNow().getDay()];
    const todayStr = getNow().toISOString().split('T')[0];
    const nowTime = getNow().getTime();

    // Check Availability Function
    const isVehicleOccupied = (vehicleId: string) => {
        return bookings.some(b => 
            b.vehicleId === vehicleId && 
            !b.isCancelled && 
            nowTime >= new Date(b.startDate).getTime() && 
            nowTime <= new Date(b.endDate).getTime()
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* HEADER MIGLIORATO (NASCOSTO IN STAMPA) */}
            <header className="bg-red-700 text-white px-4 py-4 md:px-6 md:py-5 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)] print:hidden relative overflow-hidden">
                {/* TRAFFIC ANIMATION BACKGROUND */}
                <TrafficHeader />

                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white transition-colors relative z-10"
                >
                    <div className="w-10 h-10 rounded-full bg-red-800/80 flex items-center justify-center backdrop-blur-sm shadow-md border border-white/20">
                        <BackArrowIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm hidden md:inline drop-shadow-md">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-lg transform translate-y-0.5 relative z-10">
                    <span>Automezzi</span>
                </h1>
                
                <div className="w-12 md:w-24 relative z-10"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 print:p-0 print:max-w-none">
                
                {/* TITOLO STAMPA (VISIBILE SOLO IN STAMPA) */}
                <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
                    <h1 className="text-xl font-black uppercase">
                        Prospetto prenotazioni mezzi distaccamento VVF Montepulciano
                    </h1>
                    <p className="text-sm mt-1 font-bold">
                        aggiornato al {new Date().toLocaleDateString('it-IT')}
                    </p>
                </div>

                {/* SEZIONE FORM COLLASSABILE (NASCOSTA IN STAMPA) */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300 print:hidden">
                    <button 
                        onClick={() => {
                            if(isFormOpen && !editingBookingId) resetForm(); // Only reset if closing and not editing
                            setIsFormOpen(!isFormOpen);
                        }}
                        className={`w-full p-4 flex justify-between items-center transition-colors ${isFormOpen ? 'bg-slate-100 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}
                    >
                        <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2 text-lg">
                            <CalendarIcon className="h-6 w-6 text-red-600" /> {editingBookingId ? 'Modifica Prenotazione' : 'Nuova Richiesta'}
                        </h2>
                        <div className={`transform transition-transform duration-300 ${isFormOpen ? 'rotate-180' : 'rotate-0'}`}>
                            <SortIcon className="h-5 w-5 text-slate-400" />
                        </div>
                    </button>
                    
                    {isFormOpen && (
                        <div className="animate-slide-up">
                            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                                
                                {/* 1. SELEZIONE VEICOLO (GRIGLIA RETTANGOLARE SPAZIOSA) */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-3 flex items-center gap-2">
                                        <TruckIcon className="h-4 w-4"/> Seleziona Veicolo *
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {vehicles.map(v => {
                                            const isSelected = selectedVehicle === v.id;
                                            const occupied = isVehicleOccupied(v.id);
                                            const isCheckDay = v.checkDay === todayDayName;
                                            const isCheckedToday = vehicleChecks.some(c => c.vehicleId === v.id && c.date === todayStr);

                                            return (
                                                <div 
                                                    key={v.id}
                                                    onClick={() => setSelectedVehicle(v.id)}
                                                    className={`
                                                        relative p-3 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col items-center gap-3 group
                                                        border-2 overflow-visible
                                                        ${isSelected 
                                                            ? 'border-blue-500 bg-blue-50 scale-[1.03] shadow-xl z-20' 
                                                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-lg hover:-translate-y-1'
                                                        }
                                                        ${occupied 
                                                            ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-200' 
                                                            : 'shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                                        }
                                                    `}
                                                >
                                                    {/* Top Status Badge */}
                                                    <div className={`
                                                        absolute -top-3 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border whitespace-nowrap z-10
                                                        ${occupied 
                                                            ? 'bg-red-100 text-red-600 border-red-200' 
                                                            : 'bg-green-100 text-green-600 border-green-200'
                                                        }
                                                    `}>
                                                        {occupied ? 'OCCUPATO' : 'DISPONIBILE'}
                                                    </div>

                                                    {/* Controllo Rapido Badge (TRIANGOLO CON OMBRA + TESTO) */}
                                                    {isCheckDay && !isCheckedToday && (
                                                        <div 
                                                            className="absolute top-2 right-2 z-20 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.3)] border-2 border-yellow-100 animate-pulse cursor-pointer hover:scale-105 transition-transform flex items-center gap-1.5"
                                                            onClick={(e) => handleQuickCheck(e, v)}
                                                            title="Clicca per registrare controllo rapido"
                                                        >
                                                            {/* Triangolo con ombra specifica per massima visibilità */}
                                                            <span className="text-sm filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">⚠️</span> 
                                                            <span className="drop-shadow-sm">Da controllare</span>
                                                        </div>
                                                    )}

                                                    {/* Selected Check */}
                                                    {isSelected && (
                                                        <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-0.5 shadow-sm z-10">
                                                            <CheckIcon className="h-3 w-3" />
                                                        </div>
                                                    )}

                                                    <div className="w-24 h-20 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center mt-2">
                                                        {v.photoUrl ? (
                                                            <img src={v.photoUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={v.model} />
                                                        ) : (
                                                            <span className="text-4xl filter drop-shadow-sm">🚗</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="w-full flex flex-col items-center">
                                                        <div className="font-bold text-slate-800 text-xs text-center leading-tight mb-2 h-8 flex items-center justify-center w-full px-1">
                                                            {v.model}
                                                        </div>
                                                        
                                                        {/* TARGA VIGILI DEL FUOCO COMPATTA */}
                                                        <div className="flex flex-col items-center justify-center bg-white border border-slate-300 rounded-[2px] h-6 min-w-[60px] px-0.5 relative mt-1 overflow-hidden">
                                                            <div className="flex items-baseline gap-0.5">
                                                                <span className="text-red-600 font-black text-[10px] leading-none">VF</span>
                                                                <span className="text-slate-900 font-black text-[10px] leading-none tracking-tighter font-mono">
                                                                    {v.plate.replace(/VF\s?/i, '').trim()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!selectedVehicle && <p className="text-[10px] text-red-400 mt-2 italic text-center">* Seleziona un mezzo per procedere</p>}
                                </div>

                                {/* 2. DATE E ORARI */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Partenza *</label>
                                        <div className="flex gap-2">
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" required />
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-24 border rounded p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ritorno *</label>
                                        <div className="flex gap-2">
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" required />
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-24 border rounded p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" required />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. RICHIEDENTE (GRIGLIA PERSONALE) */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex gap-6 mb-4 border-b border-slate-200 pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" checked={!isExternal} onChange={() => setIsExternal(false)} className="text-red-600 focus:ring-red-500" />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors">Interno (Distaccamento)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" checked={isExternal} onChange={() => setIsExternal(true)} className="text-red-600 focus:ring-red-500" />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors">Esterno</span>
                                        </label>
                                    </div>

                                    {!isExternal ? (
                                        <div className="space-y-3">
                                            {/* FILTRI TURNO (Pulsanti) */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffShiftFilter('all')}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${staffShiftFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                                >
                                                    Tutti
                                                </button>
                                                {['a', 'b', 'c', 'd'].map(shift => (
                                                    <button
                                                        key={shift}
                                                        type="button"
                                                        onClick={() => setStaffShiftFilter(shift as Shift)}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border uppercase ${staffShiftFilter === shift ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-red-50'}`}
                                                    >
                                                        Turno {shift}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* GRIGLIA PERSONALE */}
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-60 overflow-y-auto pr-1">
                                                {filteredStaff.map(s => {
                                                    const isSelected = internalStaffId === s.id;
                                                    return (
                                                        <div 
                                                            key={s.id}
                                                            onClick={() => setInternalStaffId(s.id)}
                                                            className={`
                                                                relative flex flex-col items-center p-2 rounded-xl border-2 cursor-pointer transition-all group
                                                                ${isSelected 
                                                                    ? 'bg-red-50 border-red-500 shadow-md' 
                                                                    : 'bg-white border-slate-200 hover:border-red-300'
                                                                }
                                                            `}
                                                        >
                                                            {isSelected && (
                                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm z-10">
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
                                                                {/* Badge Grado */}
                                                                {s.grade && (
                                                                    <div className="absolute -bottom-1 -right-1 scale-75">
                                                                        <GradeBadge grade={s.grade} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <span className={`text-[10px] font-bold text-center mt-1 truncate w-full ${isSelected ? 'text-red-700' : 'text-slate-600'}`}>
                                                                {s.name.split(' ')[0]}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 animate-fade-in">
                                            <select value={extGrade} onChange={e => setExtGrade(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-red-200 outline-none">
                                                <option value="">-- Seleziona Grado --</option>
                                                {VVF_GRADES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="text" placeholder="Nome" value={extName} onChange={e => setExtName(e.target.value)} className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" />
                                                <input type="text" placeholder="Cognome" value={extSurname} onChange={e => setExtSurname(e.target.value)} className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" />
                                            </div>
                                            <input type="text" placeholder="Sede di Servizio (es. Comando Siena)" value={extLocation} onChange={e => setExtLocation(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" />
                                        </div>
                                    )}
                                </div>

                                {/* 4. DETTAGLI VIAGGIO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo Servizio</label>
                                        <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full border rounded-lg p-3 text-sm bg-white focus:ring-2 focus:ring-red-200 outline-none">
                                            <option value="Servizio Comando">Servizio Comando</option>
                                            <option value="Missione">Missione</option>
                                            <option value="Sostituzione personale">Sostituzione Personale</option>
                                            <option value="Altro">Altro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Destinazione *</label>
                                        <input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-200 outline-none" placeholder="Es. Siena, Roma..." required />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    {editingBookingId && (
                                        <button 
                                            type="button" 
                                            onClick={() => { resetForm(); setIsFormOpen(false); }}
                                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-4 rounded-xl"
                                        >
                                            Annulla
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {isSubmitting ? 'Salvataggio...' : <><CheckIcon className="h-5 w-5" /> {editingBookingId ? 'Aggiorna Prenotazione' : 'Conferma Prenotazione'}</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* SEZIONE TABELLA PRENOTAZIONI */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-red-500 pb-2 print:border-none">
                        <h2 className="text-lg font-bold text-slate-800 uppercase flex items-center gap-2">
                            <span>📅</span> Prospetto Prenotazioni
                        </h2>
                        <button 
                            onClick={handlePrint}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-sm print:hidden"
                        >
                            <PrinterIcon className="h-4 w-4" /> Stampa Prospetto
                        </button>
                    </div>
                    
                    {sortedBookings.length === 0 ? (
                        <div className="text-center py-12 bg-slate-100 rounded-xl border border-dashed border-slate-300 print:bg-white print:border-slate-200">
                            <p className="text-slate-400 italic">Nessuna prenotazione futura in programma.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 bg-white print:shadow-none print:border-black print:rounded-none">
                            <table className="w-full text-left text-sm print:text-xs">
                                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-xs print:bg-slate-200 print:text-black">
                                    <tr>
                                        <th className="p-4 whitespace-nowrap border-b border-slate-200 print:border-black">Partenza</th>
                                        <th className="p-4 whitespace-nowrap border-b border-slate-200 print:border-black">Ritorno</th>
                                        <th className="p-4 border-b border-slate-200 print:border-black">Richiedente</th>
                                        <th className="p-4 border-b border-slate-200 print:border-black">Automezzo</th>
                                        <th className="p-4 border-b border-slate-200 print:border-black">Tipo Servizio</th>
                                        <th className="p-4 border-b border-slate-200 print:border-black">Destinazione</th>
                                        <th className="p-4 text-center border-b border-slate-200 print:hidden w-24">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 print:divide-black">
                                    {sortedBookings.map((booking, index) => {
                                        const startDate = new Date(booking.startDate);
                                        const endDate = new Date(booking.endDate);
                                        const isPast = new Date() > endDate;
                                        const isCancelled = booking.isCancelled;

                                        return (
                                            <tr 
                                                key={booking.id} 
                                                className={`
                                                    hover:bg-slate-50 transition-colors
                                                    ${isCancelled ? 'bg-red-50 text-red-400 line-through decoration-red-400 decoration-2' : ''}
                                                    ${isPast && !isCancelled ? 'bg-slate-50/50 text-slate-400 print:text-slate-500' : ''}
                                                    ${!isPast && !isCancelled ? 'text-slate-800' : ''}
                                                    ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30 print:bg-transparent'}
                                                `}
                                            >
                                                <td className="p-4 whitespace-nowrap font-mono print:border-b print:border-slate-300">
                                                    <div className="font-bold">{startDate.toLocaleDateString()}</div>
                                                    <div className="text-xs opacity-75">{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap font-mono print:border-b print:border-slate-300">
                                                    <div className="font-bold">{endDate.toLocaleDateString()}</div>
                                                    <div className="text-xs opacity-75">{endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </td>
                                                <td className="p-4 font-bold print:border-b print:border-slate-300">
                                                    {booking.requesterName}
                                                    {isCancelled && <span className="block text-[9px] no-underline font-normal text-red-600 mt-1">Annullato da: {booking.cancelledBy}</span>}
                                                </td>
                                                <td className="p-4 print:border-b print:border-slate-300">
                                                    <span className="font-bold text-slate-700">
                                                        {booking.vehicleName}
                                                    </span>
                                                </td>
                                                <td className="p-4 print:border-b print:border-slate-300">
                                                    {booking.serviceType}
                                                </td>
                                                <td className="p-4 print:border-b print:border-slate-300">
                                                    {booking.destination}
                                                </td>
                                                <td className="p-4 text-center print:hidden whitespace-nowrap">
                                                    {!isCancelled && !isPast && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEdit(booking)}
                                                                className="text-blue-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                                                title="Modifica"
                                                            >
                                                                <EditIcon className="h-4 w-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCancel(booking.id)}
                                                                className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                                title="Annulla"
                                                            >
                                                                <span className="font-black text-xs">X</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button 
                                                            onClick={() => handleDelete(booking.id)}
                                                            className="text-red-300 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors ml-1"
                                                            title="ELIMINA DEFINITIVAMENTE (Super Admin)"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default VehicleBookingView;
