<?php

namespace App\Http\Middleware;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'basePath' => $request->getBasePath(),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'sidebarConversations' => fn () => $user
                ? Conversation::where('user_id', $user->id)
                    ->select(['id', 'title', 'model', 'updated_at'])
                    ->latest('updated_at')
                    ->limit(50)
                    ->get()
                : [],
            'sidebarStats' => $user ? $this->buildStats($user) : null,
            'sidebarDocs' => $this->buildDocs(),
        ];
    }

    private function buildStats($user): array
    {
        $conversationIds = Conversation::where('user_id', $user->id)->pluck('id');
        $conversationCount = $conversationIds->count();

        if ($conversationCount === 0) {
            return [
                'conversations' => 0,
                'messages' => 0,
                'inputTokens' => 0,
                'outputTokens' => 0,
                'totalCost' => 0,
                'costByModel' => [],
            ];
        }

        $messageCount = Message::whereIn('conversation_id', $conversationIds)->count();
        $inputTokens = (int) Message::whereIn('conversation_id', $conversationIds)->sum('input_tokens');
        $outputTokens = (int) Message::whereIn('conversation_id', $conversationIds)->sum('output_tokens');

        $pricing = config('ai.pricing');
        $costByModel = [];
        $totalCost = 0;

        $tokensByModel = Message::whereIn('conversation_id', $conversationIds)
            ->join('conversations', 'messages.conversation_id', '=', 'conversations.id')
            ->selectRaw('conversations.model, SUM(messages.input_tokens) as input_sum, SUM(messages.output_tokens) as output_sum')
            ->groupBy('conversations.model')
            ->get();

        foreach ($tokensByModel as $row) {
            $rates = $pricing[$row->model] ?? null;
            $cost = $rates
                ? ($row->input_sum / 1_000_000 * $rates[0]) + ($row->output_sum / 1_000_000 * $rates[1])
                : 0;
            $totalCost += $cost;
            $costByModel[] = [
                'model' => $row->model,
                'input_tokens' => (int) $row->input_sum,
                'output_tokens' => (int) $row->output_sum,
                'cost' => round($cost, 4),
            ];
        }

        usort($costByModel, fn ($a, $b) => $b['cost'] <=> $a['cost']);

        return [
            'conversations' => $conversationCount,
            'messages' => $messageCount,
            'inputTokens' => $inputTokens,
            'outputTokens' => $outputTokens,
            'totalCost' => round($totalCost, 4),
            'costByModel' => $costByModel,
        ];
    }

    private function buildDocs(): array
    {
        $docsPath = base_path('docs');

        if (! File::isDirectory($docsPath)) {
            return [];
        }

        $docs = [];

        foreach (File::glob("{$docsPath}/*.md") as $file) {
            $slug = pathinfo($file, PATHINFO_FILENAME);
            $content = File::get($file);
            $title = $slug;

            if (preg_match('/^#\s+(.+)$/m', $content, $matches)) {
                $title = $matches[1];
            }

            $docs[] = ['slug' => $slug, 'title' => $title];
        }

        usort($docs, fn ($a, $b) => $a['title'] <=> $b['title']);

        return $docs;
    }
}
