import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ReactNode } from 'react';
import ReactDOMServer from 'react-dom/server';
import AppLayout from '@/layouts/app-layout';

const appName = import.meta.env.VITE_APP_NAME || 'LaraDAV';

const defaultLayout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: async (name) => {
            const page = await resolvePageComponent(
                `./pages/${name}.tsx`,
                import.meta.glob('./pages/**/*.tsx'),
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mod = page as any;
            if (!mod.default.layout && !name.startsWith('auth/') && name !== 'welcome') {
                mod.default.layout = defaultLayout;
            }
            return page;
        },
        setup: ({ App, props }) => <App {...props} />,
    }),
);
