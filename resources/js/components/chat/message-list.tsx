import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Message } from '@/types/chat';
import MessageBubble from './message-bubble';

interface MessageListProps {
    messages: Message[];
    streamingContent?: string;
    streamError?: string | null;
    isWaiting?: boolean;
}

export default function MessageList({ messages, streamingContent, streamError, isWaiting }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const userScrolledRef = useRef(false);

    const isNearBottom = useCallback(() => {
        return document.documentElement.scrollHeight - window.scrollY - window.innerHeight <= 80;
    }, []);

    // Re-enable auto-scroll when user sends a new message
    useEffect(() => {
        setShouldAutoScroll(true);
        userScrolledRef.current = false;
    }, [messages.length]);

    // Scroll to bottom during streaming and when messages change
    useEffect(() => {
        if (shouldAutoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'instant' });
        }
    }, [messages.length, streamingContent, shouldAutoScroll]);

    // Track user-initiated scrolls
    useEffect(() => {
        const onWheel = () => { userScrolledRef.current = true; };
        const onTouchMove = () => { userScrolledRef.current = true; };
        const onScroll = () => {
            if (userScrolledRef.current) {
                setShouldAutoScroll(isNearBottom());
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, [isNearBottom]);

    return (
        <div className="flex-1">
            <div className="mx-auto max-w-3xl space-y-6 p-4">
                {messages.length === 0 && !streamingContent && (
                    <p className="text-muted-foreground mt-16 text-center text-lg">
                        Start a conversation
                    </p>
                )}

                {messages.map((msg, i) => (
                    <MessageBubble key={msg.id ?? `local-${i}`} message={msg} />
                ))}

                {isWaiting && !streamingContent && (
                    <div className="flex items-center gap-2 text-muted-foreground px-1 py-3">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Clawd is thinking…</span>
                    </div>
                )}

                {streamingContent && (
                    <MessageBubble
                        message={{ role: 'assistant', content: streamingContent }}
                        isStreaming
                    />
                )}

                {streamError && (
                    <div className="mx-auto max-w-md rounded-lg border border-red-300 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950/50">
                        <p className="text-sm text-red-700 dark:text-red-300">{streamError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                        >
                            Refresh page
                        </button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
