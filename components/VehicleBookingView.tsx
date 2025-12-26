
import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleBooking, StaffMember, Shift } from '../types';
import { BackArrowIcon, TruckIcon, CalendarIcon, CheckIcon, TrashIcon, FilterIcon } from './Icons';
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

    // Filter State for Staff Dropdown
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

        if (endDateTime <= startDateTime) {
            alert("La data di ritorno deve essere successiva alla partenza.");
            return;
        }

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
            // Costruzione Payload pulito per evitare errori su undefined
            const payload: Omit<VehicleBooking, 'id' | 'timestamp'> = {
                vehicleId: selectedVehicle,
                vehicleName,
                startDate: startDateTime,
                endDate: endDateTime,
                requesterType: isExternal ? 'external' : 'internal',
                requesterName,
                serviceType: serviceType as any,
                destination
            };

            // Aggiungi campi opzionali solo se necessari
            if (!isExternal) {
                payload.internalStaffId = internalStaffId;
            } else {
                payload.externalGrade = extGrade || '';
                payload.externalLocation = extLocation;
            }

            await onAddBooking(payload);
            
            // Reset Form
            setDestination('');
            setInternalStaffId('');
            setExtName('');
            setExtSurname('');
            alert("Prenotazione confermata!");
        } catch (error: any) {
            console.error("Booking Error:", error);
            alert("Errore durante la prenotazione: " + (error.message || "Riprova."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Vuoi cancellare questa prenotazione?")) {
            await onDeleteBooking(id);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-red-700 text-white px-6 py-5 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)]">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-red-800/30 px-4 py-2 rounded-full hover:bg-red-800/50 transition-colors"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm">Indietro</span>
                </button>
                
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <span className="text-4xl filter drop-shadow-sm">🚒</span> 
                    <span>Autoparco</span>
                </h1>
                
                <div className="w-24"></div> {/* Spacer to center title */}
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SINISTRA: FORM DI PRENOTAZIONE */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-fit">
                    <div className="bg-slate-100 p-4 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-red-600" /> Nuova Richiesta
                        </h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Date e Orari */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Partenza *</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded p-2 text-sm" required />
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded p-2 text-sm mt-1" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ritorno *</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded p-2 text-sm" required />
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border rounded p-2 text-sm mt-1" required />
                            </div>
                        </div>

                        {/* Richiedente */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={!isExternal} onChange={() => setIsExternal(false)} className="text-red-600 focus:ring-red-500" />
                                    <span className="text-sm font-bold text-slate-700">Interno (Distaccamento)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={isExternal} onChange={() => setIsExternal(true)} className="text-red-600 focus:ring-red-500" />
                                    <span className="text-sm font-bold text-slate-700">Esterno</span>
                                </label>
                            </div>

                            {!isExternal ? (
                                <div className="space-y-2">
                                    {/* FILTRI TURNO */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1"><FilterIcon className="h-3 w-3 inline"/></span>
                                        {['all', 'a', 'b', 'c', 'd'].map(shift => (
                                            <button
                                                key={shift}
                                                type="button"
                                                onClick={() => setStaffShiftFilter(shift as Shift | 'all')}
                                                className={`
                                                    px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors border
                                                    ${staffShiftFilter === shift 
                                                        ? 'bg-slate-700 text-white border-slate-700' 
                                                        : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'}
                                                `}
                                            >
                                                {shift === 'all' ? 'Tutti' : shift}
                                            </button>
                                        ))}
                                    </div>

                                    <select 
                                        value={internalStaffId} 
                                        onChange={e => setInternalStaffId(e.target.value)} 
                                        className="w-full border rounded p-2 text-sm bg-white"
                                    >
                                        <option value="">-- Seleziona Personale ({filteredStaff.length}) --</option>
                                        {filteredStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shift.toUpperCase()})</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <select value={extGrade} onChange={e => setExtGrade(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                                        <option value="">-- Grado --</option>
                                        {VVF_GRADES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="text" placeholder="Nome" value={extName} onChange={e => setExtName(e.target.value)} className="border rounded p-2 text-sm" />
                                        <input type="text" placeholder="Cognome" value={extSurname} onChange={e => setExtSurname(e.target.value)} className="border rounded p-2 text-sm" />
                                    </div>
                                    <input type="text" placeholder="Sede di Servizio" value={extLocation} onChange={e => setExtLocation(e.target.value)} className="w-full border rounded p-2 text-sm" />
                                </div>
                            )}
                        </div>

                        {/* Veicolo e Servizio */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Veicolo *</label>
                                <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full border rounded p-2 text-sm bg-white" required>
                                    <option value="">-- Seleziona Mezzo --</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.model} - {v.plate} ({v.fuelType})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo Servizio</label>
                                    <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full border rounded p-2 text-sm bg-white">
                                        <option value="Servizio Comando">Servizio Comando</option>
                                        <option value="Missione">Missione</option>
                                        <option value="Sostituzione personale">Sostituzione Personale</option>
                                        <option value="Altro">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Destinazione *</label>
                                    <input type="text" value={destination} onChange={e => setDestination(e.target.value)} className="w-full border rounded p-2 text-sm" placeholder="Es. Siena, Roma..." required />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? 'Salvataggio...' : <><CheckIcon className="h-5 w-5" /> Conferma Prenotazione</>}
                        </button>
                    </form>
                </div>

                {/* DESTRA: LISTA PRENOTAZIONI */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 uppercase border-b-2 border-red-500 pb-2">
                        Prospetto Prenotazioni
                    </h2>
                    
                    {sortedBookings.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-10">Nessuna prenotazione futura.</p>
                    ) : (
                        <div className="space-y-3">
                            {sortedBookings.map(booking => {
                                const startDate = new Date(booking.startDate);
                                const endDate = new Date(booking.endDate);
                                const isPast = new Date() > endDate;

                                return (
                                    <div key={booking.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex flex-col gap-2 relative ${isPast ? 'border-slate-300 opacity-60' : 'border-red-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">{booking.requesterName}</h3>
                                                <p className="text-xs text-slate-500 font-mono">{booking.serviceType} → {booking.destination}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700 inline-block">
                                                    {booking.vehicleName}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">
                                            <div>
                                                <span className="font-bold text-slate-400 block text-[9px] uppercase">Partenza</span>
                                                {startDate.toLocaleDateString()} <span className="font-mono">{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="text-slate-300">➜</div>
                                            <div>
                                                <span className="font-bold text-slate-400 block text-[9px] uppercase">Ritorno</span>
                                                {endDate.toLocaleDateString()} <span className="font-mono">{endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>

                                        {(isSuperAdmin || !isPast) && (
                                            <button 
                                                onClick={() => handleDelete(booking.id)}
                                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default VehicleBookingView;
