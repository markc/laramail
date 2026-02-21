import { Head, usePage } from '@inertiajs/react';
import { useEffect, useLayoutEffect } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { useSessionStore, useMailboxStore, useEmailStore } from '@/stores/mail';
import { useJmapPoll } from '@/hooks/use-jmap-poll';
import { useMailShortcuts } from '@/hooks/use-mail-shortcuts';
import JmapConnectForm from '@/components/mail/jmap-connect-form';
import MailLayout from '@/components/mail/mail-layout';
import EmailList from '@/components/mail/email-list';
import EmailReader from '@/components/mail/email-reader';
import ComposePanel from '@/components/mail/compose-panel';

type MailPageProps = {
    hasJmapSession: boolean;
};

export default function MailIndex() {
    const { hasJmapSession } = usePage<{ props: MailPageProps }>().props as unknown as MailPageProps;
    const { setNoPadding, setPanel } = useTheme();

    const session = useSessionStore((s) => s.session);
    const client = useSessionStore((s) => s.client);
    const loadSession = useSessionStore((s) => s.loadSession);
    const fetchMailboxes = useMailboxStore((s) => s.fetchMailboxes);
    const selectedMailboxId = useMailboxStore((s) => s.selectedMailboxId);
    const fetchEmails = useEmailStore((s) => s.fetchEmails);

    // Full-bleed layout, show mailboxes panel
    useLayoutEffect(() => {
        setNoPadding(true);
        setPanel('left', 3);
        return () => setNoPadding(false);
    }, [setNoPadding, setPanel]);

    // Load session on mount if user has one
    useEffect(() => {
        if (hasJmapSession && !session) {
            loadSession();
        }
    }, [hasJmapSession, session, loadSession]);

    // Fetch mailboxes once session is ready
    useEffect(() => {
        if (client && session?.accountId) {
            fetchMailboxes(client, session.accountId);
        }
    }, [client, session?.accountId, fetchMailboxes]);

    // Fetch emails when a mailbox is selected
    useEffect(() => {
        if (client && session?.accountId && selectedMailboxId) {
            fetchEmails(client, session.accountId, selectedMailboxId);
        }
    }, [client, session?.accountId, selectedMailboxId, fetchEmails]);

    // Enable polling and keyboard shortcuts
    useJmapPoll();
    useMailShortcuts();

    const isConnected = session?.connected;

    return (
        <>
            <Head title="Mail" />
            {!isConnected ? (
                <JmapConnectForm />
            ) : (
                <>
                    <MailLayout
                        list={<EmailList />}
                        reader={<EmailReader />}
                    />
                    <ComposePanel />
                </>
            )}
        </>
    );
}
