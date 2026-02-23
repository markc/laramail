<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConnectJmapRequest;
use App\Services\JmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JmapAuthController extends Controller
{
    public function __construct(private JmapService $jmap) {}

    /**
     * Authenticate with Stalwart and store encrypted token on User.
     */
    public function connect(ConnectJmapRequest $request): JsonResponse
    {
        try {
            $result = $this->jmap->authenticate(
                $request->validated('email'),
                $request->validated('password'),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        $user = $request->user();
        $user->update([
            'jmap_session_url' => config('jmap.jmap_session_url'),
            'jmap_token_encrypted' => $result['token'],
            'jmap_account_id' => $result['accountId'],
            'jmap_display_name' => $result['displayName'],
            'jmap_token_expires_at' => now()->addSeconds(config('jmap.token_ttl')),
        ]);

        return response()->json([
            'accountId' => $result['accountId'],
            'email' => $user->email,
            'apiUrl' => $this->proxyUrl($result['apiUrl']),
            'downloadUrl' => $this->proxyUrl($result['downloadUrl']),
            'uploadUrl' => $this->proxyUrl($result['uploadUrl']),
            'displayName' => $user->name ?: $result['displayName'],
        ]);
    }

    /**
     * Return JMAP session data for the frontend.
     */
    public function session(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->jmap_token_encrypted) {
            return response()->json(['connected' => false], 200);
        }

        if ($user->jmap_token_expires_at && $user->jmap_token_expires_at->isPast()) {
            return response()->json(['connected' => false, 'expired' => true], 200);
        }

        try {
            $session = $this->jmap->getSession($user->jmap_token_encrypted);
        } catch (\RuntimeException) {
            return response()->json(['connected' => false, 'expired' => true], 200);
        }

        return response()->json([
            'connected' => true,
            'token' => $user->jmap_token_encrypted,
            'accountId' => $user->jmap_account_id,
            'email' => $user->email,
            'displayName' => $user->name ?: $user->jmap_display_name,
            'apiUrl' => $this->proxyUrl($session['apiUrl'] ?? ''),
            'downloadUrl' => $this->proxyUrl($session['downloadUrl'] ?? ''),
            'uploadUrl' => $this->proxyUrl($session['uploadUrl'] ?? ''),
        ]);
    }

    /**
     * Rewrite Stalwart URLs to go through the Caddy JMAP proxy on the same origin.
     */
    private function proxyUrl(string $url): string
    {
        $stalwartUrl = config('jmap.stalwart_url');

        return $stalwartUrl ? str_replace($stalwartUrl, config('app.url'), $url) : $url;
    }

    /**
     * Clear JMAP fields on User (disconnect).
     */
    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->update([
            'jmap_session_url' => null,
            'jmap_token_encrypted' => null,
            'jmap_account_id' => null,
            'jmap_display_name' => null,
            'jmap_token_expires_at' => null,
        ]);

        return response()->json(['disconnected' => true]);
    }
}
