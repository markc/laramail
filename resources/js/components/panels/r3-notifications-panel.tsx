import { AlertCircle, Bell, CheckCheck, CheckCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { useSystemEvents, type SystemEvent } from '@/hooks/use-system-events';

const typeConfig: Record<SystemEvent['type'], { icon: typeof Info; color: string; label: string }> = {
    info: { icon: Info, color: 'var(--scheme-accent)', label: 'Info' },
    success: { icon: CheckCircle, color: '#22c55e', label: 'Success' },
    warning: { icon: AlertTriangle, color: '#eab308', label: 'Warning' },
    error: { icon: AlertCircle, color: '#ef4444', label: 'Error' },
};

function EventCard({ event, onRead, onDelete }: { event: SystemEvent; onRead: (id: number) => void; onDelete: (id: number) => void }) {
    const config = typeConfig[event.type] ?? typeConfig.info;
    const Icon = config.icon;
    const isUnread = !event.read_at;
    const timeAgo = formatTimeAgo(event.created_at);

    return (
        <div
            className="group/card relative w-full rounded-lg border p-3 text-left transition-all cursor-pointer"
            style={{
                borderColor: isUnread ? config.color + '40' : 'var(--glass-border)',
                background: isUnread ? config.color + '08' : 'var(--glass)',
                opacity: isUnread ? 1 : 0.5,
            }}
            onClick={() => isUnread && onRead(event.id)}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover/card:opacity-60 hover:!opacity-100"
                title="Delete"
            >
                <Trash2 className="h-3 w-3" style={{ color: 'var(--scheme-fg-muted)' }} />
            </button>
            <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: config.color }} />
                <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium" style={{ color: 'var(--scheme-fg-primary)' }}>
                            {event.title}
                        </span>
                        {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: config.color }} />}
                    </div>
                    {event.body && (
                        <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: 'var(--scheme-fg-muted)' }}>
                            {event.body}
                        </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: 'var(--scheme-fg-muted)' }}>
                        {event.source && <span>{event.source}</span>}
                        <span>{timeAgo}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPanel() {
    const { events, unreadCount, markRead, markAllRead, deleteEvent, clearAll } = useSystemEvents();

    return (
        <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" style={{ color: 'var(--scheme-accent)' }} />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--scheme-fg-primary)' }}>
                        Notifications
                    </h2>
                    {unreadCount > 0 && (
                        <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: 'var(--scheme-accent)' }}
                        >
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
                            style={{ color: 'var(--scheme-accent)' }}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Read all
                        </button>
                    )}
                    {events.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
                            style={{ color: 'var(--scheme-fg-muted)' }}
                        >
                            <Trash2 className="h-3 w-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {events.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Bell className="h-8 w-8 opacity-20" style={{ color: 'var(--scheme-fg-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--scheme-fg-muted)' }}>
                        No notifications yet
                    </span>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} onRead={markRead} onDelete={deleteEvent} />
                    ))}
                </div>
            )}
        </div>
    );
}
