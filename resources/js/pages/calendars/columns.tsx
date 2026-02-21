import type { ColumnDef } from '@tanstack/react-table';
import { Link } from '@inertiajs/react';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';

export type CalendarItem = {
    id: number;
    principaluri: string | null;
    uri: string | null;
    displayname: string | null;
    description: string | null;
    calendarcolor: string | null;
    calendarorder: number;
    components: string | null;
    event_count: number;
};

export function createColumns(): ColumnDef<CalendarItem>[] {
    return [
        {
            accessorKey: 'id',
            header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('id')}</span>,
        },
        {
            accessorKey: 'displayname',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => {
                const cal = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {cal.calendarcolor && (
                            <span
                                className="inline-block size-3 rounded-full"
                                style={{ backgroundColor: cal.calendarcolor }}
                            />
                        )}
                        <Link
                            href={`/calendars/${cal.id}/events`}
                            className="font-medium text-[var(--scheme-accent)] hover:underline"
                        >
                            {cal.displayname || cal.uri || '—'}
                        </Link>
                    </div>
                );
            },
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
            accessorKey: 'components',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Components" />,
            cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('components') ?? '—'}</span>,
        },
        {
            accessorKey: 'event_count',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Events" />,
            cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue('event_count')}</span>,
        },
    ];
}
