<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class JmapService
{
    /**
     * Authenticate with Stalwart via Basic Auth and obtain a bearer token.
     *
     * @return array{token: string, accountId: string, apiUrl: string, downloadUrl: string, uploadUrl: string, displayName: string}
     */
    public function authenticate(string $email, string $password): array
    {
        $sessionUrl = config('jmap.jmap_session_url');

        $response = Http::withBasicAuth($email, $password)
            ->accept('application/json')
            ->get($sessionUrl);

        if ($response->failed()) {
            throw new \RuntimeException('JMAP authentication failed: '.$response->status());
        }

        $session = $response->json();
        $primaryAccountId = $session['primaryAccounts']['urn:ietf:params:jmap:mail'] ?? null;

        if (! $primaryAccountId) {
            throw new \RuntimeException('No mail account found in JMAP session');
        }

        $account = $session['accounts'][$primaryAccountId] ?? [];

        return [
            'token' => base64_encode($email.':'.$password),
            'accountId' => $primaryAccountId,
            'apiUrl' => $session['apiUrl'] ?? '',
            'downloadUrl' => $session['downloadUrl'] ?? '',
            'uploadUrl' => $session['uploadUrl'] ?? '',
            'displayName' => $account['name'] ?? $email,
        ];
    }

    /**
     * Fetch JMAP session data using a bearer/basic token.
     *
     * @return array<string, mixed>
     */
    public function getSession(string $token): array
    {
        $sessionUrl = config('jmap.jmap_session_url');

        $response = Http::withHeaders([
            'Authorization' => 'Basic '.$token,
        ])
            ->accept('application/json')
            ->get($sessionUrl);

        if ($response->failed()) {
            throw new \RuntimeException('Failed to fetch JMAP session: '.$response->status());
        }

        return $response->json();
    }

    /**
     * Stream an attachment blob from Stalwart.
     */
    public function downloadBlob(string $token, string $accountId, string $blobId, string $name): Response
    {
        $sessionData = $this->getSession($token);
        $downloadUrl = $sessionData['downloadUrl'] ?? '';

        $url = str_replace(
            ['{accountId}', '{blobId}', '{name}', '{type}'],
            [$accountId, $blobId, $name, 'application/octet-stream'],
            $downloadUrl,
        );

        return Http::withHeaders([
            'Authorization' => 'Basic '.$token,
        ])->get($url);
    }

    /**
     * Upload an attachment blob to Stalwart.
     *
     * @return array{blobId: string, type: string, size: int}
     */
    public function uploadBlob(string $token, string $accountId, \Illuminate\Http\UploadedFile $file): array
    {
        $sessionData = $this->getSession($token);
        $uploadUrl = $sessionData['uploadUrl'] ?? '';

        $url = str_replace('{accountId}', $accountId, $uploadUrl);

        $response = Http::withHeaders([
            'Authorization' => 'Basic '.$token,
            'Content-Type' => $file->getMimeType(),
        ])->withBody($file->getContent(), $file->getMimeType())->post($url);

        if ($response->failed()) {
            throw new \RuntimeException('Failed to upload blob: '.$response->status());
        }

        return $response->json();
    }

    /**
     * Make a raw JMAP API call.
     *
     * @param  array<int, array<int, mixed>>  $methodCalls
     * @return array<string, mixed>
     */
    public function call(string $token, string $apiUrl, array $methodCalls): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Basic '.$token,
            'Content-Type' => 'application/json',
        ])->post($apiUrl, [
            'using' => [
                'urn:ietf:params:jmap:core',
                'urn:ietf:params:jmap:mail',
                'urn:ietf:params:jmap:submission',
            ],
            'methodCalls' => $methodCalls,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException('JMAP API call failed: '.$response->status());
        }

        return $response->json();
    }
}
