<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJmapSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user
            || ! $user->jmap_token_encrypted
            || ! $user->jmap_token_expires_at
            || $user->jmap_token_expires_at->isPast()
        ) {
            return response()->json(['message' => 'No valid JMAP session'], 401);
        }

        return $next($request);
    }
}
