
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    updateDoc,
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
        const q = query(collection(db, 'interventions'), orderBy('date', 'desc'), limit(200));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            const items = s.docs.map(d => ({ ...d.data(), id: d.id } as Intervention));
            // Ordinamento lato client per Data + Ora Uscita (per gestire meglio i casi limite)
            items.sort((a, b) => {
                const dateDiff = b.date.localeCompare(a.date);
                if (dateDiff !== 0) return dateDiff;
                return b.exitTime.localeCompare(a.exitTime);
            });
            onUpdate(items);
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

    updateIntervention: async (intervention: Intervention) => {
        const { id, ...data } = intervention;
        await updateDoc(doc(db, 'interventions', id), data);
    },

    // Soft delete (sets flag)
    deleteIntervention: async (id: string, user: string = 'User') => {
        await updateDoc(doc(db, 'interventions', id), {
            isDeleted: true,
            deletedBy: user,
            deletedAt: new Date().toISOString()
        });
    },

    // Hard delete (removes document) - Super Admin only
    permanentDeleteIntervention: async (id: string) => {
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
