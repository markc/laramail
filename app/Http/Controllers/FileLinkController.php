<?php

namespace App\Http\Controllers;

use App\Models\SharedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileLinkController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:' . (int) (env('FILELINK_MAX_SIZE', 104857600) / 1024),
        ]);

        $file = $request->file('file');
        $token = SharedFile::generateToken();
        $diskPath = $request->user()->id . '/' . $token . '/' . $file->getClientOriginalName();

        Storage::disk('filelink')->putFileAs(
            dirname($diskPath),
            $file,
            basename($diskPath)
        );

        $shared = SharedFile::create([
            'user_id' => $request->user()->id,
            'filename' => $file->hashName(),
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'disk_path' => $diskPath,
            'share_token' => $token,
            'expires_at' => now()->addDays(30),
        ]);

        return response()->json([
            'id' => $shared->id,
            'url' => route('share.show', $token),
            'delete_url' => route('filelink.destroy', $shared->id),
        ], 201);
    }

    public function destroy(Request $request, SharedFile $sharedFile): JsonResponse
    {
        abort_unless($sharedFile->user_id === $request->user()->id, 403);

        Storage::disk('filelink')->delete($sharedFile->disk_path);
        $sharedFile->delete();

        return response()->json(['success' => true]);
    }
}
