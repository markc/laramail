<?php

namespace App\Services;

use WebSocket\Client;
use Illuminate\Support\Str;

class OpenClawBridge
{
    private string $url;
    private string $token;
    private string $sessionKey;

    public function __construct()
    {
        $this->url = config('services.openclaw.gateway_url', 'ws://127.0.0.1:18789/chat');
        $this->token = config('services.openclaw.gateway_token', '');
        $this->sessionKey = config('services.openclaw.session_key', 'agent:main:main');
    }

    /**
     * Send a message and yield streaming chunks via a Generator.
     *
     * @param string $message
     * @return \Generator<string>
     */
    public function streamMessage(string $message): \Generator
    {
        $client = new Client($this->url, [
            'headers' => [
                'Authorization' => "Bearer {$this->token}",
                'Origin' => 'https://laradav.goldcoast.org',
            ],
            'timeout' => 300,
        ]);

        try {
            // Read challenge event first
            $challenge = json_decode($client->receive(), true);
            if (($challenge['event'] ?? '') !== 'connect.challenge') {
                yield 'Error: Expected connect.challenge, got: ' . ($challenge['event'] ?? 'unknown');
                return;
            }

            // Connect handshake (local connection — no signing needed)
            $connectReq = json_encode([
                'type' => 'req',
                'id' => '1',
                'method' => 'connect',
                'params' => [
                    'minProtocol' => 3,
                    'maxProtocol' => 3,
                    'client' => [
                        'id' => 'webchat',
                        'displayName' => 'LaRaDav',
                        'version' => '1.0.0',
                        'platform' => 'linux',
                        'mode' => 'webchat',
                    ],
                    'role' => 'operator',
                    'scopes' => ['operator.read', 'operator.write'],
                    'caps' => [],
                    'auth' => ['token' => $this->token],
                ],
            ]);
            $client->send($connectReq);

            // Read connect response
            $connectRes = json_decode($client->receive(), true);
            if (!($connectRes['ok'] ?? false)) {
                yield 'Error: OpenClaw connect failed: ' . json_encode($connectRes);
                return;
            }

            // Send chat message
            $reqId = Str::uuid()->toString();
            $chatReq = json_encode([
                'type' => 'req',
                'id' => $reqId,
                'method' => 'chat.send',
                'params' => [
                    'sessionKey' => $this->sessionKey,
                    'message' => $message,
                    'deliver' => false,
                    'idempotencyKey' => Str::uuid()->toString(),
                ],
            ]);
            $client->send($chatReq);

            // Read streaming events
            // The RPC res comes first (status=started), then chat.event deltas, then final
            while (true) {
                $raw = $client->receive();
                $frame = json_decode($raw, true);

                if (!$frame) continue;

                $type = $frame['type'] ?? '';
                $event = $frame['event'] ?? '';

                // Chat event frames
                if ($type === 'event' && $event === 'chat') {
                    $payload = $frame['payload'] ?? [];
                    $state = $payload['state'] ?? '';

                    if ($state === 'delta') {
                        yield $payload['message'] ?? '';
                    } elseif ($state === 'final') {
                        break;
                    } elseif ($state === 'error') {
                        yield "\n\nError: " . ($payload['errorMessage'] ?? 'Unknown error');
                        break;
                    }
                }

                // Skip RPC response (just acknowledgment), health events, tick, etc.
            }
        } catch (\Exception $e) {
            yield 'Error: ' . $e->getMessage();
        } finally {
            try { $client->close(); } catch (\Exception $e) {}
        }
    }
}
