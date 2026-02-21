import type { ReactNode } from 'react';
import AppDualSidebarLayout from '@/layouts/app/app-dual-sidebar-layout';

export default function AppLayout({ children }: { children: ReactNode }) {
    return <AppDualSidebarLayout>{children}</AppDualSidebarLayout>;
}
