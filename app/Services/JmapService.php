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

        // Stalwart's internal directory uses the local part as the login name.
        // Try the full email first; if 401, retry with just the username.
        $username = $email;
        $response = $this->jmapGet($sessionUrl, $username, $password);

        if ($response->status() === 401 && str_contains($email, '@')) {
            $username = strstr($email, '@', before_needle: true);
            $response = $this->jmapGet($sessionUrl, $username, $password);
        }

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
            'token' => base64_encode($username.':'.$password),
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
        [$username, $password] = explode(':', base64_decode($token), 2);

        $response = $this->jmapGet($sessionUrl, $username, $password);

        if ($response->failed()) {
            throw new \RuntimeException('Failed to fetch JMAP session: '.$response->status());
        }

        return $response->json();
    }

    /**
     * GET a JMAP URL with Basic Auth, following redirects without dropping credentials.
     */
    private function jmapGet(string $url, string $username, string $password): Response
    {
        $response = Http::withBasicAuth($username, $password)
            ->accept('application/json')
            ->withOptions(['allow_redirects' => false])
            ->get($url);

        if ($response->status() === 307 || $response->status() === 302) {
            $location = $response->header('Location');
            if ($location) {
                if (! str_starts_with($location, 'http')) {
                    $parsed = parse_url($url);
                    $location = $parsed['scheme'].'://'.$parsed['host']
                        .(isset($parsed['port']) ? ':'.$parsed['port'] : '')
                        .$location;
                }

                $response = Http::withBasicAuth($username, $password)
                    ->accept('application/json')
                    ->get($location);
            }
        }

        return $response;
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
