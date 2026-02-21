import type { ColumnDef } from '@tanstack/react-table';
import { router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { selectColumn } from '@/components/data-table/data-table-select-column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type Contact = {
    id: number;
    uri: string;
    name: string;
    email: string | null;
    phone: string | null;
    org: string | null;
    title: string | null;
    nickname: string | null;
    birthday: string | null;
    anniversary: string | null;
    categories: string | null;
    role: string | null;
    url: string | null;
    note: string | null;
    address: string | null;
    lastmodified: number | null;
};

export type ContactActions = {
    onEdit: (contact: Contact) => void;
    onDelete: (contact: Contact) => void;
    addressBookId: number;
};

function InlineNameCell({ contact, addressBookId }: { contact: Contact; addressBookId: number }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(contact.name);
    const inputRef = useRef<HTMLInputElement>(null);

    function save() {
        const trimmed = value.trim();
        if (trimmed && trimmed !== contact.name) {
            router.put(`/addressbooks/${addressBookId}/contacts/${contact.id}`, {
                name: trimmed,
                email: contact.email ?? '',
                phone: contact.phone ?? '',
                org: contact.org ?? '',
                title: contact.title ?? '',
                nickname: contact.nickname ?? '',
                birthday: contact.birthday ?? '',
                anniversary: contact.anniversary ?? '',
                categories: contact.categories ?? '',
                role: contact.role ?? '',
                url: contact.url ?? '',
                note: contact.note ?? '',
                address: contact.address ?? '',
            }, { preserveScroll: true });
        } else {
            setValue(contact.name);
        }
        setEditing(false);
    }

    if (editing) {
        return (
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.currentTarget.blur(); }
                    if (e.key === 'Escape') { setValue(contact.name); setEditing(false); }
                }}
                className="h-7 px-1 font-medium"
                autoFocus
            />
        );
    }

    return (
        <span
            className="cursor-pointer font-medium decoration-muted-foreground/40 decoration-dashed underline-offset-4 hover:underline"
            onClick={() => setEditing(true)}
        >
            {contact.name || '—'}
        </span>
    );
}

export function createColumns(actions: ContactActions): ColumnDef<Contact>[] {
    return [
        selectColumn<Contact>(),
        {
            accessorKey: 'name',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => <InlineNameCell contact={row.original} addressBookId={actions.addressBookId} />,
        },
        {
            accessorKey: 'email',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
            cell: ({ row }) => {
                const email = row.getValue('email') as string | null;
                return email
                    ? <a href={`mailto:${email}`} className="text-[var(--scheme-accent)] hover:underline">{email}</a>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
            cell: ({ row }) => {
                const phone = row.getValue('phone') as string | null;
                return phone
                    ? <a href={`tel:${phone}`} className="font-mono text-sm">{phone}</a>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'org',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
            cell: ({ row }) => {
                const org = row.getValue('org') as string | null;
                return org
                    ? <span className="text-muted-foreground">{org}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'title',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Job Title" />,
            cell: ({ row }) => {
                const title = row.getValue('title') as string | null;
                return title
                    ? <span className="text-muted-foreground">{title}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'nickname',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Nickname" />,
            cell: ({ row }) => {
                const nickname = row.getValue('nickname') as string | null;
                return nickname
                    ? <span className="text-muted-foreground">{nickname}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'birthday',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Birthday" />,
            cell: ({ row }) => {
                const birthday = row.getValue('birthday') as string | null;
                return birthday
                    ? <span className="text-muted-foreground text-sm">{birthday}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'anniversary',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Anniversary" />,
            cell: ({ row }) => {
                const anniversary = row.getValue('anniversary') as string | null;
                return anniversary
                    ? <span className="text-muted-foreground text-sm">{anniversary}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'categories',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Categories" />,
            cell: ({ row }) => {
                const categories = row.getValue('categories') as string | null;
                return categories
                    ? <span className="text-muted-foreground text-sm">{categories}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'role',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
            cell: ({ row }) => {
                const role = row.getValue('role') as string | null;
                return role
                    ? <span className="text-muted-foreground">{role}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'lastmodified',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Modified" />,
            cell: ({ row }) => {
                const ts = row.getValue('lastmodified') as number | null;
                if (!ts) return <span className="text-muted-foreground/50">—</span>;
                const date = new Date(ts * 1000);
                return <span className="text-muted-foreground text-sm">{date.toLocaleDateString()}</span>;
            },
            enableHiding: true,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const contact = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => actions.onEdit(contact)}>
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => actions.onDelete(contact)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
}
