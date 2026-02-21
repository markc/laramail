<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemPromptTemplate extends Model
{
    protected $fillable = ['user_id', 'name', 'prompt'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
