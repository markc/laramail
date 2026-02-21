import { Head, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { createColumns, type CalendarItem } from './columns';

type Props = {
    calendars: CalendarItem[];
};

export default function CalendarsPage() {
    const { calendars } = usePage<{ props: Props }>().props as unknown as Props;
    const columns = useMemo(() => createColumns(), []);

    return (
        <>
            <Head title="Calendars" />
            <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Calendars</h1>
                <p className="text-sm text-muted-foreground">
                    CalDAV calendars managed via Thunderbird, iOS, or DAVx5. Connect to <code className="rounded bg-muted px-1">/dav/</code> to manage.
                </p>
                <DataTable
                    columns={columns}
                    data={calendars}
                    searchKey="displayname"
                    searchPlaceholder="Search calendars..."
                />
            </div>
        </>
    );
}
