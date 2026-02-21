<?php

namespace App\Http\Controllers;

use App\Models\SharedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SharedFileController extends Controller
{
    public function index()
    {
        $files = SharedFile::with('user:id,name')
            ->select(['id', 'user_id', 'original_filename', 'mime_type', 'size', 'share_token', 'download_count', 'max_downloads', 'expires_at', 'created_at'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($f) => [
                ...$f->toArray(),
                'share_url' => route('share.show', $f->share_token),
                'expired' => $f->isExpired(),
            ]);

        return Inertia::render('shared-files/index', [
            'files' => $files,
        ]);
    }

    public function destroy(SharedFile $sharedFile)
    {
        Storage::disk('filelink')->delete($sharedFile->disk_path);
        $sharedFile->delete();

        return redirect()->back();
    }
}
