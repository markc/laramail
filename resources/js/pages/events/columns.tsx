import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { selectColumn } from '@/components/data-table/data-table-select-column';
import { Button } from '@/components/ui/button';

export type CalendarEvent = {
    id: number;
    uri: string;
    summary: string;
    dtstart: string | null;
    dtend: string | null;
    location: string | null;
    description: string | null;
    lastmodified: number | null;
};

export type EventActions = {
    onEdit: (event: CalendarEvent) => void;
    onDelete: (event: CalendarEvent) => void;
};

function formatDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function createColumns(actions: EventActions): ColumnDef<CalendarEvent>[] {
    return [
        selectColumn<CalendarEvent>(),
        {
            accessorKey: 'summary',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Summary" />,
            cell: ({ row }) => <span className="font-medium">{row.getValue('summary') || '—'}</span>,
        },
        {
            accessorKey: 'dtstart',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Start" />,
            cell: ({ row }) => {
                const val = row.getValue('dtstart') as string | null;
                return val
                    ? <span className="text-muted-foreground text-sm">{formatDateTime(val)}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'dtend',
            header: ({ column }) => <DataTableColumnHeader column={column} title="End" />,
            cell: ({ row }) => {
                const val = row.getValue('dtend') as string | null;
                return val
                    ? <span className="text-muted-foreground text-sm">{formatDateTime(val)}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
        },
        {
            accessorKey: 'location',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
            cell: ({ row }) => {
                const location = row.getValue('location') as string | null;
                return location
                    ? <span className="text-muted-foreground">{location}</span>
                    : <span className="text-muted-foreground/50">—</span>;
            },
            enableHiding: true,
        },
        {
            accessorKey: 'description',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
            cell: ({ row }) => {
                const desc = row.getValue('description') as string | null;
                return desc
                    ? <span className="text-muted-foreground truncate max-w-xs">{desc}</span>
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
                const event = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => actions.onEdit(event)}>
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => actions.onDelete(event)}>
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                );
            },
        },
    ];
}
