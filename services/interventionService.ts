
import { db } from '../firebaseConfig';
import { Intervention, InterventionTypology, DutyOfficer } from '../types';

export const InterventionService = {
    // --- LISTENERS ---
    
    subscribeToInterventions: (onUpdate: (data: Intervention[]) => void) => {
        // Ultimi 200 interventi
        return db.collection('interventions').orderBy('date', 'desc').limit(200).onSnapshot((s) => {
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
        return db.collection('intervention_typologies').orderBy('name', 'asc').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as InterventionTypology)));
        });
    },

    subscribeToOfficers: (onUpdate: (data: DutyOfficer[]) => void) => {
        return db.collection('duty_officers').orderBy('name', 'asc').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as DutyOfficer)));
        });
    },

    // --- OPERATIONS ---

    addIntervention: async (intervention: Omit<Intervention, 'id'>) => {
        await db.collection('interventions').add(intervention);
    },

    updateIntervention: async (intervention: Intervention) => {
        const { id, ...data } = intervention;
        await db.collection('interventions').doc(id).update(data);
    },

    // Soft delete (sets flag)
    deleteIntervention: async (id: string, user: string = 'User') => {
        await db.collection('interventions').doc(id).update({
            isDeleted: true,
            deletedBy: user,
            deletedAt: new Date().toISOString()
        });
    },

    // Hard delete (removes document) - Super Admin only
    permanentDeleteIntervention: async (id: string) => {
        await db.collection('interventions').doc(id).delete();
    },

    addTypology: async (name: string) => {
        await db.collection('intervention_typologies').add({ name });
    },

    deleteTypology: async (id: string) => {
        await db.collection('intervention_typologies').doc(id).delete();
    },

    addOfficer: async (name: string) => {
        await db.collection('duty_officers').add({ name });
    },

    deleteOfficer: async (id: string) => {
        await db.collection('duty_officers').doc(id).delete();
    }
};
