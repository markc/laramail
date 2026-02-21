<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\SystemEventPushed;
use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Console\Command;

class SendSystemEvent extends Command
{
    protected $signature = 'system-event:send
        {title : Event title}
        {--type=info : Event type (info, warning, error, success)}
        {--body= : Event body text}
        {--source=cli : Event source}
        {--user= : User ID (defaults to first user)}';

    protected $description = 'Create and broadcast a system event';

    public function handle(): int
    {
        $userId = $this->option('user') ?? User::first()?->id;

        if (! $userId) {
            $this->error('No users found.');

            return Command::FAILURE;
        }

        $event = SystemEvent::create([
            'user_id' => $userId,
            'type' => $this->option('type'),
            'title' => $this->argument('title'),
            'body' => $this->option('body'),
            'source' => $this->option('source'),
        ]);

        broadcast(new SystemEventPushed($event));

        $this->info("Event #{$event->id} broadcast to user.{$userId} channel.");

        return Command::SUCCESS;
    }
}
