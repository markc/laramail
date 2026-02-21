import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

export type SystemEvent = {
    id: number;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    body: string | null;
    source: string | null;
    meta: Record<string, unknown> | null;
    created_at: string;
    read_at: string | null;
};

export function useSystemEvents() {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const { auth } = usePage<{ props: { auth: { user: { id: number } } } }>().props as unknown as {
        auth: { user: { id: number } };
    };

    const userId = auth?.user?.id;

    // Load existing events on mount
    useEffect(() => {
        if (!userId) return;

        fetch('/api/system-events', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((data: SystemEvent[]) => {
                if (Array.isArray(data)) setEvents(data);
            })
            .catch(() => {});
    }, [userId]);

    // Subscribe to real-time events via Reverb/Echo
    useEffect(() => {
        if (!userId || !window.Echo) return;

        const channel = window.Echo.private(`user.${userId}`);

        channel.listen('.SystemEventPushed', (e: SystemEvent) => {
            setEvents((prev) => [e, ...prev]);
        });

        return () => {
            window.Echo.leave(`user.${userId}`);
        };
    }, [userId]);

    const unreadCount = events.filter((e) => !e.read_at).length;

    const csrfToken = () =>
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const markRead = useCallback(async (id: number) => {
        await fetch(`/api/system-events/${id}/read`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        });
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, read_at: new Date().toISOString() } : e)));
    }, []);

    const markAllRead = useCallback(async () => {
        await fetch('/api/system-events/read-all', {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        });
        setEvents((prev) => prev.map((e) => ({ ...e, read_at: e.read_at ?? new Date().toISOString() })));
    }, []);

    const deleteEvent = useCallback(async (id: number) => {
        await fetch(`/api/system-events/${id}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        });
        setEvents((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const clearAll = useCallback(async () => {
        await fetch('/api/system-events/clear-all', {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        });
        setEvents([]);
    }, []);

    return { events, unreadCount, markRead, markAllRead, deleteEvent, clearAll };
}
