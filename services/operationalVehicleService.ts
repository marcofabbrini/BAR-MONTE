
import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    QuerySnapshot,
    DocumentData,
    query,
    orderBy,
    limit
} from 'firebase/firestore';
import { OperationalVehicle, VehicleCheck } from '../types';

export const OperationalVehicleService = {
    subscribeToVehicles: (onUpdate: (data: OperationalVehicle[]) => void) => {
        return onSnapshot(collection(db, 'operational_vehicles'), (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as OperationalVehicle)));
        });
    },

    subscribeToChecks: (onUpdate: (data: VehicleCheck[]) => void) => {
        // Ultimi 50 controlli
        const q = query(collection(db, 'vehicle_checks'), orderBy('timestamp', 'desc'), limit(50));
        return onSnapshot(q, (s: QuerySnapshot<DocumentData>) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleCheck)));
        });
    },

    addVehicle: async (vehicle: Omit<OperationalVehicle, 'id'>) => {
        await addDoc(collection(db, 'operational_vehicles'), vehicle);
    },

    updateVehicle: async (vehicle: OperationalVehicle) => {
        const { id, ...data } = vehicle;
        await updateDoc(doc(db, 'operational_vehicles', id), data);
    },

    deleteVehicle: async (id: string) => {
        await deleteDoc(doc(db, 'operational_vehicles', id));
    },

    // Check Methods
    addCheck: async (check: Omit<VehicleCheck, 'id'>) => {
        await addDoc(collection(db, 'vehicle_checks'), check);
    },

    updateCheck: async (id: string, updates: Partial<VehicleCheck>) => {
        await updateDoc(doc(db, 'vehicle_checks', id), updates);
    }
};
