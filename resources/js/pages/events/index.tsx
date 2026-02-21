import { Head, Link, router, usePage } from '@inertiajs/react';
import type { RowSelectionState } from '@tanstack/react-table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { createColumns, type CalendarEvent } from './columns';
import EventFormModal from './event-form-modal';

type Props = {
    calendar: { id: number; displayname: string | null; calendarid: number };
    events: CalendarEvent[];
};

export default function EventsPage() {
    const { calendar, events } = usePage<{ props: Props }>().props as unknown as Props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns = useMemo(
        () =>
            createColumns({
                onEdit: (event) => {
                    setEditingEvent(event);
                    setModalOpen(true);
                },
                onDelete: (event) => {
                    if (confirm(`Delete event "${event.summary}"?`)) {
                        router.delete(`/calendars/${calendar.id}/events/${event.id}`, { preserveScroll: true });
                    }
                },
            }),
        [calendar.id],
    );

    const selectedCount = Object.keys(rowSelection).length;

    function handleBulkDelete() {
        if (selectedCount === 0) return;
        if (!confirm(`Delete ${selectedCount} selected event${selectedCount > 1 ? 's' : ''}?`)) return;

        const ids = Object.keys(rowSelection).map((idx) => events[parseInt(idx)].id);
        router.post(`/calendars/${calendar.id}/events/bulk-delete`, { ids }, {
            preserveScroll: true,
            onSuccess: () => setRowSelection({}),
        });
    }

    function closeModal() {
        setModalOpen(false);
        setEditingEvent(null);
    }

    return (
        <>
            <Head title={`${calendar.displayname ?? 'Events'}`} />
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href="/calendars">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{calendar.displayname ?? 'Events'}</h1>
                        <p className="text-sm text-muted-foreground">{events.length} events</p>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={events}
                    searchKey="summary"
                    searchPlaceholder="Search events..."
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    initialColumnVisibility={{
                        location: false,
                        description: false,
                        lastmodified: false,
                    }}
                    initialSorting={[{ id: 'dtstart', desc: true }]}
                    actionSlot={
                        <div className="flex gap-2">
                            <BulkDeleteButton selectedCount={selectedCount} onBulkDelete={handleBulkDelete} />
                            <Button
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    setEditingEvent(null);
                                    setModalOpen(true);
                                }}
                            >
                                <Plus className="size-4" />
                                Add Event
                            </Button>
                        </div>
                    }
                />
            </div>
            <EventFormModal
                open={modalOpen}
                onClose={closeModal}
                event={editingEvent}
                calendarId={calendar.id}
            />
        </>
    );
}

function BulkDeleteButton({ selectedCount, onBulkDelete }: { selectedCount: number; onBulkDelete: () => void }) {
    if (selectedCount === 0) return null;

    return (
        <Button size="sm" variant="destructive" className="h-8" onClick={onBulkDelete}>
            <Trash2 className="size-4" />
            Delete {selectedCount}
        </Button>
    );
}
