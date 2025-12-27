
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    limit,
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { Intervention, InterventionTypology, DutyOfficer } from '../types';

export const InterventionService = {
    // --- LISTENERS ---
    
    subscribeToInterventions: (onUpdate: (data: Intervention[]) => void) => {
        // Ultimi 200 interventi
        const q = query(collection(db, 'interventions'), orderBy('date', 'desc'), orderBy('exitTime', 'desc'), limit(200));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Intervention)));
        });
    },

    subscribeToTypologies: (onUpdate: (data: InterventionTypology[]) => void) => {
        const q = query(collection(db, 'intervention_typologies'), orderBy('name', 'asc'));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as InterventionTypology)));
        });
    },

    subscribeToOfficers: (onUpdate: (data: DutyOfficer[]) => void) => {
        const q = query(collection(db, 'duty_officers'), orderBy('name', 'asc'));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as DutyOfficer)));
        });
    },

    // --- OPERATIONS ---

    addIntervention: async (intervention: Omit<Intervention, 'id'>) => {
        await addDoc(collection(db, 'interventions'), intervention);
    },

    deleteIntervention: async (id: string) => {
        await deleteDoc(doc(db, 'interventions', id));
    },

    addTypology: async (name: string) => {
        await addDoc(collection(db, 'intervention_typologies'), { name });
    },

    deleteTypology: async (id: string) => {
        await deleteDoc(doc(db, 'intervention_typologies', id));
    },

    addOfficer: async (name: string) => {
        await addDoc(collection(db, 'duty_officers'), { name });
    },

    deleteOfficer: async (id: string) => {
        await deleteDoc(doc(db, 'duty_officers', id));
    }
};
