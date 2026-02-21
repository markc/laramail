<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MailController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('mail/index', [
            'hasJmapSession' => (bool) $user->jmap_token_encrypted
                && $user->jmap_token_expires_at
                && $user->jmap_token_expires_at->isFuture(),
        ]);
    }
}
