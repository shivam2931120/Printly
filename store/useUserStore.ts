import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
    preferences: {
        theme: 'dark' | 'light'; // Even though strictly dark, keeping flexibility
        notifications: boolean;
    };
    updatePreferences: (prefs: Partial<UserState['preferences']>) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            preferences: {
                theme: 'dark',
                notifications: true,
            },
            updatePreferences: (prefs) => set((state) => ({
                preferences: { ...state.preferences, ...prefs }
            })),
        }),
        {
            name: 'printly-user-storage',
        }
    )
);
