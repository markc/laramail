<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

class OpenClawPushController extends Controller
{
    public function push(Request $request)
    {
        // Bearer token auth
        $token = $request->bearerToken();
        if (!$token || $token !== config('services.system_event_token')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->validate([
            'message' => 'required|string',
            'conversation_id' => 'nullable|integer',
            'type' => 'nullable|string|in:assistant,system',
        ]);

        $message = $request->input('message');
        $conversationId = $request->input('conversation_id');
        $type = $request->input('type', 'assistant');

        $data = [
            'message' => $message,
            'type' => $type,
            'timestamp' => now()->toIso8601String(),
        ];

        // If conversation_id provided, save the message
        if ($conversationId) {
            $conversation = Conversation::find($conversationId);
            if ($conversation) {
                $msgRecord = $conversation->messages()->create([
                    'role' => 'assistant',
                    'content' => $message,
                ]);
                $data['conversation_id'] = $conversationId;
                $data['message_id'] = $msgRecord->id;
            }
        }

        // Broadcast if a driver is configured (Reverb, Mercure, etc.)
        try {
            broadcast(new \App\Events\OpenClawPush($data))->toOthers();
        } catch (\Throwable) {
            // No broadcast driver available — message is still saved
        }

        return response()->json(['ok' => true]);
    }
}
