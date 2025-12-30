
import { db } from '../firebaseConfig';
import { OperationalVehicle, VehicleCheck } from '../types';

export const OperationalVehicleService = {
    subscribeToVehicles: (onUpdate: (data: OperationalVehicle[]) => void) => {
        return db.collection('operational_vehicles').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as OperationalVehicle)));
        });
    },

    subscribeToChecks: (onUpdate: (data: VehicleCheck[]) => void) => {
        return db.collection('vehicle_checks').orderBy('timestamp', 'desc').limit(50).onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleCheck)));
        });
    },

    addVehicle: async (vehicle: Omit<OperationalVehicle, 'id'>) => {
        await db.collection('operational_vehicles').add(vehicle);
    },

    updateVehicle: async (vehicle: OperationalVehicle) => {
        const { id, ...data } = vehicle;
        await db.collection('operational_vehicles').doc(id).update(data);
    },

    deleteVehicle: async (id: string) => {
        await db.collection('operational_vehicles').doc(id).delete();
    },

    // Check Methods
    addCheck: async (check: Omit<VehicleCheck, 'id'>) => {
        await db.collection('vehicle_checks').add(check);
    },

    updateCheck: async (id: string, updates: Partial<VehicleCheck>) => {
        await db.collection('vehicle_checks').doc(id).update(updates);
    }
};
