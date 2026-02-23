import { code } from '@streamdown/code';
import { FileText, Copy, Download, Check, RefreshCw, Pencil } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Streamdown } from 'streamdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBasePath } from '@/hooks/use-base-path';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
    onEdit?: (message: Message) => void;
    onRetry?: (message: Message) => void;
}

function formatCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
}

function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatFullDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
        + ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function ActionButton({ onClick, title, children }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button onClick={onClick} className="rounded p-1 hover:bg-muted transition-colors">
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
        </Tooltip>
    );
}

function UserMessageActions({ message, onEdit, onRetry }: {
    message: Message;
    onEdit?: (message: Message) => void;
    onRetry?: (message: Message) => void;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [message.content]);

    return (
        <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
            {message.created_at && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-xs tabular-nums mr-1 cursor-default">
                            {formatTime(message.created_at)}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {formatFullDate(message.created_at)}
                    </TooltipContent>
                </Tooltip>
            )}
            {onRetry && (
                <ActionButton onClick={() => onRetry(message)} title="Retry">
                    <RefreshCw className="h-3.5 w-3.5" />
                </ActionButton>
            )}
            {onEdit && (
                <ActionButton onClick={() => onEdit(message)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                </ActionButton>
            )}
            <ActionButton onClick={handleCopy} title="Copy">
                {copied
                    ? <Check className="h-3.5 w-3.5 text-green-500" />
                    : <Copy className="h-3.5 w-3.5" />
                }
            </ActionButton>
        </div>
    );
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatModelLabel(model: string): string {
    // Shorten common model names
    const map: Record<string, string> = {
        'openclaw:clawd-chat': 'Clawd Chat 🐾',
        'openclaw:clawd-dev': 'Clawd Dev 🐾',
        'claude-sonnet-4-5-20250929': 'Sonnet 4.5',
        'claude-opus-4-6': 'Opus 4.6',
        'claude-3-5-haiku-20241022': 'Haiku 3.5',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-5': 'GPT-5',
        'gpt-5-mini': 'GPT-5 Mini',
        'gpt-5.2': 'GPT-5.2',
        'o3-mini': 'o3 Mini',
        'gemini-2.0-flash': 'Gemini Flash',
        'gemini-2.0-flash-lite': 'Gemini Flash Lite',
        'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
    };
    return map[model] ?? model;
}

function AssistantActions({ content, role, inputTokens, outputTokens, cost, durationMs, modelLabel }: {
    content: string;
    role: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cost?: number | null;
    durationMs?: number | null;
    modelLabel?: string | null;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [content]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${role}-message.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [content, role]);

    return (
        <div className="flex items-center justify-end gap-3 mt-1.5">
            {(modelLabel || durationMs != null || inputTokens != null) && (
                <p className="text-muted-foreground text-xs">
                    {modelLabel && formatModelLabel(modelLabel)}
                    {modelLabel && (durationMs != null || inputTokens != null) && ' · '}
                    {durationMs != null && formatDuration(durationMs)}
                    {durationMs != null && inputTokens != null && ' · '}
                    {inputTokens != null && `${formatTokens(inputTokens)} in / ${formatTokens(outputTokens ?? 0)} out`}
                    {cost != null && ` · ${formatCost(cost)}`}
                </p>
            )}
            <div className="flex gap-0.5">
                <button onClick={handleCopy} className="rounded p-1 hover:bg-muted" title="Copy message">
                    {copied
                        ? <Check className="h-3.5 w-3.5 text-green-500" />
                        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                </button>
                <button onClick={handleDownload} className="rounded p-1 hover:bg-muted" title="Download as markdown">
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            </div>
        </div>
    );
}

export default function MessageBubble({ message, isStreaming = false, onEdit, onRetry }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const { url } = useBasePath();

    return (
        <div>
            {isUser ? (
                <div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                        {hasAttachments && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {message.attachments!.map(att => (
                                    att.mime_type.startsWith('image/') ? (
                                        <a key={att.id} href={url(`/chat/attachment/${att.id}`)} target="_blank" rel="noopener">
                                            <img
                                                src={url(`/chat/attachment/${att.id}`)}
                                                alt={att.filename}
                                                className="h-20 w-20 rounded-lg object-cover border"
                                            />
                                        </a>
                                    ) : (
                                        <a
                                            key={att.id}
                                            href={url(`/chat/attachment/${att.id}`)}
                                            target="_blank"
                                            rel="noopener"
                                            className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            {att.filename}
                                        </a>
                                    )
                                ))}
                            </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                    {!isStreaming && (
                        <div className="mt-1">
                            <UserMessageActions message={message} onEdit={onEdit} onRetry={onRetry} />
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown
                            mode={isStreaming ? 'streaming' : 'static'}
                            isAnimating={isStreaming}
                            plugins={{ code }}
                            linkSafety={{ enabled: false }}
                        >
                            {message.content}
                        </Streamdown>
                    </div>
                    {!isStreaming && (
                        <AssistantActions
                            content={message.content}
                            role={message.role}
                            inputTokens={message.input_tokens}
                            outputTokens={message.output_tokens}
                            cost={message.cost}
                            durationMs={(message as any).duration_ms}
                            modelLabel={(message as any).model_label}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
