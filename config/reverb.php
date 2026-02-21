<?php

/*
|--------------------------------------------------------------------------
| Shared Reverb WebSocket Server
|--------------------------------------------------------------------------
|
| This Reverb instance is the canonical shared WebSocket server for all
| Laravel projects on this host. Apps are loaded from /etc/reverb/apps.json.
|
| To add a new project, append an entry to /etc/reverb/apps.json:
|
|   {
|       "id": "myproject",
|       "key": "<random-32-hex>",
|       "secret": "<random-32-hex>",
|       "allowed_origins": ["myproject.kanary.org"]
|   }
|
| Then in the new project's .env:
|
|   BROADCAST_CONNECTION=reverb
|   REVERB_APP_ID=myproject
|   REVERB_APP_KEY=<same key>
|   REVERB_APP_SECRET=<same secret>
|   REVERB_HOST=mail.kanary.org
|   REVERB_PORT=8080
|   REVERB_SCHEME=https
|   VITE_REVERB_APP_KEY=${REVERB_APP_KEY}
|   VITE_REVERB_HOST=mail.kanary.org
|   VITE_REVERB_PORT=443
|   VITE_REVERB_SCHEME=https
|
| And add a WebSocket proxy in the Caddyfile for that vhost:
|
|   @websocket { path /app/* }
|   reverse_proxy @websocket 127.0.0.1:8080
|
*/

$sharedAppsFile = env('REVERB_APPS_FILE', '/etc/reverb/apps.json');
$sharedApps = [];

if (file_exists($sharedAppsFile)) {
    $entries = json_decode(file_get_contents($sharedAppsFile), true) ?? [];

    foreach ($entries as $entry) {
        $sharedApps[] = [
            'key' => $entry['key'],
            'secret' => $entry['secret'],
            'app_id' => $entry['id'],
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
            'allowed_origins' => $entry['allowed_origins'] ?? ['*'],
            'ping_interval' => 60,
            'activity_timeout' => 30,
            'max_message_size' => 10_000,
        ];
    }
}

// Fallback: if no shared file, use env vars (single-app mode for local dev)
if (empty($sharedApps)) {
    $sharedApps[] = [
        'key' => env('REVERB_APP_KEY'),
        'secret' => env('REVERB_APP_SECRET'),
        'app_id' => env('REVERB_APP_ID'),
        'options' => [
            'host' => env('REVERB_HOST'),
            'port' => env('REVERB_PORT', 443),
            'scheme' => env('REVERB_SCHEME', 'https'),
            'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
        ],
        'allowed_origins' => ['*'],
        'ping_interval' => 60,
        'activity_timeout' => 30,
        'max_message_size' => 10_000,
    ];
}

return [

    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [

        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'path' => env('REVERB_SERVER_PATH', ''),
            'hostname' => env('REVERB_HOST'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                    'timeout' => env('REDIS_TIMEOUT', 60),
                ],
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    'apps' => [

        'provider' => 'config',

        'apps' => $sharedApps,

    ],

];
