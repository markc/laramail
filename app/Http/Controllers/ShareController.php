<?php

namespace App\Http\Controllers;

use App\Models\SharedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShareController extends Controller
{
    public function show(string $token): StreamedResponse
    {
        $file = SharedFile::where('share_token', $token)->firstOrFail();

        abort_if($file->isExpired(), 410, 'This share link has expired.');
        abort_if($file->isMaxDownloadsReached(), 410, 'Download limit reached.');

        $file->increment('download_count');

        return Storage::disk('filelink')->download(
            $file->disk_path,
            $file->original_filename,
            ['Content-Type' => $file->mime_type]
        );
    }
}
