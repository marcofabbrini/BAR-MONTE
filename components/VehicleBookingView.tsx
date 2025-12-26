
import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleBooking, StaffMember, Shift } from '../types';
import { BackArrowIcon, CalendarIcon, CheckIcon, TrashIcon, FilterIcon, SortIcon, PrinterIcon } from './Icons';
import { VVF_GRADES } from '../constants';

interface VehicleBookingViewProps {
    onGoBack: () => void;
    vehicles: Vehicle[];
    bookings: VehicleBooking[];
    staff: StaffMember[];
    onAddBooking: (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => Promise<void>;
    onDeleteBooking: (id: string) => Promise<void>;
    isSuperAdmin?: boolean | null;
}

const VehicleBookingView: React.FC<VehicleBookingViewProps> = ({ 
    onGoBack, vehicles, bookings, staff, onAddBooking, onDeleteBooking, isSuperAdmin 
}) => {
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
    const [isFormOpen, setIsFormOpen] = useState(false); // Collapsed by default
    const [staffShiftFilter, setStaffShiftFilter] = useState<Shift | 'all'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sorted bookings by date
    const sortedBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [bookings]);

    // Filtered Staff List (Exclude 'Cassa' and filter by Shift)
    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            // Escludi utenti "Cassa"
            if (s.name.toLowerCase().includes('cassa')) return false;
            
            // Filtra per turno se selezionato
            if (staffShiftFilter !== 'all' && s.shift !== staffShiftFilter) return false;
            
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [staff, staffShiftFilter]);

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
            // COSTRUZIONE PAYLOAD SICURA (Evita undefined)
            const basePayload = {
                vehicleId: selectedVehicle,
                vehicleName,
                startDate: startDateTime,
                endDate: endDateTime,
                requesterType: isExternal ? 'external' : 'internal', // Cast esplicito sotto
                requesterName,
                serviceType: serviceType as any,
                destination
            };

            let finalPayload: any = { ...basePayload };

            if (isExternal) {
                finalPayload.externalGrade = extGrade || '';
                finalPayload.externalLocation = extLocation || '';
            } else {
                finalPayload.internalStaffId = internalStaffId;
            }

            await onAddBooking(finalPayload);
            
            // Reset Form e chiudi
            setDestination('');
            setInternalStaffId('');
            setExtName('');
            setExtSurname('');
            setIsFormOpen(false); // Chiudi il form dopo successo
            alert("Prenotazione confermata!");
        } catch (error: any) {
            console.error("Booking Error:", error);
            alert("Errore durante la prenotazione: " + (error.message || "Controlla i dati e riprova."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Vuoi cancellare questa prenotazione?")) {
            await onDeleteBooking(id);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* HEADER MIGLIORATO (NASCOSTO IN STAMPA) */}
            <header className="bg-red-700 text-white px-4 py-4 md:px-6 md:py-5 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)] print:hidden">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-red-800/40 px-4 py-2 rounded-full hover:bg-red-800/60 transition-colors backdrop-blur-sm"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md transform translate-y-0.5">
                    <span className="text-3xl md:text-5xl filter drop-shadow-sm">🚗</span> 
                    <span>Automezzi</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
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
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className={`w-full p-4 flex justify-between items-center transition-colors ${isFormOpen ? 'bg-slate-100 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}
                    >
                        <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2 text-lg">
                            <CalendarIcon className="h-6 w-6 text-red-600" /> Nuova Richiesta
                        </h2>
                        <div className={`transform transition-transform duration-300 ${isFormOpen ? 'rotate-180' : 'rotate-0'}`}>
                            <SortIcon className="h-5 w-5 text-slate-400" />
                        </div>
                    </button>
                    
                    {isFormOpen && (
                        <div className="animate-slide-up">
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Date e Orari */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Partenza *</label>
                                        <div className="flex gap-2">
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded p-2 text-sm" required />
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-24 border rounded p-2 text-sm" required />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ritorno *</label>
                                        <div className="flex gap-2">
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded p-2 text-sm" required />
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-24 border rounded p-2 text-sm" required />
                                        </div>
                                    </div>
                                </div>

                                {/* Richiedente */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
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
                                            {/* FILTRI TURNO */}
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1"><FilterIcon className="h-3 w-3"/> Filtra:</span>
                                                {['all', 'a', 'b', 'c', 'd'].map(shift => (
                                                    <button
                                                        key={shift}
                                                        type="button"
                                                        onClick={() => setStaffShiftFilter(shift as Shift | 'all')}
                                                        className={`
                                                            px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border
                                                            ${staffShiftFilter === shift 
                                                                ? 'bg-slate-700 text-white border-slate-700 shadow-sm' 
                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}
                                                        `}
                                                    >
                                                        {shift === 'all' ? 'Tutti' : shift}
                                                    </button>
                                                ))}
                                            </div>

                                            <select 
                                                value={internalStaffId} 
                                                onChange={e => setInternalStaffId(e.target.value)} 
                                                className="w-full border rounded-lg p-3 text-sm bg-white font-medium focus:ring-2 focus:ring-red-200 outline-none"
                                            >
                                                <option value="">-- Seleziona Personale ({filteredStaff.length}) --</option>
                                                {filteredStaff.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 animate-fade-in">
                                            <select value={extGrade} onChange={e => setExtGrade(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white">
                                                <option value="">-- Seleziona Grado --</option>
                                                {VVF_GRADES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="text" placeholder="Nome" value={extName} onChange={e => setExtName(e.target.value)} className="border rounded-lg p-2 text-sm" />
                                                <input type="text" placeholder="Cognome" value={extSurname} onChange={e => setExtSurname(e.target.value)} className="border rounded-lg p-2 text-sm" />
                                            </div>
                                            <input type="text" placeholder="Sede di Servizio (es. Comando Siena)" value={extLocation} onChange={e => setExtLocation(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                                        </div>
                                    )}
                                </div>

                                {/* Veicolo e Servizio */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Veicolo *</label>
                                        <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full border rounded-lg p-3 text-sm bg-white font-bold" required>
                                            <option value="">-- Seleziona Mezzo --</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.model} - {v.plate} ({v.fuelType})</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo Servizio</label>
                                            <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full border rounded-lg p-3 text-sm bg-white">
                                                <option value="Servizio Comando">Servizio Comando</option>
                                                <option value="Missione">Missione</option>
                                                <option value="Sostituzione personale">Sostituzione Personale</option>
                                                <option value="Altro">Altro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Destinazione *</label>
                                            <input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="w-full border rounded-lg p-3 text-sm" placeholder="Es. Siena, Roma..." required />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                                >
                                    {isSubmitting ? 'Salvataggio...' : <><CheckIcon className="h-5 w-5" /> Conferma Prenotazione</>}
                                </button>
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
                                        <th className="p-4 text-center border-b border-slate-200 print:hidden w-16">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 print:divide-black">
                                    {sortedBookings.map((booking, index) => {
                                        const startDate = new Date(booking.startDate);
                                        const endDate = new Date(booking.endDate);
                                        const isPast = new Date() > endDate;

                                        return (
                                            <tr 
                                                key={booking.id} 
                                                className={`
                                                    hover:bg-slate-50 transition-colors
                                                    ${isPast ? 'bg-slate-50/50 text-slate-400 print:text-slate-500' : 'text-slate-800'}
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
                                                <td className="p-4 text-center print:hidden">
                                                    {(isSuperAdmin || !isPast) && (
                                                        <button 
                                                            onClick={() => handleDelete(booking.id)}
                                                            className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                            title="Elimina"
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
