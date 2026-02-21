import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Detect if we're behind the global router (URL has /project/ prefix)
// Only applies when accessed via goldcoast.org (not a subdomain like laradav.goldcoast.org)
const isSubdomain = window.location.hostname.split('.').length > 2;
const pathPrefix = isSubdomain ? '' : (window.location.pathname.match(/^\/([a-z][a-z0-9_-]*)\//)?.[0]?.replace(/\/$/, '') ?? '');

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${pathPrefix}/broadcasting/auth`,
});
