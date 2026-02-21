import { Reply, ReplyAll, Forward, Trash2, MailOpen, Mail, Star, Archive } from 'lucide-react';
import { useEmailActions } from '@/hooks/use-email-actions';
import { useEmailStore, useSessionStore, useMailboxStore } from '@/stores/mail';
import type { EmailAddress } from '@/types/mail';

function ActionButton({
    icon: Icon,
    label,
    onClick,
    destructive = false,
}: {
    icon: typeof Reply;
    label: string;
    onClick: () => void;
    destructive?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`rounded-lg p-1.5 transition-colors ${
                destructive
                    ? 'hover:bg-red-500/10 hover:text-red-500'
                    : 'hover:bg-muted hover:text-[var(--scheme-accent)]'
            }`}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

export default function EmailActionBar() {
    const selectedEmail = useEmailStore((s) => s.selectedEmail);
    const session = useSessionStore((s) => s.session);
    const specialMailboxes = useMailboxStore((s) => s.specialMailboxes);
    const {
        handleReply,
        handleReplyAll,
        handleForward,
        handleDelete,
        handleMarkRead,
        handleMarkUnread,
        handleToggleFlag,
        handleMove,
    } = useEmailActions();

    if (!selectedEmail) return null;

    const isUnread = !selectedEmail.keywords['$seen'];
    const from: EmailAddress = {
        name: session?.displayName ?? null,
        email: '', // Will be filled from identity
    };

    return (
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
            <ActionButton icon={Reply} label="Reply" onClick={() => handleReply(selectedEmail, from)} />
            <ActionButton icon={ReplyAll} label="Reply All" onClick={() => handleReplyAll(selectedEmail, from)} />
            <ActionButton icon={Forward} label="Forward" onClick={() => handleForward(selectedEmail)} />

            <div className="mx-1 h-4 w-px bg-border" />

            {specialMailboxes.archive && (
                <ActionButton
                    icon={Archive}
                    label="Archive"
                    onClick={() => handleMove(selectedEmail.id, specialMailboxes.archive!.id)}
                />
            )}
            <ActionButton icon={Trash2} label="Delete" onClick={() => handleDelete(selectedEmail.id)} destructive />

            <div className="mx-1 h-4 w-px bg-border" />

            <ActionButton
                icon={isUnread ? MailOpen : Mail}
                label={isUnread ? 'Mark read' : 'Mark unread'}
                onClick={() => isUnread ? handleMarkRead(selectedEmail.id) : handleMarkUnread(selectedEmail.id)}
            />
            <ActionButton icon={Star} label="Toggle flag" onClick={() => handleToggleFlag(selectedEmail.id)} />
        </div>
    );
}
