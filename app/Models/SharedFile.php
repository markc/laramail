<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SharedFile extends Model
{
    protected $fillable = [
        'user_id',
        'filename',
        'original_filename',
        'mime_type',
        'size',
        'disk_path',
        'share_token',
        'password_hash',
        'expires_at',
        'max_downloads',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'size' => 'integer',
            'download_count' => 'integer',
            'max_downloads' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function generateToken(): string
    {
        return Str::random(48);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isMaxDownloadsReached(): bool
    {
        return $this->max_downloads && $this->download_count >= $this->max_downloads;
    }
}
