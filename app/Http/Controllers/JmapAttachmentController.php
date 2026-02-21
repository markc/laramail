<?php

namespace App\Http\Controllers;

use App\Services\JmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JmapAttachmentController extends Controller
{
    public function __construct(private JmapService $jmap) {}

    /**
     * Proxy attachment download from Stalwart.
     */
    public function download(Request $request, string $blobId, string $name): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $user->jmap_token_encrypted || ! $user->jmap_account_id) {
            return response()->json(['message' => 'No JMAP session'], 401);
        }

        try {
            $response = $this->jmap->downloadBlob(
                $user->jmap_token_encrypted,
                $user->jmap_account_id,
                $blobId,
                $name,
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => 'Failed to download attachment'], 502);
        }

        $contentType = $response->header('Content-Type') ?? 'application/octet-stream';

        return response()->streamDownload(function () use ($response) {
            echo $response->body();
        }, $name, [
            'Content-Type' => $contentType,
        ]);
    }

    /**
     * Proxy attachment upload to Stalwart.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:'.((int) config('jmap.attachment_max_size') / 1024),
        ]);

        $user = $request->user();

        if (! $user->jmap_token_encrypted || ! $user->jmap_account_id) {
            return response()->json(['message' => 'No JMAP session'], 401);
        }

        try {
            $result = $this->jmap->uploadBlob(
                $user->jmap_token_encrypted,
                $user->jmap_account_id,
                $request->file('file'),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => 'Failed to upload attachment'], 502);
        }

        return response()->json($result);
    }
}
