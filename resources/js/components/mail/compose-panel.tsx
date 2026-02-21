import { useState } from 'react';
import { X, Send, Loader2, Paperclip, Plus, Minus } from 'lucide-react';
import { useComposeStore, useSessionStore } from '@/stores/mail';
import type { EmailAddress } from '@/types/mail';

function AddressInput({
    label,
    addresses,
    onChange,
}: {
    label: string;
    addresses: EmailAddress[];
    onChange: (addrs: EmailAddress[]) => void;
}) {
    const [input, setInput] = useState('');

    const addAddress = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        onChange([...addresses, { name: null, email: trimmed }]);
        setInput('');
    };

    const removeAddress = (index: number) => {
        onChange(addresses.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            addAddress();
        }
        if (e.key === 'Backspace' && input === '' && addresses.length > 0) {
            removeAddress(addresses.length - 1);
        }
    };

    return (
        <div className="flex items-start gap-2">
            <label className="shrink-0 pt-1.5 text-xs text-muted-foreground w-8">{label}:</label>
            <div className="flex min-h-[32px] flex-1 flex-wrap items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
                {addresses.map((addr, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
                    >
                        {addr.name || addr.email}
                        <button onClick={() => removeAddress(i)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addAddress}
                    className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
                    placeholder={addresses.length === 0 ? 'Add recipient...' : ''}
                />
            </div>
        </div>
    );
}

export default function ComposePanel() {
    const { isOpen, compose, isSending, error, updateCompose, send, close } = useComposeStore();
    const client = useSessionStore((s) => s.client);
    const session = useSessionStore((s) => s.session);
    const [showCc, setShowCc] = useState(compose.cc.length > 0);
    const [showBcc, setShowBcc] = useState(compose.bcc.length > 0);

    if (!isOpen) return null;

    const from: EmailAddress = {
        name: session?.displayName ?? null,
        email: session?.accountId ?? '',
    };

    const handleSend = async () => {
        if (client && session?.accountId) {
            await send(client, session.accountId, from);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/jmap/blob/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: formData,
            });
            const data = await res.json();
            if (data.blobId) {
                updateCompose({
                    attachments: [
                        ...compose.attachments,
                        { blobId: data.blobId, name: file.name, type: data.type, size: data.size },
                    ],
                });
            }
        } catch {
            // Upload failed, ignore
        }

        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        updateCompose({
            attachments: compose.attachments.filter((_, i) => i !== index),
        });
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-2xl">
            <div
                className="flex flex-col rounded-t-xl shadow-2xl"
                style={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderBottom: 'none',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <h3 className="text-sm font-medium">
                        {compose.replyType === 'reply'
                            ? 'Reply'
                            : compose.replyType === 'replyAll'
                              ? 'Reply All'
                              : compose.replyType === 'forward'
                                ? 'Forward'
                                : 'New Message'}
                    </h3>
                    <button onClick={close} className="rounded p-1 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Recipients */}
                <div className="flex flex-col gap-1 border-b border-border px-4 py-2">
                    <AddressInput
                        label="To"
                        addresses={compose.to}
                        onChange={(to) => updateCompose({ to })}
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <button
                            onClick={() => setShowCc(!showCc)}
                            className="flex items-center gap-0.5 hover:text-foreground"
                        >
                            {showCc ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />} Cc
                        </button>
                        <button
                            onClick={() => setShowBcc(!showBcc)}
                            className="flex items-center gap-0.5 hover:text-foreground"
                        >
                            {showBcc ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />} Bcc
                        </button>
                    </div>
                    {showCc && (
                        <AddressInput
                            label="Cc"
                            addresses={compose.cc}
                            onChange={(cc) => updateCompose({ cc })}
                        />
                    )}
                    {showBcc && (
                        <AddressInput
                            label="Bcc"
                            addresses={compose.bcc}
                            onChange={(bcc) => updateCompose({ bcc })}
                        />
                    )}
                </div>

                {/* Subject */}
                <div className="border-b border-border px-4 py-2">
                    <input
                        type="text"
                        value={compose.subject}
                        onChange={(e) => updateCompose({ subject: e.target.value })}
                        placeholder="Subject"
                        className="w-full bg-transparent text-sm outline-none"
                    />
                </div>

                {/* Body */}
                <div className="px-4 py-2">
                    <textarea
                        value={compose.body}
                        onChange={(e) => updateCompose({ body: e.target.value })}
                        placeholder="Write your message..."
                        rows={8}
                        className="w-full resize-none bg-transparent text-sm outline-none"
                    />
                </div>

                {/* Attachments */}
                {compose.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
                        {compose.attachments.map((att, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
                                <Paperclip className="h-3 w-3" />
                                {att.name}
                                <button onClick={() => removeAttachment(i)} className="hover:text-red-500">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="px-4 py-1.5 text-xs text-red-500">{error}</div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 border-t border-border px-4 py-2">
                    <button
                        onClick={handleSend}
                        disabled={isSending || compose.to.length === 0}
                        className="flex items-center gap-2 rounded-lg bg-[var(--scheme-accent)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send
                    </button>

                    <label className="cursor-pointer rounded-lg p-1.5 hover:bg-muted">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            </div>
        </div>
    );
}
