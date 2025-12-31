
import { db } from '../firebaseConfig';
import { Vehicle, VehicleBooking } from '../types';

export const VehicleService = {
    subscribeToVehicles: (onUpdate: (data: Vehicle[]) => void) => {
        return db.collection('vehicles').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Vehicle)));
        });
    },

    subscribeToBookings: (onUpdate: (data: VehicleBooking[]) => void) => {
        return db.collection('vehicle_bookings').orderBy('startDate', 'asc').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleBooking)));
        });
    },

    addVehicle: async (vehicle: Omit<Vehicle, 'id'>) => {
        await db.collection('vehicles').add(vehicle);
    },

    updateVehicle: async (vehicle: Vehicle) => {
        const { id, ...data } = vehicle;
        await db.collection('vehicles').doc(id).update(data);
    },

    deleteVehicle: async (id: string) => {
        await db.collection('vehicles').doc(id).delete();
    },

    addBooking: async (booking: Omit<VehicleBooking, 'id' | 'timestamp'>) => {
        await db.collection('vehicle_bookings').add({
            ...booking,
            timestamp: new Date().toISOString()
        });
    },

    updateBooking: async (booking: VehicleBooking) => {
        const { id, ...data } = booking;
        await db.collection('vehicle_bookings').doc(id).update(data);
    },

    deleteBooking: async (id: string) => {
        await db.collection('vehicle_bookings').doc(id).delete();
    }
};
