import { useStream } from '@laravel/stream-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOpenClaw } from '@/hooks/use-openclaw';
import type { Message, ConversationWithMessages, SystemPromptTemplate } from '@/types/chat';
import MessageInput from './message-input';
import MessageList from './message-list';

function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

interface PendingFile {
    file: File;
    preview?: string;
}

interface ChatInterfaceProps {
    conversation?: ConversationWithMessages | null;
    templates: SystemPromptTemplate[];
}

interface TokenStats {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cost?: number | null;
}

// OpenClaw gateway config — proxied through FrankenPHP for WSS
const OPENCLAW_GATEWAY_URL = 'wss://openclaw.goldcoast.org/';
const OPENCLAW_TOKEN = '5cd073074d944752f3c88c98668d39bee68f94d547da50a8';

export default function ChatInterface({ conversation, templates }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(conversation?.messages ?? []);
    const [model, setModel] = useState(() => {
        // localStorage wins — user's last selection persists across refreshes
        const saved = localStorage.getItem('laradav-chat-model');
        return saved ?? conversation?.model ?? 'claude-sonnet-4-5-20250929';
    });
    const [conversationId, setConversationId] = useState<number | undefined>(conversation?.id);
    const [systemPrompt, setSystemPrompt] = useState(conversation?.system_prompt ?? '');
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [webSearch, setWebSearch] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [prismSendTime, setPrismSendTime] = useState<number | null>(null);
    const modelRef = useRef(model);
    useEffect(() => { modelRef.current = model; });

    const isOpenClaw = model.startsWith('openclaw:');

    // Standard Prism streaming (Claude, GPT, Gemini, Claude Code)
    const { data, send, isStreaming: prismStreaming, isFetching, cancel } = useStream<{
        messages: { role: string; content: string }[];
        conversation_id?: number;
        model?: string;
        system_prompt?: string;
        attachment_temp_ids?: string[];
        web_search?: boolean;
        project_dir?: string;
    }>('/chat/stream', {
        csrfToken: '',
        headers: { 'X-XSRF-TOKEN': getXsrfToken() },
        onResponse: (response) => {
            setStreamError(null);
            if (response.redirected) {
                setStreamError('Session expired — please refresh the page.');
            }
            const newId = response.headers.get('X-Conversation-Id');
            if (newId && !conversationId) {
                const id = parseInt(newId, 10);
                setConversationId(id);
                window.history.replaceState({}, '', `/chat/${id}`);
            }
        },
        onError: (error) => {
            const msg = error?.message || String(error);
            const htmlMatch = msg.match(/<title>(.*?)<\/title>/i);
            const cleanMsg = htmlMatch
                ? htmlMatch[1]
                : msg.replace(/<[^>]*>/g, '').slice(0, 300).trim();
            setStreamError(cleanMsg || 'Unknown error — check server logs.');
        },
    });

    // OpenClaw WebSocket connection (only active when model is openclaw:*)
    // clawd-dev → main session (full context), clawd-chat → isolated webchat session
    const openClawSessionKey = model === 'openclaw:clawd-dev' ? 'agent:main:main' : 'webchat:laradav:chat';
    const handleExternalMessage = useCallback((msg: { role: string; content: string }) => {
        setMessages(prev => [...prev, {
            role: msg.role as Message['role'],
            content: msg.content,
            created_at: new Date().toISOString(),
        }]);

        // Persist to DB if we have a conversation
        if (conversationId) {
            fetch(`/chat/${conversationId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({ role: msg.role, content: msg.content }),
            }).catch(() => {}); // best-effort
        }
    }, [conversationId]);

    const openclaw = useOpenClaw({
        gatewayUrl: OPENCLAW_GATEWAY_URL,
        token: OPENCLAW_TOKEN,
        sessionKey: openClawSessionKey,
        onExternalMessage: model === 'openclaw:clawd-dev' ? handleExternalMessage : undefined,
    });

    // Unified streaming state
    const isStreaming = isOpenClaw ? openclaw.streaming : prismStreaming;
    const streamingContent = isOpenClaw ? (openclaw.streaming ? openclaw.streamContent : undefined) : (prismStreaming && !streamError ? data : undefined);

    // Sync messages when conversation changes
    useEffect(() => {
        setMessages(conversation?.messages ?? []);
        setConversationId(conversation?.id);
        setModel(localStorage.getItem('laradav-chat-model') ?? conversation?.model ?? 'claude-sonnet-4-5-20250929');
        setSystemPrompt(conversation?.system_prompt ?? '');
    }, [conversation]);

    // When Prism streaming finishes, commit the response
    useEffect(() => {
        if (!isOpenClaw && !prismStreaming && data && data.trim()) {
            const trimmed = data.trim();
            if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
                if (!streamError) {
                    const titleMatch = trimmed.match(/<title>(.*?)<\/title>/i);
                    setStreamError(titleMatch?.[1] || 'Server returned HTML instead of stream — check server logs.');
                }
                return;
            }
            const currentModel = modelRef.current;
            const durationMs = prismSendTime ? Date.now() - prismSendTime : null;
            setPrismSendTime(null);

            // Fetch the latest message from the DB to get token stats
            if (conversationId) {
                fetch(`/chat/${conversationId}/last-message`, {
                    headers: { Accept: 'application/json', 'X-XSRF-TOKEN': getXsrfToken() },
                    credentials: 'same-origin',
                })
                    .then(r => r.ok ? r.json() : null)
                    .then((msg: TokenStats | null) => {
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'assistant' && last.content === data) return prev;
                            return [...prev, {
                                role: 'assistant' as const,
                                content: data,
                                input_tokens: msg?.input_tokens ?? null,
                                output_tokens: msg?.output_tokens ?? null,
                                cost: msg?.cost ?? null,
                                duration_ms: durationMs, model_label: currentModel,
                            }];
                        });
                    })
                    .catch(() => {
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === 'assistant' && last.content === data) return prev;
                            return [...prev, { role: 'assistant' as const, content: data, duration_ms: durationMs, model_label: currentModel }];
                        });
                    });
            } else {
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'assistant' && last.content === data) return prev;
                    return [...prev, { role: 'assistant' as const, content: data, duration_ms: durationMs, model_label: currentModel }];
                });
            }
        }
    }, [isOpenClaw, prismStreaming, data, streamError, prismSendTime, conversationId]);

    const handleFilesSelected = useCallback((files: FileList) => {
        const newFiles: PendingFile[] = Array.from(files).map(file => {
            const pf: PendingFile = { file };
            if (file.type.startsWith('image/')) {
                pf.preview = URL.createObjectURL(file);
            }
            return pf;
        });
        setPendingFiles(prev => [...prev, ...newFiles]);
    }, []);

    const handleRemoveFile = useCallback((index: number) => {
        setPendingFiles(prev => {
            const removed = prev[index];
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const handleSend = useCallback(async (content: string) => {
        setStreamError(null);
        const userMessage: Message = { role: 'user', content, created_at: new Date().toISOString() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        if (isOpenClaw) {
            // Send directly to OpenClaw gateway via WebSocket
            try {
                const response = await openclaw.sendMessage(content);
                if (response?.content) {
                    const usage = response.usage;
                    setMessages(prev => [...prev, {
                        role: 'assistant' as const,
                        content: response.content,
                        created_at: new Date().toISOString(),
                        input_tokens: usage?.input ?? null,
                        output_tokens: usage?.output ?? null,
                        cost: usage?.cost?.total ?? null,
                        duration_ms: response.durationMs ?? null,
                        model_label: response.model ?? null,
                    }]);
                }
            } catch (err: unknown) {
                setStreamError(err instanceof Error ? err.message : 'OpenClaw error');
            }
            return;
        }

        // Standard Prism path — track timing
        setPrismSendTime(Date.now());
        const payload = updatedMessages.map(m => ({ role: m.role, content: m.content }));
        let attachmentTempIds: string[] = [];

        if (pendingFiles.length > 0) {
            const formData = new FormData();
            pendingFiles.forEach(pf => formData.append('files[]', pf.file));
            try {
                const res = await fetch('/chat/upload', {
                    method: 'POST',
                    headers: { 'X-XSRF-TOKEN': getXsrfToken() },
                    body: formData,
                });
                const json = await res.json();
                attachmentTempIds = json.temp_ids ?? [];
            } catch (e) {
                console.error('Upload failed:', e);
            }
            pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
            setPendingFiles([]);
        }

        const projectDir = model.startsWith('claude-code:') ? model.split(':')[1] : undefined;

        send({
            messages: payload,
            conversation_id: conversationId,
            model,
            system_prompt: systemPrompt || undefined,
            attachment_temp_ids: attachmentTempIds.length > 0 ? attachmentTempIds : undefined,
            web_search: webSearch || undefined,
            project_dir: projectDir,
        });
    }, [messages, conversationId, model, systemPrompt, pendingFiles, webSearch, send, isOpenClaw, openclaw]);

    const handleCancel = useCallback(() => {
        if (isOpenClaw) {
            openclaw.abort();
        } else {
            cancel();
        }
    }, [isOpenClaw, openclaw, cancel]);

    return (
        <div className="flex min-h-[calc(100vh-var(--topnav-height))] flex-col">
            {/* Connection status indicator for OpenClaw */}
            {isOpenClaw && (
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground border-b">
                    <span className={`inline-block h-2 w-2 rounded-full ${openclaw.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {openclaw.connected ? `Connected to ${model === 'openclaw:clawd-dev' ? 'Clawd Dev' : 'Clawd Chat'} 🐾` : 'Connecting to OpenClaw gateway…'}
                    {openclaw.error && <span className="text-destructive ml-2">{openclaw.error}</span>}
                </div>
            )}

            <MessageList
                messages={messages}
                streamingContent={streamingContent}
                streamError={streamError}
                isWaiting={isStreaming}
            />

            <div className="sticky bottom-0">
                <div className="pointer-events-none h-8 bg-gradient-to-t from-background to-transparent" />
                <MessageInput
                    onSend={handleSend}
                    onCancel={handleCancel}
                    disabled={isOpenClaw ? !openclaw.connected : isFetching}
                    isStreaming={isStreaming}
                    model={model}
                    onModelChange={(m) => { setModel(m); localStorage.setItem('laradav-chat-model', m); }}
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={setSystemPrompt}
                    templates={templates}
                    pendingFiles={pendingFiles}
                    onFilesSelected={handleFilesSelected}
                    onRemoveFile={handleRemoveFile}
                    webSearch={webSearch}
                    onWebSearchChange={setWebSearch}
                />
            </div>
        </div>
    );
}
