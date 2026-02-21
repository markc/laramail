import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';

export type AddressBook = {
    id: number;
    principaluri: string | null;
    uri: string | null;
    displayname: string | null;
    description: string | null;
    contact_count: number;
};

export function createColumns(): ColumnDef<AddressBook>[] {
    return [
        {
            accessorKey: 'id',
            header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('id')}</span>,
        },
        {
            accessorKey: 'displayname',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => (
                <Link href={`/addressbooks/${row.original.id}/contacts`} className="font-medium text-[var(--scheme-accent)] hover:underline">
                    {row.original.displayname || row.original.uri || '—'}
                </Link>
            ),
        },
        {
            accessorKey: 'principaluri',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
            cell: ({ row }) => {
                const uri = row.getValue('principaluri') as string | null;
                return <span className="font-mono text-xs text-muted-foreground">{uri?.replace('principals/', '') ?? '—'}</span>;
            },
        },
        {
            accessorKey: 'description',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description') ?? '—'}</span>,
        },
        {
            accessorKey: 'contact_count',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Contacts" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('contact_count')}</span>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`/addressbooks/${row.original.id}/contacts`}>
                            <Eye className="size-4" />
                            <span className="sr-only">View Contacts</span>
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];
}
