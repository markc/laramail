import { create } from 'zustand';
import type { JamClient } from 'jmap-jam';
import { buildMailboxTree, fetchMailboxes, findMailboxByRole } from '@/lib/jmap-client';
import type { MailboxNode, SpecialRole } from '@/types/mail';

interface MailboxState {
    mailboxes: MailboxNode[];
    mailboxTree: MailboxNode[];
    selectedMailboxId: string | null;
    specialMailboxes: Partial<Record<SpecialRole, MailboxNode>>;
    isLoading: boolean;
    fetchMailboxes: (client: JamClient, accountId: string) => Promise<void>;
    selectMailbox: (id: string) => void;
    reset: () => void;
}

export const useMailboxStore = create<MailboxState>((set) => ({
    mailboxes: [],
    mailboxTree: [],
    selectedMailboxId: null,
    specialMailboxes: {},
    isLoading: false,

    fetchMailboxes: async (client, accountId) => {
        set({ isLoading: true });
        try {
            const mailboxes = await fetchMailboxes(client, accountId);
            const tree = buildMailboxTree(mailboxes);

            const specialMailboxes: Partial<Record<SpecialRole, MailboxNode>> = {};
            for (const role of ['inbox', 'sent', 'drafts', 'trash', 'junk', 'archive'] as const) {
                const mb = findMailboxByRole(mailboxes, role);
                if (mb) {
                    specialMailboxes[role] = mb;
                }
            }

            const inboxId = specialMailboxes.inbox?.id ?? mailboxes[0]?.id ?? null;

            set({
                mailboxes,
                mailboxTree: tree,
                specialMailboxes,
                selectedMailboxId: inboxId,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false });
        }
    },

    selectMailbox: (id) => set({ selectedMailboxId: id }),

    reset: () => set({
        mailboxes: [],
        mailboxTree: [],
        selectedMailboxId: null,
        specialMailboxes: {},
        isLoading: false,
    }),
}));
