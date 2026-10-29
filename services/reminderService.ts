
import { db, FieldValue } from '../lib/db';
import { Reminder } from '../types';

export const ReminderService = {
    subscribeToReminders: (onUpdate: (data: Reminder[]) => void) => {
        return db.collection('reminders').onSnapshot((s) => {
            onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Reminder)));
        });
    },

    addReminder: async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => {
        // Remove undefined fields to avoid sending undefined values
        const cleanReminder = Object.fromEntries(
            Object.entries(reminder).filter(([_, v]) => v !== undefined)
        );

        await db.collection('reminders').add({
            ...cleanReminder,
            completedDates: [],
            createdAt: new Date().toISOString()
        });
    },

    updateReminder: async (id: string, reminder: Partial<Reminder>) => {
        const cleanReminder = Object.fromEntries(
            Object.entries(reminder).filter(([_, v]) => v !== undefined)
        );
        await db.collection('reminders').doc(id).update(cleanReminder);
    },

    deleteReminder: async (id: string) => {
        await db.collection('reminders').doc(id).delete();
    },

    toggleCompletion: async (id: string, date: string, currentCompletedDates: string[]) => {
        const isCompleted = currentCompletedDates.includes(date);
        const ref = db.collection('reminders').doc(id);
        
        if (isCompleted) {
            await ref.update({
                completedDates: FieldValue.arrayRemove(date)
            });
        } else {
            await ref.update({
                completedDates: FieldValue.arrayUnion(date)
            });
        }
    }
};
