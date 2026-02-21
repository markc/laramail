import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CalendarEvent } from './columns';

type Props = {
    open: boolean;
    onClose: () => void;
    event?: CalendarEvent | null;
    calendarId: number;
};

export default function EventFormModal({ open, onClose, event, calendarId }: Props) {
    const isEdit = !!event;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        summary: '',
        dtstart: '',
        dtend: '',
        location: '',
        description: '',
    });

    useEffect(() => {
        if (open) {
            setData({
                summary: event?.summary ?? '',
                dtstart: event?.dtstart ?? '',
                dtend: event?.dtend ?? '',
                location: event?.location ?? '',
                description: event?.description ?? '',
            });
        }
    }, [open, event]);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const options = {
            onSuccess: () => {
                reset();
                onClose();
            },
            preserveScroll: true,
        };

        if (isEdit) {
            put(`/calendars/${calendarId}/events/${event!.id}`, options);
        } else {
            post(`/calendars/${calendarId}/events`, options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Event' : 'Add Event'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update event details.' : 'Create a new calendar event.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="summary">Summary</Label>
                        <Input
                            id="summary"
                            value={data.summary}
                            onChange={(e) => setData('summary', e.target.value)}
                            autoFocus
                        />
                        {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dtstart">Start</Label>
                            <Input
                                id="dtstart"
                                type="datetime-local"
                                value={data.dtstart}
                                onChange={(e) => setData('dtstart', e.target.value)}
                            />
                            {errors.dtstart && <p className="text-sm text-destructive">{errors.dtstart}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dtend">End</Label>
                            <Input
                                id="dtend"
                                type="datetime-local"
                                value={data.dtend}
                                onChange={(e) => setData('dtend', e.target.value)}
                            />
                            {errors.dtend && <p className="text-sm text-destructive">{errors.dtend}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={data.location}
                            onChange={(e) => setData('location', e.target.value)}
                        />
                        {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={3}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {isEdit ? 'Save Changes' : 'Create Event'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
