import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Star, Paperclip } from 'lucide-react';
import { useEmailStore, useSessionStore } from '@/stores/mail';
import type { EmailListItem } from '@/types/mail';

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isThisYear) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSender(email: EmailListItem): string {
    const from = email.from?.[0];
    if (!from) return '(unknown)';
    return from.name || from.email;
}

function EmailRow({ email }: { email: EmailListItem }) {
    const selectedEmailId = useEmailStore((s) => s.selectedEmailId);
    const selectEmail = useEmailStore((s) => s.selectEmail);
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);

    const isSelected = selectedEmailId === email.id;
    const isUnread = !email.keywords['$seen'];
    const isFlagged = email.keywords['$flagged'];

    const handleClick = () => {
        if (client && session?.accountId) {
            selectEmail(client, session.accountId, email.id);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left transition-colors ${
                isSelected
                    ? 'bg-[var(--scheme-accent)]/10'
                    : 'hover:bg-muted/50'
            }`}
        >
            {/* Unread indicator */}
            <div className="mt-1.5 flex shrink-0 flex-col items-center gap-1">
                <div
                    className={`h-2 w-2 rounded-full ${isUnread ? 'bg-[var(--scheme-accent)]' : 'bg-transparent'}`}
                />
                {isFlagged && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={`truncate text-sm ${isUnread ? 'font-semibold' : ''}`}>
                        {formatSender(email)}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatDate(email.receivedAt)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`truncate text-sm ${isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                        {email.subject || '(no subject)'}
                    </span>
                    {email.hasAttachment && (
                        <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                    {email.preview}
                </p>
            </div>
        </button>
    );
}

export default function EmailList() {
    const parentRef = useRef<HTMLDivElement>(null);
    const emails = useEmailStore((s) => s.emails);
    const total = useEmailStore((s) => s.total);
    const isLoading = useEmailStore((s) => s.isLoading);

    const rowVirtualizer = useVirtualizer({
        count: emails.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76,
        overscan: 10,
    });

    if (isLoading && emails.length === 0) {
        return (
            <div className="flex flex-1 flex-col gap-1 overflow-hidden p-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted" />
                ))}
            </div>
        );
    }

    if (emails.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                No emails in this folder
            </div>
        );
    }

    return (
        <div className="flex flex-col overflow-hidden">
            {/* Count bar */}
            <div className="shrink-0 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                {total} email{total !== 1 ? 's' : ''}
            </div>

            {/* Virtual list */}
            <div ref={parentRef} className="flex-1 overflow-y-auto">
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <EmailRow email={emails[virtualItem.index]} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
