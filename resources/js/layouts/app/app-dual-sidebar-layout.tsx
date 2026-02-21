import { usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import Sidebar from '@/components/sidebar';
import NavPanel from '@/components/panels/l1-nav-panel';
import ConversationsPanel from '@/components/panels/l2-conversations-panel';
import DocsPanel from '@/components/panels/l3-docs-panel';
import MailboxesPanel from '@/components/panels/l4-mailboxes-panel';
import ThemePanel from '@/components/panels/r1-theme-panel';
import UsagePanel from '@/components/panels/r2-usage-panel';
import NotificationsPanel from '@/components/panels/r3-notifications-panel';
import TopNav from '@/components/top-nav';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

const leftPanels = [
    { label: 'L1: Navigation', content: <NavPanel /> },
    { label: 'L2: Conversations', content: <ConversationsPanel /> },
    { label: 'L3: Docs', content: <DocsPanel /> },
    { label: 'L4: Mailboxes', content: <MailboxesPanel /> },
];
const rightPanels = [
    { label: 'R1: Theme', content: <ThemePanel /> },
    { label: 'R2: Usage', content: <UsagePanel /> },
    { label: 'R3: Notifications', content: <NotificationsPanel /> },
];

function LayoutContent({ children }: { children: ReactNode }) {
    const { left, right, noPadding, toggleSidebar } = useTheme();

    // Scroll-reactive sidebar borders
    useEffect(() => {
        const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 0);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="bg-background text-foreground">
            {/* Fixed hamburger icons — always visible at top corners */}
            <button
                onClick={() => toggleSidebar('left')}
                className="fixed top-[0.625rem] left-3 z-50 rounded-lg p-1.5 text-foreground transition-colors hover:text-[var(--scheme-accent)]"
                style={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                }}
                aria-label="Toggle left sidebar"
            >
                <Menu className="h-5 w-5" />
            </button>
            <button
                onClick={() => toggleSidebar('right')}
                className="fixed top-[0.625rem] right-3 z-50 rounded-lg p-1.5 text-foreground transition-colors hover:text-[var(--scheme-accent)]"
                style={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                }}
                aria-label="Toggle right sidebar"
            >
                <Menu className="h-5 w-5" />
            </button>

            <Sidebar side="left" panels={leftPanels} />
            <Sidebar side="right" panels={rightPanels} />

            <TopNav />

            <div
                className={`sidebar-slide ${noPadding ? '' : 'min-h-screen'}`}
                style={{
                    marginInlineStart: left.pinned ? 'var(--sidebar-width)' : undefined,
                    marginInlineEnd: right.pinned ? 'var(--sidebar-width)' : undefined,
                }}
            >
                <main key={usePage().url} className={`page-fade-in ${noPadding ? '' : 'px-2 py-4 sm:p-4'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AppDualSidebarLayout({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <LayoutContent>{children}</LayoutContent>
        </ThemeProvider>
    );
}
