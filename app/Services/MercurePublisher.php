<?php

declare(strict_types=1);

namespace App\Services;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;

class MercurePublisher
{
    private string $hubUrl;
    private string $jwtSecret;

    public function __construct()
    {
        $this->hubUrl = config('services.mercure.url', 'https://laradav.goldcoast.org/.well-known/mercure');
        $this->jwtSecret = config('services.mercure.jwt_secret', '');
    }

    /**
     * Publish an event to a Mercure topic.
     */
    public function publish(string $topic, array $data, bool $private = false): void
    {
        $token = $this->generateJwt(['publish' => [$topic]]);

        $payload = [
            'topic' => $topic,
            'data' => json_encode($data),
        ];

        if ($private) {
            $payload['private'] = 'on';
        }

        Http::withToken($token, 'Bearer')
            ->asForm()
            ->post($this->hubUrl, $payload);
    }

    private function generateJwt(array $claims): string
    {
        $payload = [
            'mercure' => $claims,
            'iat' => time(),
            'exp' => time() + 3600,
        ];

        return JWT::encode($payload, $this->jwtSecret, 'HS256');
    }
}
