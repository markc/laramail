<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider('anthropic')]
#[Model('claude-sonnet-4-5-20250929')]
class ChatAgent implements Agent, Conversational
{
    use Promptable, RemembersConversations;

    protected ?string $overrideModel = null;

    public function instructions(): Stringable|string
    {
        return 'You are a helpful AI assistant. Be concise, accurate, and friendly. '
             . 'Format responses with markdown when appropriate.';
    }

    public function withModel(string $model): static
    {
        $this->overrideModel = $model;

        return $this;
    }
}
