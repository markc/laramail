import { Link, usePage } from '@inertiajs/react';
import { BookUser, Calendar, FileText, Home, Link2, Mail, MessageSquare, Users } from 'lucide-react';
import { useBasePath } from '@/hooks/use-base-path';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    { path: '/mail', label: 'Mail', icon: Mail },
    { path: '/docs', label: 'Docs', icon: FileText },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/calendars', label: 'Calendars', icon: Calendar },
    { path: '/addressbooks', label: 'Contacts', icon: BookUser },
    { path: '/shared-files', label: 'Shared Files', icon: Link2 },
];

export default function NavPanel() {
    const { url: pageUrl } = usePage();
    const { url } = useBasePath();

    return (
        <nav className="flex flex-col py-2">
            {navItems.map(item => {
                const href = url(item.path);
                const isActive = pageUrl.startsWith(href);
                return (
                    <Link
                        key={item.path}
                        href={href}
                        prefetch
                        className={`flex items-center gap-3 border-l-[3px] px-3 py-2 text-sm transition-colors ${
                            isActive
                                ? 'border-[var(--scheme-accent)] bg-background text-[var(--scheme-accent)]'
                                : 'border-transparent hover:border-muted-foreground hover:bg-background'
                        }`}
                        style={{ color: isActive ? 'var(--scheme-accent)' : undefined }}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
