<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SystemEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SystemEventPushed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly SystemEvent $systemEvent,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->systemEvent->user_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->systemEvent->id,
            'type' => $this->systemEvent->type,
            'title' => $this->systemEvent->title,
            'body' => $this->systemEvent->body,
            'source' => $this->systemEvent->source,
            'meta' => $this->systemEvent->meta,
            'created_at' => $this->systemEvent->created_at?->toISOString(),
        ];
    }
}
