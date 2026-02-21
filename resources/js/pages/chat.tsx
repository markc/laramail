import { Head, usePage } from '@inertiajs/react';
import { useLayoutEffect } from 'react';
import ChatInterface from '@/components/chat/chat-interface';
import { useTheme } from '@/contexts/theme-context';
import type { ConversationWithMessages, SystemPromptTemplate } from '@/types/chat';

type ChatPageProps = {
    conversation: ConversationWithMessages | null;
    templates: SystemPromptTemplate[];
};

export default function ChatPage() {
    const { conversation, templates } = usePage<{ props: ChatPageProps }>().props as unknown as ChatPageProps;
    const { setNoPadding, setPanel } = useTheme();

    const title = conversation?.title ?? 'AI Chat';

    useLayoutEffect(() => {
        setNoPadding(true);
        setPanel('left', 1);
        return () => setNoPadding(false);
    }, [setNoPadding, setPanel]);

    return (
        <>
            <Head title={title} />
            <div>
                <ChatInterface
                    key={conversation?.id ?? 'new'}
                    conversation={conversation}
                    templates={templates}
                />
            </div>
        </>
    );
}
