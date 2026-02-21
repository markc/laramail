import './echo';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode, type ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import AppLayout from '@/layouts/app-layout';
import '../css/app.css';

const appName = import.meta.env.VITE_APP_NAME || 'LaraDAV';

// Stable reference so Inertia keeps the layout alive between page visits
const defaultLayout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: async (name) => {
        const page = await resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        );
        // Apply persistent layout to app pages (not auth or welcome)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = page as any;
        if (!mod.default.layout && !name.startsWith('auth/') && name !== 'welcome') {
            mod.default.layout = defaultLayout;
        }
        return page;
    },
    setup({ el, App, props }) {
        const app = (
            <StrictMode>
                <App {...props} />
            </StrictMode>
        );

        // Hydrate if SSR server pre-rendered, otherwise full client render
        if (el.hasChildNodes()) {
            hydrateRoot(el, app);
        } else {
            createRoot(el).render(app);
        }
    },
    progress: {
        color: '#4B5563',
    },
});
