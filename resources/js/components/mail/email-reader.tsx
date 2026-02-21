import { Paperclip, Download, Loader2 } from 'lucide-react';
import { useEmailStore } from '@/stores/mail';
import EmailHtmlRenderer from './email-html-renderer';
import EmailActionBar from './email-action-bar';
import type { EmailAddress, EmailBodyPart } from '@/types/mail';

function formatAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

function formatAddresses(addrs: EmailAddress[] | null): string {
    if (!addrs || addrs.length === 0) return '';
    return addrs.map(formatAddress).join(', ');
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentChip({ part }: { part: EmailBodyPart }) {
    const name = part.name ?? 'attachment';
    const href = part.blobId ? `/api/jmap/blob/${part.blobId}/${encodeURIComponent(name)}` : '#';

    return (
        <a
            href={href}
            download={name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
        >
            <Paperclip className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{name}</span>
            <span className="text-muted-foreground">{formatSize(part.size)}</span>
            <Download className="h-3 w-3 text-muted-foreground" />
        </a>
    );
}

export default function EmailReader() {
    const selectedEmail = useEmailStore((s) => s.selectedEmail);
    const isLoadingBody = useEmailStore((s) => s.isLoadingBody);

    if (isLoadingBody) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!selectedEmail) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select an email to read
            </div>
        );
    }

    // Get the body content
    const htmlPart = selectedEmail.htmlBody?.[0];
    const textPart = selectedEmail.textBody?.[0];
    const htmlContent = htmlPart?.partId
        ? selectedEmail.bodyValues[htmlPart.partId]?.value
        : null;
    const textContent = textPart?.partId
        ? selectedEmail.bodyValues[textPart.partId]?.value
        : null;

    const attachments = selectedEmail.attachments ?? [];

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Action bar */}
            <EmailActionBar />

            {/* Email header */}
            <div className="shrink-0 border-b border-border px-4 py-3">
                <h2 className="mb-2 text-lg font-semibold leading-tight">
                    {selectedEmail.subject || '(no subject)'}
                </h2>
                <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-baseline gap-2">
                        <span className="shrink-0 text-muted-foreground">From:</span>
                        <span className="font-medium">{formatAddresses(selectedEmail.from)}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="shrink-0 text-muted-foreground">To:</span>
                        <span>{formatAddresses(selectedEmail.to)}</span>
                    </div>
                    {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                        <div className="flex items-baseline gap-2">
                            <span className="shrink-0 text-muted-foreground">CC:</span>
                            <span>{formatAddresses(selectedEmail.cc)}</span>
                        </div>
                    )}
                    <div className="flex items-baseline gap-2">
                        <span className="shrink-0 text-muted-foreground">Date:</span>
                        <span>
                            {selectedEmail.sentAt
                                ? new Date(selectedEmail.sentAt).toLocaleString()
                                : new Date(selectedEmail.receivedAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-4 py-2">
                    {attachments.map((att, i) => (
                        <AttachmentChip key={att.blobId ?? i} part={att} />
                    ))}
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {htmlContent ? (
                    <EmailHtmlRenderer html={htmlContent} />
                ) : textContent ? (
                    <pre className="whitespace-pre-wrap p-4 text-sm">{textContent}</pre>
                ) : (
                    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                        No content available
                    </div>
                )}
            </div>
        </div>
    );
}
