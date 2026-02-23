export interface JmapSession {
    connected: boolean;
    expired?: boolean;
    token?: string;
    accountId?: string;
    email?: string;
    displayName?: string;
    identityId?: string;
    apiUrl?: string;
    downloadUrl?: string;
    uploadUrl?: string;
}

export interface MailboxNode {
    id: string;
    parentId: string | null;
    name: string;
    role: string | null;
    sortOrder: number;
    totalEmails: number;
    unreadEmails: number;
    totalThreads: number;
    unreadThreads: number;
    myRights: Record<string, boolean>;
    children: MailboxNode[];
}

export interface EmailAddress {
    name: string | null;
    email: string;
}

export interface EmailListItem {
    id: string;
    threadId: string;
    mailboxIds: Record<string, boolean>;
    keywords: Record<string, boolean>;
    from: EmailAddress[] | null;
    to: EmailAddress[] | null;
    subject: string | null;
    receivedAt: string;
    preview: string;
    size: number;
    hasAttachment: boolean;
}

export interface EmailBodyValue {
    value: string;
    isEncodingProblem: boolean;
    isTruncated: boolean;
}

export interface EmailBodyPart {
    partId: string | null;
    blobId: string | null;
    size: number;
    name: string | null;
    type: string;
    charset: string | null;
    disposition: string | null;
    cid: string | null;
    subParts: EmailBodyPart[] | null;
}

export interface EmailFull extends EmailListItem {
    cc: EmailAddress[] | null;
    bcc: EmailAddress[] | null;
    replyTo: EmailAddress[] | null;
    sentAt: string | null;
    bodyValues: Record<string, EmailBodyValue>;
    htmlBody: EmailBodyPart[];
    textBody: EmailBodyPart[];
    attachments: EmailBodyPart[];
}

export interface ComposeState {
    to: EmailAddress[];
    cc: EmailAddress[];
    bcc: EmailAddress[];
    subject: string;
    body: string;
    attachments: { blobId: string; name: string; type: string; size: number }[];
    inReplyTo?: string;
    references?: string[];
    replyType?: 'reply' | 'replyAll' | 'forward' | null;
}

export type MailLayout = 'split' | 'full';

export const SPECIAL_ROLES = ['inbox', 'sent', 'drafts', 'trash', 'junk', 'archive'] as const;
export type SpecialRole = (typeof SPECIAL_ROLES)[number];
