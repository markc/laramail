import { Archive, File, Inbox, Send, Star, Trash2, AlertTriangle, Folder, ChevronRight, LogOut } from 'lucide-react';
import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { useMailboxStore, useSessionStore, useEmailStore } from '@/stores/mail';
import type { MailboxNode, SpecialRole } from '@/types/mail';
import type { SharedData } from '@/types';

const roleIcons: Record<SpecialRole, typeof Inbox> = {
    inbox: Inbox,
    sent: Send,
    drafts: File,
    trash: Trash2,
    junk: AlertTriangle,
    archive: Archive,
};

const roleOrder: SpecialRole[] = ['inbox', 'sent', 'drafts', 'trash', 'junk', 'archive'];

function MailboxItem({ node, depth = 0 }: { node: MailboxNode; depth?: number }) {
    const [expanded, setExpanded] = useState(true);
    const selectedMailboxId = useMailboxStore((s) => s.selectedMailboxId);
    const selectMailbox = useMailboxStore((s) => s.selectMailbox);
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);
    const fetchEmails = useEmailStore((s) => s.fetchEmails);
    const clearSelection = useEmailStore((s) => s.clearSelection);

    const isActive = selectedMailboxId === node.id;
    const hasChildren = node.children.length > 0;
    const Icon = (node.role ? roleIcons[node.role as SpecialRole] : null) ?? Folder;

    const handleClick = () => {
        selectMailbox(node.id);
        clearSelection();
        if (client && session?.accountId) {
            fetchEmails(client, session.accountId, node.id);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-1.5 text-sm transition-colors ${
                    isActive
                        ? 'border-[var(--scheme-accent)] bg-background text-[var(--scheme-accent)]'
                        : 'border-transparent hover:border-muted-foreground hover:bg-background'
                }`}
                style={{
                    paddingLeft: `${depth * 16 + 12}px`,
                    color: isActive ? 'var(--scheme-accent)' : undefined,
                }}
            >
                {hasChildren && (
                    <ChevronRight
                        className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                    />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{node.name}</span>
                {node.unreadEmails > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-[var(--scheme-accent)] px-1.5 py-0.5 text-xs font-medium text-white">
                        {node.unreadEmails}
                    </span>
                )}
            </button>
            {hasChildren && expanded && node.children.map((child) => (
                <MailboxItem key={child.id} node={child} depth={depth + 1} />
            ))}
        </>
    );
}

export default function MailboxesPanel() {
    const mailboxes = useMailboxStore((s) => s.mailboxes);
    const mailboxTree = useMailboxStore((s) => s.mailboxTree);
    const specialMailboxes = useMailboxStore((s) => s.specialMailboxes);
    const isLoading = useMailboxStore((s) => s.isLoading);
    const session = useSessionStore((s) => s.session);
    const disconnect = useSessionStore((s) => s.disconnect);
    const { auth } = usePage<SharedData>().props;

    if (!session?.connected) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-sm text-muted-foreground">
                <Inbox className="mb-2 h-8 w-8 opacity-50" />
                <p>Not connected to mail</p>
                <p className="text-xs">Visit the Mail page to connect</p>
            </div>
        );
    }

    if (isLoading && mailboxes.length === 0) {
        return (
            <div className="flex flex-col gap-2 p-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-7 animate-pulse rounded bg-muted" />
                ))}
            </div>
        );
    }

    // Show special folders first, then the tree for everything else
    const specialIds = new Set(Object.values(specialMailboxes).map((m) => m!.id));
    const otherRoots = mailboxTree.filter((n) => !specialIds.has(n.id));

    return (
        <nav className="flex flex-col py-2">
            {/* Account display + Logout */}
            {auth?.user?.email && (
                <div className="flex items-center gap-1 px-3 pb-2">
                    <span className="truncate flex-1 text-xs text-muted-foreground">
                        {auth.user.email}
                    </span>
                    <button
                        onClick={disconnect}
                        title="Logout from mail"
                        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Special folders first */}
            {roleOrder.map((role) => {
                const mb = specialMailboxes[role];
                if (!mb) return null;
                return <MailboxItem key={mb.id} node={mb} />;
            })}

            {/* Separator if there are other folders */}
            {otherRoots.length > 0 && (
                <div className="mx-3 my-2 border-t border-border" />
            )}

            {/* Other folders */}
            {otherRoots.map((node) => (
                <MailboxItem key={node.id} node={node} />
            ))}
        </nav>
    );
}
