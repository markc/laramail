<?php

use App\Http\Controllers\DavController;
use Illuminate\Support\Facades\Route;

// WebDAV requires non-standard HTTP methods (PROPFIND, PROPPATCH, MKCOL,
// MKCALENDAR, REPORT, COPY, MOVE, LOCK, UNLOCK). Route::any() only
// matches standard methods, so we register all DAV methods explicitly.
$davMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS',
               'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE',
               'LOCK', 'UNLOCK', 'REPORT', 'MKCALENDAR'];

Route::match($davMethods, '/{path?}', [DavController::class, 'handle'])
    ->where('path', '.*')
    ->name('dav');
