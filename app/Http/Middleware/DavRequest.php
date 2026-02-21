<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class DavRequest
{
    /**
     * Convert WebDAV methods to POST so Laravel's router can match them.
     * The original method is preserved in a header for sabre/dav to read.
     */
    public function handle(Request $request, Closure $next)
    {
        $davMethods = ['PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE',
                       'LOCK', 'UNLOCK', 'REPORT', 'MKCALENDAR'];

        if (in_array($request->method(), $davMethods)) {
            $request->headers->set('X-Original-Method', $request->method());
            $request->server->set('REQUEST_METHOD', 'POST');
        }

        return $next($request);
    }
}
