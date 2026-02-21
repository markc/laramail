import { useEffect, useRef } from 'react';
import { useSessionStore, useMailboxStore, useEmailStore } from '@/stores/mail';

export function useJmapPoll(intervalMs = 15000) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);
    const selectedMailboxId = useMailboxStore((s) => s.selectedMailboxId);
    const fetchMailboxes = useMailboxStore((s) => s.fetchMailboxes);
    const fetchEmails = useEmailStore((s) => s.fetchEmails);

    useEffect(() => {
        if (!client || !session?.accountId) return;

        intervalRef.current = setInterval(() => {
            // Refresh mailbox counts
            fetchMailboxes(client, session.accountId!);

            // Refresh email list for current mailbox
            if (selectedMailboxId) {
                fetchEmails(client, session.accountId!, selectedMailboxId);
            }
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [client, session?.accountId, selectedMailboxId, intervalMs, fetchMailboxes, fetchEmails]);
}
