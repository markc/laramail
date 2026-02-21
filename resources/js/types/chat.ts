export type MessageAttachment = {
    id: number;
    filename: string;
    mime_type: string;
    size: number;
};

export type Message = {
    id?: number;
    role: 'user' | 'assistant';
    content: string;
    input_tokens?: number | null;
    output_tokens?: number | null;
    cost?: number | null;
    attachments?: MessageAttachment[];
    created_at?: string;
    duration_ms?: number | null;
    model_label?: string | null;
};

export type SystemPromptTemplate = {
    id: number;
    name: string;
    prompt: string;
    user_id: number | null;
};

export type Conversation = {
    id: number;
    title: string;
    model: string;
    system_prompt?: string | null;
    project_dir?: string | null;
    updated_at: string;
};

export type ConversationWithMessages = Conversation & {
    messages: Message[];
};
