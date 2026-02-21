import { useCallback, useEffect, useRef, useState } from 'react';

interface OpenClawOptions {
    gatewayUrl: string;
    token: string;
    sessionKey?: string;
    /** Called when an unsolicited message arrives (e.g. from another client on the same session) */
    onExternalMessage?: (message: { role: string; content: string }) => void;
}

interface OpenClawState {
    connected: boolean;
    streaming: boolean;
    streamContent: string;
    error: string | null;
}

type ToolCall = {
    name: string;
    status: 'running' | 'done' | 'error';
    detail?: string;
};

// WebSocket frame from the OpenClaw gateway
interface WsFrame {
    type: string;
    id?: string;
    event?: string;
    ok?: boolean;
    payload?: Record<string, unknown>;
    error?: { message?: string };
}

// Content block in OpenClaw message responses
interface ContentBlock {
    type: string;
    text?: string;
}

// Chat message in the OpenClaw protocol
interface WsChatMessage {
    role?: string;
    content?: string | ContentBlock[];
    text?: string;
    usage?: Record<string, unknown>;
    model?: string;
}

// Typed chat event payload
interface ChatPayload {
    state?: string;
    message?: string | ContentBlock[] | WsChatMessage;
    errorMessage?: string;
}

// Shared usage shape for OpenClaw responses
interface OpenClawUsage {
    input: number;
    output: number;
    totalTokens: number;
    cost?: { total: number };
}

// Result shape for the non-string final callback path
interface OpenClawFinalResult {
    content: string;
    usage?: OpenClawUsage;
    model?: string;
}

type FinalCallback = ((message: string | OpenClawFinalResult) => void) | null;

/**
 * React hook that speaks the OpenClaw Gateway WebSocket protocol.
 * Connects as webchat mode, sends chat.send with deliver:false to get
 * streaming deltas back through the WS connection.
 */
export function useOpenClaw(options: OpenClawOptions) {
    const { gatewayUrl, token, sessionKey = 'agent:main:main', onExternalMessage } = options;
    const onExternalMessageRef = useRef(onExternalMessage);
    const wsRef = useRef<WebSocket | null>(null);
    const pendingRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>>(new Map());
    const [state, setState] = useState<OpenClawState>({
        connected: false,
        streaming: false,
        streamContent: '',
        error: null,
    });
    const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
    const onFinalRef = useRef<FinalCallback>(null);
    const currentRunIdRef = useRef<string | null>(null);
    const streamBufferRef = useRef('');
    const sessionKeyRef = useRef(sessionKey);
    const connectRef = useRef<(() => void) | null>(null);

    // Sync refs after render (React 19 refs rule)
    useEffect(() => {
        onExternalMessageRef.current = onExternalMessage;
        sessionKeyRef.current = sessionKey;
    });

    // Generate UUID
    const uuid = () => crypto.randomUUID();

    // Send a JSON frame
    const sendFrame = useCallback((frame: object) => {
        wsRef.current?.send(JSON.stringify(frame));
    }, []);

    // Send an RPC request and return a promise
    const request = useCallback((method: string, params: object): Promise<unknown> => {
        return new Promise((resolve, reject) => {
            const id = uuid();
            pendingRef.current.set(id, { resolve, reject });
            sendFrame({ type: 'req', id, method, params });
        });
    }, [sendFrame]);

    // Connect to gateway
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        // Convert https:// to wss:// for the gateway URL
        const wsUrl = gatewayUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            let frame: WsFrame;
            try {
                frame = JSON.parse(event.data) as WsFrame;
            } catch {
                return;
            }

            // Handle connect challenge
            if (frame.type === 'event' && frame.event === 'connect.challenge') {
                request('connect', {
                    minProtocol: 3,
                    maxProtocol: 3,
                    client: {
                        id: 'webchat',
                        displayName: 'LaRaDav',
                        version: '1.0.0',
                        platform: navigator.platform || 'web',
                        mode: 'webchat',
                    },
                    role: 'operator',
                    scopes: ['operator.read', 'operator.write'],
                    caps: [],
                    auth: { token },
                    userAgent: navigator.userAgent,
                    locale: navigator.language,
                }).then(() => {
                    setState(s => ({ ...s, connected: true, error: null }));
                }).catch((err: unknown) => {
                    const msg = err instanceof Error ? err.message : String(err);
                    setState(s => ({ ...s, error: `Connect failed: ${msg}` }));
                });
                return;
            }

            // Handle RPC responses
            if (frame.type === 'res') {
                const pending = pendingRef.current.get(frame.id ?? '');
                if (pending) {
                    pendingRef.current.delete(frame.id ?? '');
                    if (frame.ok) {
                        pending.resolve(frame.payload);
                    } else {
                        pending.reject(new Error(frame.error?.message || 'Request failed'));
                    }
                }
                return;
            }

            // Handle chat events
            if (frame.type === 'event' && frame.event === 'chat') {
                const payload = frame.payload as ChatPayload | undefined;
                if (!payload) return;

                // Accept all chat events while we have an active request
                // (single-request-at-a-time model — no need to filter by runId)

                // Detect first unsolicited delta (external message from TUI)
                // Gateway doesn't broadcast 'started', so we detect on first delta without active request
                if (payload.state === 'delta' && payload.message != null && !onFinalRef.current && !streamBufferRef.current) {
                    // Fetch the actual user message from the session log
                    fetch('/chat/openclaw-last-user', { credentials: 'same-origin' })
                        .then(r => r.json())
                        .then((data: Record<string, unknown>) => {
                            if (data.content) {
                                onExternalMessageRef.current?.({ role: 'user', content: String(data.content) });
                            }
                        })
                        .catch(() => {
                            onExternalMessageRef.current?.({ role: 'user', content: '*(sent from TUI)*' });
                        });
                }

                if (payload.state === 'delta' && payload.message != null) {
                    // Delta message format: { role, content: [{type:"text", text:"..."}], timestamp }
                    const msg = payload.message;
                    let text = '';
                    if (typeof msg === 'string') {
                        text = msg;
                    } else if (Array.isArray(msg)) {
                        text = (msg as ContentBlock[]).filter(b => b.type === 'text').map(b => b.text ?? '').join('');
                    } else if (typeof msg === 'object' && msg !== null) {
                        // OpenClaw sends { role, content: [...blocks], timestamp }
                        const chatMsg = msg as WsChatMessage;
                        const content = chatMsg.content;
                        if (Array.isArray(content)) {
                            text = content.filter(b => b.type === 'text').map(b => b.text ?? '').join('');
                        } else if (typeof content === 'string') {
                            text = content;
                        } else {
                            text = chatMsg.text ?? '';
                        }
                    }
                    streamBufferRef.current = text;
                    setState(s => ({ ...s, streamContent: text, streaming: true }));
                }

                if (payload.state === 'final') {
                    const finalText = streamBufferRef.current;
                    const isLocal = !!onFinalRef.current; // We initiated this request
                    if (finalText) {
                        currentRunIdRef.current = null;
                        if (isLocal) {
                            setState(s => ({ ...s, streaming: false, streamContent: '' }));
                            onFinalRef.current?.(finalText); // string path
                        } else {
                            // Unsolicited message from another client (e.g. TUI)
                            onExternalMessageRef.current?.({ role: 'assistant', content: finalText });
                            setState(s => ({ ...s, streaming: false, streamContent: '' }));
                        }
                        onFinalRef.current = null;
                        streamBufferRef.current = '';
                    } else {
                        // No deltas received — poll chat.history for the response
                        const cb = onFinalRef.current;
                        const sk = sessionKeyRef.current;
                        currentRunIdRef.current = null;
                        onFinalRef.current = null;
                        streamBufferRef.current = '';
                        // Small delay to let the gateway commit the response
                        setTimeout(async () => {
                            try {
                                const pending = pendingRef.current;
                                const sf = sendFrame;
                                // Inline request since we can't use the hook's request() here
                                const histId = crypto.randomUUID();
                                const histPromise = new Promise<unknown>((resolve, reject) => {
                                    pending.set(histId, { resolve, reject });
                                });
                                sf({ type: 'req', id: histId, method: 'chat.history', params: { sessionKey: sk, limit: 5 } });
                                const result = (await histPromise) as Record<string, unknown>;
                                const msgs = Array.isArray(result.messages) ? (result.messages as WsChatMessage[]) : [];
                                // Find the last assistant message
                                const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
                                if (lastAssistant) {
                                    const content = Array.isArray(lastAssistant.content)
                                        ? lastAssistant.content.filter(b => b.type === 'text').map(b => b.text ?? '').join('')
                                        : typeof lastAssistant.content === 'string' ? lastAssistant.content : '';
                                    setState(s => ({ ...s, streaming: false, streamContent: '' }));
                                    cb?.({
                                        content,
                                        usage: (lastAssistant.usage as unknown as OpenClawUsage) ?? undefined,
                                        model: lastAssistant.model ?? undefined,
                                    });
                                } else {
                                    setState(s => ({ ...s, streaming: false, streamContent: '' }));
                                    cb?.('');
                                }
                            } catch {
                                setState(s => ({ ...s, streaming: false, streamContent: '' }));
                                cb?.('');
                            }
                        }, 500);
                    }
                }

                if (payload.state === 'error') {
                    setState(s => ({
                        ...s,
                        streaming: false,
                        streamContent: '',
                        error: payload.errorMessage || 'Chat error',
                    }));
                    currentRunIdRef.current = null;
                    onFinalRef.current = null;
                    streamBufferRef.current = '';
                }

                if (payload.state === 'aborted') {
                    setState(s => ({ ...s, streaming: false, streamContent: '' }));
                    currentRunIdRef.current = null;
                    onFinalRef.current = null;
                    streamBufferRef.current = '';
                }
            }

            // Handle agent events (tool calls)
            if (frame.type === 'event' && frame.event === 'agent') {
                const payload = frame.payload as { tool?: string; state?: string } | undefined;
                if (payload?.tool) {
                    const toolName = payload.tool;
                    const toolState = payload.state as ToolCall['status'];
                    setToolCalls(prev => {
                        const existing = prev.findIndex(t => t.name === toolName && t.status === 'running');
                        if (toolState === 'running' && existing === -1) {
                            return [...prev, { name: toolName, status: 'running' }];
                        }
                        if (existing >= 0) {
                            const updated = [...prev];
                            updated[existing] = { ...updated[existing], status: toolState };
                            return updated;
                        }
                        return prev;
                    });
                }
            }
        };

        ws.onclose = () => {
            setState(s => ({ ...s, connected: false }));
            // Reconnect after delay
            setTimeout(() => {
                if (wsRef.current === ws) {
                    connectRef.current?.();
                }
            }, 2000);
        };

        ws.onerror = () => {
            setState(s => ({ ...s, error: 'WebSocket error' }));
        };
    }, [gatewayUrl, token, request, sendFrame]);

    useEffect(() => {
        connectRef.current = connect;
    });

    // Send a chat message — resolves with { content, usage, model, durationMs }
    const sendMessage = useCallback((message: string): Promise<{
        content: string;
        usage?: OpenClawUsage;
        model?: string;
        durationMs?: number;
    }> => {
        const sentAt = Date.now();
        return new Promise((resolve, reject) => {
            if (!state.connected) {
                reject(new Error('Not connected to OpenClaw gateway'));
                return;
            }

            const idempotencyKey = uuid();
            currentRunIdRef.current = idempotencyKey;
            streamBufferRef.current = '';
            setToolCalls([]);

            setState(s => ({ ...s, streaming: true, streamContent: '', error: null }));

            // Store the callback for when final arrives
            onFinalRef.current = (finalMessage: string | OpenClawFinalResult) => {
                if (typeof finalMessage === 'string') {
                    resolve({ content: finalMessage, durationMs: Date.now() - sentAt });
                } else {
                    resolve({ ...finalMessage, durationMs: Date.now() - sentAt });
                }
            };

            request('chat.send', {
                sessionKey,
                message,
                deliver: false,
                idempotencyKey,
            }).then((res: unknown) => {
                // Capture the actual runId from the gateway response
                const resObj = res as Record<string, unknown> | null;
                if (resObj?.runId) {
                    currentRunIdRef.current = resObj.runId as string;
                }
            }).catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                setState(s => ({ ...s, streaming: false, error: msg }));
                onFinalRef.current = null;
                reject(err);
            });
        });
    }, [state.connected, sessionKey, request]);

    // Abort current generation
    const abort = useCallback(() => {
        if (currentRunIdRef.current) {
            request('chat.abort', {
                sessionKey,
                runId: currentRunIdRef.current,
            }).catch(() => {});
        }
    }, [sessionKey, request]);

    // Load chat history
    const loadHistory = useCallback(async (): Promise<WsChatMessage[]> => {
        try {
            const result = (await request('chat.history', {
                sessionKey,
                limit: 200,
            })) as Record<string, unknown>;
            return Array.isArray(result.messages) ? (result.messages as WsChatMessage[]) : [];
        } catch {
            return [];
        }
    }, [sessionKey, request]);

    // Connect on mount
    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [connect]);

    return {
        ...state,
        toolCalls,
        sendMessage,
        abort,
        loadHistory,
    };
}
