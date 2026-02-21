import { useCallback } from 'react';
import { useSessionStore, useMailboxStore, useEmailStore, useComposeStore } from '@/stores/mail';
import type { EmailFull, EmailAddress } from '@/types/mail';

export function useEmailActions() {
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);
    const selectedMailboxId = useMailboxStore((s) => s.selectedMailboxId);
    const specialMailboxes = useMailboxStore((s) => s.specialMailboxes);
    const { markRead, markUnread, toggleFlag, moveToTrash, permanentDelete, moveToMailbox, fetchEmails } = useEmailStore();
    const { openReply, openReplyAll, openForward, openNew } = useComposeStore();

    const accountId = session?.accountId;
    const trashId = specialMailboxes.trash?.id;

    const handleMarkRead = useCallback(
        (emailId: string) => {
            if (client && accountId) markRead(client, accountId, emailId);
        },
        [client, accountId, markRead],
    );

    const handleMarkUnread = useCallback(
        (emailId: string) => {
            if (client && accountId) markUnread(client, accountId, emailId);
        },
        [client, accountId, markUnread],
    );

    const handleToggleFlag = useCallback(
        (emailId: string) => {
            if (client && accountId) toggleFlag(client, accountId, emailId);
        },
        [client, accountId, toggleFlag],
    );

    const handleDelete = useCallback(
        (emailId: string) => {
            if (!client || !accountId || !selectedMailboxId) return;
            if (selectedMailboxId === trashId) {
                permanentDelete(client, accountId, emailId);
            } else if (trashId) {
                moveToTrash(client, accountId, emailId, trashId, selectedMailboxId);
            }
        },
        [client, accountId, selectedMailboxId, trashId, moveToTrash, permanentDelete],
    );

    const handleMove = useCallback(
        (emailId: string, toMailboxId: string) => {
            if (client && accountId && selectedMailboxId) {
                moveToMailbox(client, accountId, emailId, selectedMailboxId, toMailboxId);
            }
        },
        [client, accountId, selectedMailboxId, moveToMailbox],
    );

    const handleReply = useCallback(
        (email: EmailFull, from: EmailAddress) => openReply(email, from),
        [openReply],
    );

    const handleReplyAll = useCallback(
        (email: EmailFull, from: EmailAddress) => openReplyAll(email, from),
        [openReplyAll],
    );

    const handleForward = useCallback(
        (email: EmailFull) => openForward(email),
        [openForward],
    );

    const handleCompose = useCallback(() => openNew(), [openNew]);

    const handleRefresh = useCallback(() => {
        if (client && accountId && selectedMailboxId) {
            fetchEmails(client, accountId, selectedMailboxId);
        }
    }, [client, accountId, selectedMailboxId, fetchEmails]);

    return {
        handleMarkRead,
        handleMarkUnread,
        handleToggleFlag,
        handleDelete,
        handleMove,
        handleReply,
        handleReplyAll,
        handleForward,
        handleCompose,
        handleRefresh,
    };
}
