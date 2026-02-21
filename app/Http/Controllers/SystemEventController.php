<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\SystemEventPushed;
use App\Models\SystemEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemEventController extends Controller
{
    /**
     * List events for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $events = SystemEvent::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit((int) $request->get('limit', 50))
            ->get();

        return response()->json($events);
    }

    /**
     * Create and publish a system event.
     * Used by external services (Clawd, cron, nsctl) via API token.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:info,warning,error,success',
            'title' => 'required|string|max:255',
            'body' => 'nullable|string',
            'source' => 'nullable|string|max:50',
            'meta' => 'nullable|array',
        ]);

        $event = SystemEvent::create($validated);

        broadcast(new SystemEventPushed($event));

        return response()->json($event, 201);
    }

    /**
     * Mark an event as read.
     */
    public function markRead(Request $request, SystemEvent $systemEvent): JsonResponse
    {
        if ($systemEvent->user_id !== $request->user()->id) {
            abort(403);
        }

        $systemEvent->markAsRead();

        return response()->json(['status' => 'ok']);
    }

    /**
     * Mark all events as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        SystemEvent::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['status' => 'ok']);
    }

    /**
     * External push endpoint — bearer token auth.
     * Used by Clawd (OpenClaw), cron jobs, nsctl, etc.
     */
    public function push(Request $request): JsonResponse
    {
        $token = config('services.system_event_token');

        if (! $token || $request->bearerToken() !== $token) {
            abort(401, 'Invalid token');
        }

        $validated = $request->validate([
            'type' => 'required|in:info,warning,error,success',
            'title' => 'required|string|max:255',
            'body' => 'nullable|string',
            'source' => 'nullable|string|max:50',
            'meta' => 'nullable|array',
            'user_id' => 'nullable|exists:users,id',
        ]);

        // Default to first user if not specified
        $validated['user_id'] ??= \App\Models\User::first()?->id;

        $event = SystemEvent::create($validated);

        broadcast(new SystemEventPushed($event));

        return response()->json($event, 201);
    }

    /**
     * Delete a single event.
     */
    public function destroy(Request $request, SystemEvent $systemEvent): JsonResponse
    {
        if ($systemEvent->user_id !== $request->user()->id) {
            abort(403);
        }

        $systemEvent->delete();

        return response()->json(['status' => 'ok']);
    }

    /**
     * Delete all events for the authenticated user.
     */
    public function destroyAll(Request $request): JsonResponse
    {
        SystemEvent::where('user_id', $request->user()->id)->delete();

        return response()->json(['status' => 'ok']);
    }

}
