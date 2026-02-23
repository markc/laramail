import { create } from 'zustand';
import { JamClient } from 'jmap-jam';
import { createJamClient, fetchPrimaryIdentityId } from '@/lib/jmap-client';
import type { JmapSession } from '@/types/mail';

interface SessionState {
    session: JmapSession | null;
    client: JamClient | null;
    isConnecting: boolean;
    error: string | null;
    connect: (email: string, password: string) => Promise<boolean>;
    loadSession: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    session: null,
    client: null,
    isConnecting: false,
    error: null,

    connect: async (email, password) => {
        set({ isConnecting: true, error: null });
        try {
            const res = await fetch('/api/jmap/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                set({ isConnecting: false, error: data.message ?? 'Connection failed' });
                return false;
            }

            return get().loadSession();
        } catch (e) {
            set({ isConnecting: false, error: 'Network error' });
            return false;
        }
    },

    loadSession: async () => {
        set({ isConnecting: true, error: null });
        try {
            const res = await fetch('/api/jmap/session', {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });

            const session: JmapSession = await res.json();

            if (!session.connected) {
                set({ session: null, client: null, isConnecting: false });
                return false;
            }

            const client = createJamClient(session);
            set({ session, client, isConnecting: false });

            // Fetch identity ID in background for compose
            if (session.accountId) {
                fetchPrimaryIdentityId(client, session.accountId)
                    .then((identityId) => {
                        if (identityId) {
                            set((s) => ({ session: s.session ? { ...s.session, identityId } : s.session }));
                        }
                    })
                    .catch(() => {});
            }

            return true;
        } catch (e) {
            set({ isConnecting: false, error: 'Failed to load session' });
            return false;
        }
    },

    disconnect: async () => {
        try {
            await fetch('/api/jmap/disconnect', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
        } catch {
            // Ignore disconnect errors
        }
        set({ session: null, client: null, error: null });
    },

    reset: () => set({ session: null, client: null, isConnecting: false, error: null }),
}));
