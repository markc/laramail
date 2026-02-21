<?php

return [
    'stalwart_url' => env('STALWART_URL', 'https://mail.kanary.org'),
    'jmap_session_url' => env('JMAP_SESSION_URL', 'https://mail.kanary.org/.well-known/jmap'),
    'attachment_max_size' => env('JMAP_ATTACHMENT_MAX_SIZE', 25 * 1024 * 1024),
    'poll_interval' => env('JMAP_POLL_INTERVAL', 15),
    'token_ttl' => env('JMAP_TOKEN_TTL', 3600),
];
