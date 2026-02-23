import { create } from 'zustand';
import type { JamClient } from 'jmap-jam';
import { sendEmail } from '@/lib/jmap-client';
import { useMailboxStore } from './mailbox-store';
import { useSessionStore } from './session-store';
import type { ComposeState, EmailAddress, EmailFull } from '@/types/mail';

const emptyCompose: ComposeState = {
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: '',
    attachments: [],
    replyType: null,
};

interface ComposeStoreState {
    isOpen: boolean;
    compose: ComposeState;
    isSending: boolean;
    error: string | null;
    openNew: () => void;
    openReply: (email: EmailFull, from: EmailAddress) => void;
    openReplyAll: (email: EmailFull, from: EmailAddress) => void;
    openForward: (email: EmailFull) => void;
    updateCompose: (updates: Partial<ComposeState>) => void;
    send: (client: JamClient, accountId: string, from: EmailAddress) => Promise<boolean>;
    close: () => void;
    reset: () => void;
}

function quoteBody(email: EmailFull): string {
    const date = email.sentAt ? new Date(email.sentAt).toLocaleString() : '';
    const from = email.from?.[0]?.email ?? 'unknown';
    const textPart = email.textBody?.[0];
    const textContent = textPart?.partId
        ? email.bodyValues[textPart.partId]?.value ?? ''
        : '';

    return `\n\nOn ${date}, ${from} wrote:\n${textContent.split('\n').map((l) => `> ${l}`).join('\n')}`;
}

export const useComposeStore = create<ComposeStoreState>((set, get) => ({
    isOpen: false,
    compose: { ...emptyCompose },
    isSending: false,
    error: null,

    openNew: () => {
        set({ isOpen: true, compose: { ...emptyCompose }, error: null });
    },

    openReply: (email, from) => {
        const replyTo = email.replyTo?.[0] ?? email.from?.[0];
        set({
            isOpen: true,
            error: null,
            compose: {
                ...emptyCompose,
                to: replyTo ? [replyTo] : [],
                subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject ?? ''}`,
                body: quoteBody(email),
                inReplyTo: email.id,
                references: [email.id],
                replyType: 'reply',
            },
        });
    },

    openReplyAll: (email, from) => {
        const replyTo = email.replyTo?.[0] ?? email.from?.[0];
        const allRecipients = [...(email.to ?? []), ...(email.cc ?? [])].filter(
            (addr) => addr.email !== from.email,
        );
        set({
            isOpen: true,
            error: null,
            compose: {
                ...emptyCompose,
                to: replyTo ? [replyTo] : [],
                cc: allRecipients,
                subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject ?? ''}`,
                body: quoteBody(email),
                inReplyTo: email.id,
                references: [email.id],
                replyType: 'replyAll',
            },
        });
    },

    openForward: (email) => {
        const textPart = email.textBody?.[0];
        const textContent = textPart?.partId
            ? email.bodyValues[textPart.partId]?.value ?? ''
            : '';

        const header = [
            '---------- Forwarded message ----------',
            `From: ${email.from?.[0]?.email ?? ''}`,
            `Date: ${email.sentAt ?? ''}`,
            `Subject: ${email.subject ?? ''}`,
            `To: ${email.to?.map((t) => t.email).join(', ') ?? ''}`,
            '',
        ].join('\n');

        set({
            isOpen: true,
            error: null,
            compose: {
                ...emptyCompose,
                subject: email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject ?? ''}`,
                body: `\n\n${header}${textContent}`,
                replyType: 'forward',
            },
        });
    },

    updateCompose: (updates) => {
        set((state) => ({
            compose: { ...state.compose, ...updates },
        }));
    },

    send: async (client, accountId, from) => {
        const { compose } = get();
        set({ isSending: true, error: null });

        try {
            const draftsMailboxId = useMailboxStore.getState().specialMailboxes.drafts?.id;
            const identityId = useSessionStore.getState().session?.identityId;
            await sendEmail(client, accountId, {
                from: [from],
                to: compose.to,
                cc: compose.cc,
                bcc: compose.bcc,
                subject: compose.subject,
                textBody: compose.body,
                inReplyTo: compose.inReplyTo ? [compose.inReplyTo] : undefined,
                references: compose.references,
                attachments: compose.attachments,
                draftsMailboxId,
                identityId,
            });
            set({ isSending: false, isOpen: false, compose: { ...emptyCompose } });
            return true;
        } catch (e) {
            let msg: string;
            if (e instanceof Error) {
                msg = e.message;
            } else if (typeof e === 'object' && e !== null) {
                msg = (e as Record<string, unknown>).detail as string
                    ?? (e as Record<string, unknown>).message as string
                    ?? JSON.stringify(e);
            } else {
                msg = String(e);
            }
            console.error('Send email failed:', e);
            set({ isSending: false, error: `Failed to send: ${msg}` });
            return false;
        }
    },

    close: () => set({ isOpen: false }),

    reset: () => set({ isOpen: false, compose: { ...emptyCompose }, isSending: false, error: null }),
}));
