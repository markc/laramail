<?php

namespace App\Http\Controllers;

use App\Services\DavService;
use Illuminate\Http\Request;
use Sabre\HTTP\Sapi;

class DavController extends Controller
{
    public function handle(Request $request, DavService $davService)
    {
        // Sabre reads from $_SERVER and php://input directly.
        // Ensure REQUEST_URI reflects the full /dav/... path.
        $server = $davService->createServer();

        // Create sabre request from PHP globals
        $sabreRequest = Sapi::getRequest();
        $server->httpRequest = $sabreRequest;

        // Create sabre response
        $sabreResponse = new \Sabre\HTTP\Response();
        $server->httpResponse = $sabreResponse;

        $server->exec();

        // Send via sabre's Sapi (handles headers + body)
        Sapi::sendResponse($sabreResponse);
        exit;
    }
}
