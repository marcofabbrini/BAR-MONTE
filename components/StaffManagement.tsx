
import React, { useState, useEffect, useRef } from 'react';
import { StaffMember, Shift, UserRole } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, UserPlusIcon, LockIcon, ShieldCheckIcon, EyeIcon } from './Icons';
import { VVF_GRADES } from '../constants';
import { useBar } from '../contexts/BarContext';

interface StaffManagementProps {
    staff: StaffMember[];
    onAddStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (staffMember: StaffMember) => Promise<void>;
    onDeleteStaff: (staffId: string) => Promise<void>;
}

// --- NUOVO COMPONENTE BADGE GRAFICO (Posizionato più in alto e più stondato) ---
export const GradeBadge = ({ grade }: { grade?: string }) => {
    if (!grade) return null;
    const conf = VVF_GRADES.find(g => g.id === grade || g.short === grade);
    
    // Fallback per gradi sconosciuti
    if (!conf) {
        return (
            <div className="absolute -top-[6px] -right-[6px] z-10 flex items-center justify-center h-[18px] min-w-[24px] px-1 rounded-[2px] text-[7px] font-black text-white bg-slate-500 border border-slate-600 uppercase">
                {grade}
            </div>
        );
    }

    const isBar = conf.type === 'bar';
    
    return (
        <div 
            className={`
                flex flex-col items-center justify-center gap-[1px]
                w-[26px] h-[18px] rounded-[3px] shadow-sm
                bg-[#722F37] /* Amaranto VVF */
                ${isBar ? 'border-[1px] border-yellow-400' : 'border-[0.5px] border-[#5a232b]'}
            `}
            title={conf.label}
        >
            {/* RENDER CHEVRONS (V rovesciate Argentate - Allungate) */}
            {!isBar && Array.from({ length: conf.count }).map((_, i) => (
                <div key={i} className="w-full flex justify-center -mt-[2px] first:mt-0">
                     {/* SVG Chevron Down Silver (Elongated) */}
                     <svg width="20" height="5" viewBox="0 0 20 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 1 L10 4 L18 1" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            ))}

            {/* RENDER BARS (Barre Dorate) */}
            {isBar && Array.from({ length: conf.count }).map((_, i) => (
                <div key={i} className="w-[16px] h-[2px] bg-yellow-400 rounded-sm shadow-sm my-[0.5px]"></div>
            ))}
        </div>
    );
};

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }) => {
    const { activeBarUser, availableRoles } = useBar();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [grade, setGrade] = useState('');
    const [shift, setShift] = useState<Shift>('a');
    const [rcSubGroup, setRcSubGroup] = useState<number>(1);
    const [icon, setIcon] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole | string>('standard');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isProcessingImg, setIsProcessingImg] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filtri
    const [filterShifts, setFilterShifts] = useState<Set<Shift>>(new Set(['a', 'b', 'c', 'd']));

    // Determine current user's max promotion level
    const currentUserRoleLevel = availableRoles.find(r => r.id === (activeBarUser?.role || 'standard'))?.level || 1;

    const filteredRoles = availableRoles.filter(r => {
        // Can only assign roles lower or equal to own level
        if (r.level > currentUserRoleLevel) return false;
        
        // Only actual Super Admin can see 'Super Admin' option (even if level matches)
        if (r.id === 'super-admin' && activeBarUser?.role !== 'super-admin') return false;
        
        return true;
    });

    const resetForm = () => {
        setName('');
        setUsername('');
        setGrade('');
        setShift('a');
        setRcSubGroup(1);
        setIcon('');
        setPhotoUrl('');
        setPassword('');
        setRole('standard');
        setIsEditing(null);
        setShowPassword(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleOpenAdd = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (member: StaffMember) => {
        setIsEditing(member.id);
        setName(member.name);
        setUsername(member.username || '');
        setGrade(member.grade || '');
        setShift(member.shift);
        setRcSubGroup(member.rcSubGroup || 1);
        setIcon(member.icon || '');
        setPhotoUrl(member.photoUrl || '');
        setPassword(member.password || '');
        setRole(member.role || 'standard');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const toggleFilter = (s: Shift) => {
        const newFilters = new Set(filterShifts);
        if (newFilters.has(s)) newFilters.delete(s);
        else newFilters.add(s);
        setFilterShifts(newFilters);
    };

    const filteredStaff = staff.filter(m => filterShifts.has(m.shift));

    // --- FUNZIONE COMPRESSIONE IMMAGINE ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessingImg(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Ridimensiona a max 150x150 per avatar (leggerissimo)
                    const MAX_WIDTH = 150;
                    const MAX_HEIGHT = 150;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Comprime in JPEG a bassa qualità (0.7)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setPhotoUrl(dataUrl);
                    setIcon(''); // Resetta emoji se si carica foto
                    setIsProcessingImg(false);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            // Se il ruolo è super-admin, il rcSubGroup non è applicabile (o lo settiamo a 0/default)
            // Se non è super-admin, usa il valore del form
            const finalRcSubGroup = role === 'super-admin' ? 0 : rcSubGroup;

            const dataToSave = { 
                name: name.trim(), 
                username: username.trim(),
                grade: grade.trim(), 
                shift, 
                rcSubGroup: finalRcSubGroup, 
                icon,
                photoUrl,
                password: password.trim(),
                role
            };

            if (isEditing) {
                const memberToUpdate = staff.find(m => m.id === isEditing);
                if (memberToUpdate) await onUpdateStaff({ ...memberToUpdate, ...dataToSave });
            } else {
                await onAddStaff(dataToSave);
            }
            // Close IMMEDIATELY on success
            handleCloseModal();
        } catch (error) { 
            console.error(error); 
            alert("Errore nel salvataggio. L'immagine potrebbe essere troppo grande, prova un'altra foto."); 
        }
    };
    
    const handleDeleteStaff = async (id: string) => { if (window.confirm('Eliminare membro?')) await onDeleteStaff(id); };

    return (
        <div className="max-w-5xl mx-auto relative">
            
            {/* Pulsante Nuovo Dipendente Mobile/Desktop */}
            <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Gestione Personale</h2>
                    <p className="text-xs text-slate-500">Anagrafica VVF Turni A-B-C-D</p>
                </div>
                <button 
                    onClick={handleOpenAdd} 
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center shadow-md transition-all active:scale-95"
                >
                    <span className="text-xl leading-none">➕</span>
                </button>
            </div>

            {/* MODALE POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
                        {/* Header Modale */}
                        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                {isEditing ? <EditIcon className="h-5 w-5 text-blue-500"/> : <UserPlusIcon className="h-5 w-5 text-green-500"/>}
                                {isEditing ? 'Modifica Scheda' : 'Nuovo Inserimento'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        {/* Body Form - Scrollable */}
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {/* AVATAR UPLOAD SECTION */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative w-24 h-24 rounded-full border-4 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        {isProcessingImg ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                                        ) : photoUrl ? (
                                            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl">{icon || '👤'}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">Carica</span>
                                        </div>
                                        
                                        {/* LIVE PREVIEW BADGE */}
                                        {grade && <div className="scale-150 origin-center absolute top-[-4px] right-[-4px] z-20"><GradeBadge grade={grade} /></div>}
                                    </div>
                                    
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    
                                    <div className="w-1/2">
                                        <input type="text" placeholder="Emoji (es. 👨‍🚒)" value={icon} onChange={(e) => { setIcon(e.target.value); if(e.target.value) setPhotoUrl(''); }} className="w-full bg-slate-100 rounded-md px-2 py-1 text-center text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Cognome e Nome</label>
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Es. Rossi Mario" required />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Username (Opzionale)</label>
                                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Se diverso dal nome" />
                                        <p className="text-[9px] text-slate-400 mt-1">Se impostato, usare questo per il login.</p>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Qualifica / Grado</label>
                                        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Seleziona Grado --</option>
                                            {VVF_GRADES.map(g => (
                                                <option key={g.id} value={g.id}>{g.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Turno</label>
                                        <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-bold uppercase">
                                            <option value="a">A</option>
                                            <option value="b">B</option>
                                            <option value="c">C</option>
                                            <option value="d">D</option>
                                        </select>
                                    </div>
                                    
                                    {/* HIDE SALTO IF SUPER ADMIN */}
                                    {role !== 'super-admin' && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Salto (1-8)</label>
                                            <select value={rcSubGroup} onChange={(e) => setRcSubGroup(parseInt(e.target.value))} className="w-full mt-1 bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-lg px-3 py-2.5">
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                    <option key={num} value={num}>Gr. {num}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <ShieldCheckIcon className="h-3 w-3" /> Livello Accesso
                                        </label>
                                        <select 
                                            value={role} 
                                            onChange={(e) => setRole(e.target.value)} 
                                            className="w-full mt-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {filteredRoles.map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">Puoi assegnare ruoli fino al tuo livello ({activeBarUser?.role || 'Standard'}).</p>
                                    </div>

                                    <div className="col-span-2 border-t pt-4 mt-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <LockIcon className="h-3 w-3" /> Password Accesso
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                value={password} 
                                                onChange={(e) => setPassword(e.target.value)} 
                                                placeholder="Opzionale (vuoto = accesso libero)" 
                                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                                title={showPassword ? "Nascondi Password" : "Mostra Password"}
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Controlla qui se ci sono spazi indesiderati nella password.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleCloseModal} className="flex-1 bg-slate-200 text-slate-600 font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors">Annulla</button>
                                    <button type="submit" disabled={isProcessingImg} className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                                    {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />} 
                                    {isEditing ? 'Salva' : 'Aggiungi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtri */}
            <div className="mb-6 flex gap-3 items-center flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">Visualizza Turno:</span>
                {(['a', 'b', 'c', 'd'] as Shift[]).map(s => (
                    <button 
                        key={s} 
                        onClick={() => toggleFilter(s)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${filterShifts.has(s) ? 'bg-white border-slate-300 text-slate-800 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${filterShifts.has(s) ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        Turno {s.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Lista Griglia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.length === 0 ? <p className="col-span-full text-center text-slate-400 italic py-10">Nessun personale trovato.</p> : 
                    filteredStaff.map(member => (
                        <div key={member.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 group hover:shadow-md transition-all">
                            
                            {/* AVATAR IN LISTA (Slightly smaller on mobile for better fit) */}
                            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-visible">
                                <div className="w-full h-full rounded-full overflow-hidden">
                                    {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl flex items-center justify-center w-full h-full pb-1">{member.icon || '👤'}</span>
                                    )}
                                </div>
                                {/* Badge Grado */}
                                {member.grade && (
                                    <div className="absolute -top-1 -right-1 z-10">
                                        <GradeBadge grade={member.grade} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{VVF_GRADES.find(g=>g.id===member.grade)?.label || member.grade || 'Personale'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center mt-2 flex-wrap">
                                    <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">
                                        {member.shift.toUpperCase()}
                                    </span>
                                    {/* HIDE SALTO IF SUPER ADMIN */}
                                    {member.role !== 'super-admin' && (
                                        <span className="text-[10px] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded text-purple-700 font-bold">
                                            Salto {member.rcSubGroup || 1}
                                        </span>
                                    )}
                                    {member.role && member.role !== 'standard' && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                                            member.role === 'super-admin' 
                                                ? 'bg-red-50 text-red-700 border-red-100' 
                                                : availableRoles.find(r => r.id === member.role)?.level === 3 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                                    : 'bg-green-50 text-green-700 border-green-100' // Level 2 (Manager) and others
                                        }`}>
                                            <ShieldCheckIcon className="h-3 w-3" /> 
                                            {availableRoles.find(r => r.id === member.role)?.label || member.role}
                                        </span>
                                    )}
                                    {member.password && <LockIcon className="h-3 w-3 text-slate-300" title="Password Impostata" />}
                                </div>
                            </div>

                            {/* Actions always visible on mobile/touch, hover on desktop */}
                            <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleOpenEdit(member)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><EditIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteStaff(member.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default StaffManagement;
