<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\SystemPromptTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $providers = [
            'anthropic' => ['name' => 'Anthropic', 'configured' => !empty(config('ai.providers.anthropic.key'))],
            'openai' => ['name' => 'OpenAI', 'configured' => !empty(config('ai.providers.openai.key'))],
            'gemini' => ['name' => 'Google Gemini', 'configured' => !empty(config('ai.providers.gemini.key'))],
        ];

        $settings = [
            'default_model' => $user->setting('default_model', 'claude-sonnet-4-5-20250929'),
            'default_system_prompt' => $user->setting('default_system_prompt', ''),
        ];

        $templates = SystemPromptTemplate::where('user_id', $user->id)
            ->orWhereNull('user_id')
            ->orderByRaw('user_id IS NULL')
            ->orderBy('name')
            ->get();

        return Inertia::render('dashboard', [
            // Defer heavy stats queries — page shell renders instantly
            'stats' => Inertia::defer(function () use ($user) {
                $totalConversations = $user->conversations()->count();
                $totalMessages = Message::whereIn('conversation_id', $user->conversations()->select('id'))->count();

                $tokenSums = Message::whereIn('conversation_id', $user->conversations()->select('id'))
                    ->selectRaw('COALESCE(SUM(input_tokens), 0) as total_input, COALESCE(SUM(output_tokens), 0) as total_output')
                    ->first();

                $costByModel = $user->conversations()
                    ->select('model')
                    ->selectRaw('COUNT(*) as conversation_count')
                    ->selectRaw('(SELECT COALESCE(SUM(m.input_tokens), 0) FROM messages m WHERE m.conversation_id IN (SELECT c2.id FROM conversations c2 WHERE c2.user_id = conversations.user_id AND c2.model = conversations.model)) as input_tokens')
                    ->selectRaw('(SELECT COALESCE(SUM(m.output_tokens), 0) FROM messages m WHERE m.conversation_id IN (SELECT c2.id FROM conversations c2 WHERE c2.user_id = conversations.user_id AND c2.model = conversations.model)) as output_tokens')
                    ->groupBy('model')
                    ->get()
                    ->map(function ($row) {
                        $pricing = config('ai.pricing.' . $row->model, [0, 0]);
                        $row->cost = ($row->input_tokens / 1_000_000 * $pricing[0]) + ($row->output_tokens / 1_000_000 * $pricing[1]);
                        return $row;
                    });

                $totalCost = $costByModel->sum('cost');

                return [
                    'conversations' => $totalConversations,
                    'messages' => $totalMessages,
                    'input_tokens' => (int) $tokenSums->total_input,
                    'output_tokens' => (int) $tokenSums->total_output,
                    'total_cost' => $totalCost,
                    'costByModel' => $costByModel,
                ];
            }),
            'providers' => $providers,
            'settings' => $settings,
            'templates' => $templates,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'default_model' => 'nullable|string',
            'default_system_prompt' => 'nullable|string|max:5000',
        ]);

        $user = Auth::user();

        foreach (['default_model', 'default_system_prompt'] as $key) {
            if ($request->has($key)) {
                $user->settings()->updateOrCreate(
                    ['key' => $key],
                    ['value' => $request->input($key)],
                );
            }
        }

        return back();
    }
}
