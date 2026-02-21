import { create } from 'zustand';
import type { JamClient } from 'jmap-jam';
import { deleteEmail, fetchEmailBody, fetchEmails, moveEmail, setEmailKeywords } from '@/lib/jmap-client';
import type { EmailFull, EmailListItem } from '@/types/mail';

interface EmailState {
    emails: EmailListItem[];
    selectedEmail: EmailFull | null;
    selectedEmailId: string | null;
    total: number;
    position: number;
    isLoading: boolean;
    isLoadingBody: boolean;
    fetchEmails: (client: JamClient, accountId: string, mailboxId: string, opts?: { position?: number }) => Promise<void>;
    selectEmail: (client: JamClient, accountId: string, emailId: string) => Promise<void>;
    clearSelection: () => void;
    markRead: (client: JamClient, accountId: string, emailId: string) => Promise<void>;
    markUnread: (client: JamClient, accountId: string, emailId: string) => Promise<void>;
    toggleFlag: (client: JamClient, accountId: string, emailId: string) => Promise<void>;
    moveToTrash: (client: JamClient, accountId: string, emailId: string, trashMailboxId: string, currentMailboxId: string) => Promise<void>;
    permanentDelete: (client: JamClient, accountId: string, emailId: string) => Promise<void>;
    moveToMailbox: (client: JamClient, accountId: string, emailId: string, fromMailboxId: string, toMailboxId: string) => Promise<void>;
    reset: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
    emails: [],
    selectedEmail: null,
    selectedEmailId: null,
    total: 0,
    position: 0,
    isLoading: false,
    isLoadingBody: false,

    fetchEmails: async (client, accountId, mailboxId, opts) => {
        set({ isLoading: true });
        try {
            const result = await fetchEmails(client, accountId, mailboxId, opts);
            set({
                emails: result.emails,
                total: result.total,
                position: result.position,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false });
        }
    },

    selectEmail: async (client, accountId, emailId) => {
        set({ selectedEmailId: emailId, isLoadingBody: true });
        try {
            const email = await fetchEmailBody(client, accountId, emailId);
            set({ selectedEmail: email, isLoadingBody: false });

            // Mark as read if unread
            if (email && !email.keywords['$seen']) {
                get().markRead(client, accountId, emailId);
            }
        } catch {
            set({ isLoadingBody: false });
        }
    },

    clearSelection: () => set({ selectedEmail: null, selectedEmailId: null }),

    markRead: async (client, accountId, emailId) => {
        // Optimistic update
        set((state) => ({
            emails: state.emails.map((e) =>
                e.id === emailId ? { ...e, keywords: { ...e.keywords, $seen: true } } : e,
            ),
            selectedEmail:
                state.selectedEmail?.id === emailId
                    ? { ...state.selectedEmail, keywords: { ...state.selectedEmail.keywords, $seen: true } }
                    : state.selectedEmail,
        }));

        try {
            await setEmailKeywords(client, accountId, emailId, { $seen: true });
        } catch {
            // Revert on failure would go here
        }
    },

    markUnread: async (client, accountId, emailId) => {
        set((state) => ({
            emails: state.emails.map((e) =>
                e.id === emailId ? { ...e, keywords: { ...e.keywords, $seen: false } } : e,
            ),
        }));

        try {
            await setEmailKeywords(client, accountId, emailId, { $seen: null });
        } catch {
            // Revert on failure
        }
    },

    toggleFlag: async (client, accountId, emailId) => {
        const email = get().emails.find((e) => e.id === emailId);
        if (!email) return;

        const flagged = !email.keywords['$flagged'];

        set((state) => ({
            emails: state.emails.map((e) =>
                e.id === emailId ? { ...e, keywords: { ...e.keywords, $flagged: flagged } } : e,
            ),
        }));

        try {
            await setEmailKeywords(client, accountId, emailId, {
                $flagged: flagged ? true : null,
            });
        } catch {
            // Revert on failure
        }
    },

    moveToTrash: async (client, accountId, emailId, trashMailboxId, currentMailboxId) => {
        set((state) => ({
            emails: state.emails.filter((e) => e.id !== emailId),
            selectedEmail: state.selectedEmailId === emailId ? null : state.selectedEmail,
            selectedEmailId: state.selectedEmailId === emailId ? null : state.selectedEmailId,
        }));

        try {
            await moveEmail(client, accountId, emailId, currentMailboxId, trashMailboxId);
        } catch {
            // Revert on failure
        }
    },

    permanentDelete: async (client, accountId, emailId) => {
        set((state) => ({
            emails: state.emails.filter((e) => e.id !== emailId),
            selectedEmail: state.selectedEmailId === emailId ? null : state.selectedEmail,
            selectedEmailId: state.selectedEmailId === emailId ? null : state.selectedEmailId,
        }));

        try {
            await deleteEmail(client, accountId, emailId);
        } catch {
            // Revert on failure
        }
    },

    moveToMailbox: async (client, accountId, emailId, fromMailboxId, toMailboxId) => {
        set((state) => ({
            emails: state.emails.filter((e) => e.id !== emailId),
            selectedEmail: state.selectedEmailId === emailId ? null : state.selectedEmail,
            selectedEmailId: state.selectedEmailId === emailId ? null : state.selectedEmailId,
        }));

        try {
            await moveEmail(client, accountId, emailId, fromMailboxId, toMailboxId);
        } catch {
            // Revert on failure
        }
    },

    reset: () => set({
        emails: [],
        selectedEmail: null,
        selectedEmailId: null,
        total: 0,
        position: 0,
        isLoading: false,
        isLoadingBody: false,
    }),
}));
