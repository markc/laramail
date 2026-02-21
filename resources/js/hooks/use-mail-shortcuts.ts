import { useEffect } from 'react';
import { useEmailStore, useSessionStore, useComposeStore } from '@/stores/mail';
import { useEmailActions } from './use-email-actions';

export function useMailShortcuts() {
    const emails = useEmailStore((s) => s.emails);
    const selectedEmailId = useEmailStore((s) => s.selectedEmailId);
    const selectedEmail = useEmailStore((s) => s.selectedEmail);
    const selectEmail = useEmailStore((s) => s.selectEmail);
    const clearSelection = useEmailStore((s) => s.clearSelection);
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);
    const isComposing = useComposeStore((s) => s.isOpen);

    const {
        handleReply,
        handleReplyAll,
        handleForward,
        handleDelete,
        handleMarkUnread,
        handleToggleFlag,
        handleCompose,
    } = useEmailActions();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't handle shortcuts when composing or in an input
            if (isComposing) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const currentIndex = emails.findIndex((em) => em.id === selectedEmailId);

            switch (e.key) {
                case 'j': {
                    // Next email
                    const nextIndex = Math.min(currentIndex + 1, emails.length - 1);
                    if (nextIndex >= 0 && client && session?.accountId) {
                        selectEmail(client, session.accountId, emails[nextIndex].id);
                    }
                    break;
                }
                case 'k': {
                    // Previous email
                    const prevIndex = Math.max(currentIndex - 1, 0);
                    if (prevIndex >= 0 && client && session?.accountId) {
                        selectEmail(client, session.accountId, emails[prevIndex].id);
                    }
                    break;
                }
                case 'Enter': {
                    if (currentIndex >= 0 && client && session?.accountId) {
                        selectEmail(client, session.accountId, emails[currentIndex].id);
                    }
                    break;
                }
                case 'Escape': {
                    clearSelection();
                    break;
                }
                case 'r': {
                    if (selectedEmail) {
                        handleReply(selectedEmail, { name: session?.displayName ?? null, email: '' });
                    }
                    break;
                }
                case 'a': {
                    if (selectedEmail) {
                        handleReplyAll(selectedEmail, { name: session?.displayName ?? null, email: '' });
                    }
                    break;
                }
                case 'f': {
                    if (selectedEmail) {
                        handleForward(selectedEmail);
                    }
                    break;
                }
                case 'c': {
                    handleCompose();
                    break;
                }
                case '#': {
                    if (selectedEmailId) {
                        handleDelete(selectedEmailId);
                    }
                    break;
                }
                case 'u': {
                    if (selectedEmailId) {
                        handleMarkUnread(selectedEmailId);
                    }
                    break;
                }
                case 's': {
                    if (selectedEmailId) {
                        handleToggleFlag(selectedEmailId);
                    }
                    break;
                }
                default:
                    return;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        emails, selectedEmailId, selectedEmail, client, session,
        selectEmail, clearSelection, isComposing,
        handleReply, handleReplyAll, handleForward, handleDelete,
        handleMarkUnread, handleToggleFlag, handleCompose,
    ]);
}
