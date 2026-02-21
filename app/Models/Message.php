<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'role', 'content', 'input_tokens', 'output_tokens'];

    protected $appends = ['cost'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class);
    }

    public function getCostAttribute(): ?float
    {
        if (!$this->input_tokens && !$this->output_tokens) {
            return null;
        }

        $model = $this->conversation?->model ?? 'claude-sonnet-4-5-20250929';
        $pricing = config('ai.pricing.' . $model);

        if (!$pricing) {
            return null;
        }

        $inputCost = ($this->input_tokens ?? 0) / 1_000_000 * $pricing[0];
        $outputCost = ($this->output_tokens ?? 0) / 1_000_000 * $pricing[1];

        return $inputCost + $outputCost;
    }
}
