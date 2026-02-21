<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Handle DAV requests before Laravel's router (which rejects WebDAV methods).
// Sabre/dav uses its own HTTP layer and reads $_SERVER directly.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
if (preg_match('#^/dav(/|$)#', $uri)) {
    /** @var Application $app */
    $app = require_once __DIR__.'/../bootstrap/app.php';

    // Bootstrap the HTTP kernel (registers service providers, etc.)
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $kernel->bootstrap();

    $davService = $app->make(\App\Services\DavService::class);
    $server = $davService->createServer();
    $server->exec();
    exit;
}

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
