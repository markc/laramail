import { JamClient } from 'jmap-jam';
import type { EmailAddress, EmailBodyPart, EmailFull, EmailListItem, JmapSession, MailboxNode } from '@/types/mail';

export function createJamClient(session: JmapSession): JamClient {
    const sessionUrl = session.apiUrl!.replace(/\/jmap\/$/, '/jmap/session');
    const client = new JamClient({
        bearerToken: session.token!,
        sessionUrl,
    });
    // Stalwart uses Basic Auth — override the Bearer header jmap-jam sets
    client.authHeader = `Basic ${session.token}`;
    // Re-fetch session with correct auth, then rewrite Stalwart URLs to same-origin proxy
    client.session = JamClient.loadSession(sessionUrl, client.authHeader).then((s) => {
        const match = s.apiUrl.match(/^(https?:\/\/[^/]+)/);
        if (!match) return s;
        const stalwartOrigin = match[1];
        const appOrigin = window.location.origin;
        if (stalwartOrigin === appOrigin) return s;
        const rewrite = (url: string) => url.replace(stalwartOrigin, appOrigin);
        return { ...s, apiUrl: rewrite(s.apiUrl), downloadUrl: rewrite(s.downloadUrl), uploadUrl: rewrite(s.uploadUrl) };
    });
    return client;
}

const LIST_PROPERTIES = [
    'id', 'threadId', 'mailboxIds', 'keywords', 'from', 'to',
    'subject', 'receivedAt', 'preview', 'size', 'hasAttachment',
] as const;

const FULL_PROPERTIES = [
    ...LIST_PROPERTIES,
    'cc', 'bcc', 'replyTo', 'sentAt', 'bodyValues',
    'htmlBody', 'textBody', 'attachments',
] as const;

export async function fetchMailboxes(client: JamClient, accountId: string): Promise<MailboxNode[]> {
    const [data] = await client.api.Mailbox.get({
        accountId,
        ids: null,
    });

    return (data.list as unknown as MailboxNode[]).map((m) => ({
        ...m,
        children: [],
    }));
}

export function buildMailboxTree(mailboxes: MailboxNode[]): MailboxNode[] {
    const map = new Map<string, MailboxNode>();
    const roots: MailboxNode[] = [];

    for (const mb of mailboxes) {
        map.set(mb.id, { ...mb, children: [] });
    }

    for (const mb of map.values()) {
        if (mb.parentId && map.has(mb.parentId)) {
            map.get(mb.parentId)!.children.push(mb);
        } else {
            roots.push(mb);
        }
    }

    const sortFn = (a: MailboxNode, b: MailboxNode) => a.sortOrder - b.sortOrder;
    const sortTree = (nodes: MailboxNode[]) => {
        nodes.sort(sortFn);
        for (const n of nodes) {
            sortTree(n.children);
        }
    };
    sortTree(roots);

    return roots;
}

export async function fetchEmails(
    client: JamClient,
    accountId: string,
    mailboxId: string,
    opts: { position?: number; limit?: number; sort?: string } = {},
): Promise<{ emails: EmailListItem[]; total: number; position: number }> {
    const { position = 0, limit = 50, sort = 'receivedAt' } = opts;

    const [results] = await client.requestMany((b) => {
        const query = b.Email.query({
            accountId,
            filter: { inMailbox: mailboxId },
            sort: [{ property: sort, isAscending: false }],
            position,
            limit,
        });
        return {
            query,
            get: b.Email.get({
                accountId,
                ids: query.$ref('/ids'),
                properties: [...LIST_PROPERTIES],
            } as any),
        };
    });

    return {
        emails: (results.get as any).list as EmailListItem[],
        total: (results.query as any).total ?? 0,
        position: (results.query as any).position ?? 0,
    };
}

export async function fetchEmailBody(
    client: JamClient,
    accountId: string,
    emailId: string,
): Promise<EmailFull | null> {
    const [data] = await client.api.Email.get({
        accountId,
        ids: [emailId],
        properties: [...FULL_PROPERTIES],
        fetchHTMLBodyValues: true,
        fetchTextBodyValues: true,
        maxBodyValueBytes: 1024 * 1024,
    });

    const list = data.list as unknown as EmailFull[];
    return list[0] ?? null;
}

export async function setEmailKeywords(
    client: JamClient,
    accountId: string,
    emailId: string,
    keywords: Record<string, boolean | null>,
): Promise<void> {
    const patch: Record<string, boolean | null> = {};
    for (const [key, value] of Object.entries(keywords)) {
        patch[`keywords/${key}`] = value;
    }

    await client.api.Email.set({
        accountId,
        update: { [emailId]: patch },
    } as any);
}

export async function moveEmail(
    client: JamClient,
    accountId: string,
    emailId: string,
    fromMailboxId: string,
    toMailboxId: string,
): Promise<void> {
    await client.api.Email.set({
        accountId,
        update: {
            [emailId]: {
                [`mailboxIds/${fromMailboxId}`]: null,
                [`mailboxIds/${toMailboxId}`]: true,
            },
        },
    } as any);
}

export async function deleteEmail(
    client: JamClient,
    accountId: string,
    emailId: string,
): Promise<void> {
    await client.api.Email.set({
        accountId,
        destroy: [emailId],
    } as any);
}

export async function sendEmail(
    client: JamClient,
    accountId: string,
    email: {
        from: EmailAddress[];
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
        subject: string;
        textBody: string;
        htmlBody?: string;
        inReplyTo?: string[];
        references?: string[];
        attachments?: { blobId: string; name: string; type: string; size: number }[];
    },
): Promise<void> {
    const bodyParts: EmailBodyPart[] = [];

    if (email.htmlBody) {
        bodyParts.push({ partId: 'html', type: 'text/html' } as EmailBodyPart);
    }
    bodyParts.push({ partId: 'text', type: 'text/plain' } as EmailBodyPart);

    const bodyValues: Record<string, { value: string }> = {
        text: { value: email.textBody },
    };
    if (email.htmlBody) {
        bodyValues.html = { value: email.htmlBody };
    }

    const emailCreate: Record<string, unknown> = {
        from: email.from,
        to: email.to,
        cc: email.cc ?? [],
        bcc: email.bcc ?? [],
        subject: email.subject,
        textBody: [{ partId: 'text', type: 'text/plain' }],
        htmlBody: email.htmlBody ? [{ partId: 'html', type: 'text/html' }] : undefined,
        bodyValues,
        keywords: { $draft: true },
        mailboxIds: {},
    };

    if (email.inReplyTo) {
        emailCreate.inReplyTo = email.inReplyTo;
    }
    if (email.references) {
        emailCreate.references = email.references;
    }
    if (email.attachments?.length) {
        emailCreate.attachments = email.attachments.map((a) => ({
            blobId: a.blobId,
            name: a.name,
            type: a.type,
            size: a.size,
        }));
    }

    await client.requestMany((b) => ({
        emailSet: b.Email.set({
            accountId,
            create: { draft: emailCreate },
        } as any),
        submit: b.EmailSubmission.set({
            accountId,
            create: {
                sub: {
                    emailId: '#draft',
                    envelope: undefined,
                } as any,
            },
            onSuccessUpdateEmail: {
                '#sub': {
                    [`keywords/$draft`]: null,
                } as any,
            },
        } as any),
    }));
}

export function findMailboxByRole(mailboxes: MailboxNode[], role: string): MailboxNode | undefined {
    return mailboxes.find((m) => m.role === role);
}
