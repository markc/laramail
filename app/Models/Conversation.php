<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = ['user_id', 'title', 'model', 'system_prompt', 'project_dir'];

    // total_cost and total_tokens available as accessors but not auto-appended
    // to avoid N+1 queries on sidebar listings

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function getTotalCostAttribute(): float
    {
        $pricing = config('ai.pricing.' . $this->model);
        if (!$pricing) {
            return 0;
        }

        $inputTokens = $this->messages()->sum('input_tokens') ?? 0;
        $outputTokens = $this->messages()->sum('output_tokens') ?? 0;

        return ($inputTokens / 1_000_000 * $pricing[0]) + ($outputTokens / 1_000_000 * $pricing[1]);
    }

    public function getTotalTokensAttribute(): array
    {
        return [
            'input' => (int) $this->messages()->sum('input_tokens'),
            'output' => (int) $this->messages()->sum('output_tokens'),
        ];
    }
}
