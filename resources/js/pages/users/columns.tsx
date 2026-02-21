import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';

export type User = {
    id: number;
    name: string;
    email: string;
    dav_principal_uri: string | null;
    created_at: string;
};

export type UserActions = {
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
};

export function createColumns(actions: UserActions): ColumnDef<User>[] {
    return [
        {
            accessorKey: 'id',
            header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('id')}</span>,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
        },
        {
            accessorKey: 'email',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        },
        {
            accessorKey: 'dav_principal_uri',
            header: ({ column }) => <DataTableColumnHeader column={column} title="DAV Principal" />,
            cell: ({ row }) => {
                const uri = row.getValue('dav_principal_uri') as string | null;
                return uri
                    ? <span className="font-mono text-xs text-muted-foreground">{uri}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
            cell: ({ row }) => {
                const date = new Date(row.getValue('created_at'));
                return <span className="text-muted-foreground">{date.toLocaleDateString()}</span>;
            },
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => actions.onEdit(user)}>
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => actions.onDelete(user)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
}
