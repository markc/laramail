<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\MessageAttachment;
use App\Models\SystemPromptTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Streaming\Events\TextDeltaEvent;
use Prism\Prism\Streaming\Events\StreamEndEvent;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Media\Image;
use Prism\Prism\ValueObjects\Media\Document;
use Prism\Prism\ValueObjects\ProviderTool;
use App\Services\OpenClawBridge;
use Symfony\Component\Process\Process;

class ChatController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $templates = SystemPromptTemplate::where('user_id', $user->id)
            ->orWhereNull('user_id')
            ->orderByRaw('user_id IS NULL')
            ->orderBy('name')
            ->get();

        return Inertia::render('chat', [
            'conversation' => null,
            'templates' => $templates,
        ]);
    }

    public function projects()
    {
        $dir = config('ai.projects_dir');
        if (!$dir || !is_dir($dir)) {
            return response()->json([]);
        }

        $dirs = collect(scandir($dir))
            ->filter(fn($d) => $d !== '.' && $d !== '..' && is_dir("$dir/$d"))
            ->values();

        return response()->json($dirs);
    }

    public function show(Conversation $conversation)
    {
        abort_unless($conversation->user_id === Auth::id(), 403);

        $conversation->load('messages.attachments');

        // Set inverse relationship to avoid N+1 for cost accessor
        $conversation->messages->each(fn ($msg) => $msg->setRelation('conversation', $conversation));

        $user = Auth::user();

        $templates = SystemPromptTemplate::where('user_id', $user->id)
            ->orWhereNull('user_id')
            ->orderByRaw('user_id IS NULL')
            ->orderBy('name')
            ->get();

        return Inertia::render('chat', [
            'conversation' => $conversation,
            'templates' => $templates,
        ]);
    }

    public function stream(Request $request)
    {
        \Log::info('ChatController::stream', [
            'model' => $request->input('model'),
            'conversation_id' => $request->input('conversation_id'),
            'message_count' => count($request->input('messages', [])),
            'user_id' => $request->user()?->id,
        ]);

        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string',
            'conversation_id' => 'nullable|integer',
            'model' => 'nullable|string',
            'system_prompt' => 'nullable|string|max:5000',
            'attachment_temp_ids' => 'nullable|array',
            'attachment_temp_ids.*' => 'string',
            'web_search' => 'nullable|boolean',
            'project_dir' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $messages = $request->input('messages');
        $conversationId = $request->input('conversation_id');
        $model = $request->input('model', 'claude-sonnet-4-5-20250929');
        $systemPrompt = $request->input('system_prompt');
        $webSearch = $request->boolean('web_search');
        $projectDir = $request->input('project_dir');

        // Get or create conversation
        if ($conversationId) {
            $conversation = Conversation::where('user_id', $user->id)->findOrFail($conversationId);
            // Update model if user switched mid-conversation
            if ($conversation->model !== $model) {
                $conversation->update(['model' => $model]);
            }
        } else {
            $conversation = $user->conversations()->create([
                'title' => 'Untitled',
                'model' => $model,
                'system_prompt' => $systemPrompt,
                'project_dir' => $projectDir,
            ]);
        }

        // Save the latest user message
        $lastMessage = end($messages);
        $userMessageRecord = null;
        if ($lastMessage['role'] === 'user') {
            $userMessageRecord = $conversation->messages()->create([
                'role' => 'user',
                'content' => $lastMessage['content'],
            ]);
        }

        // Handle file attachments
        $tempIds = $request->input('attachment_temp_ids', []);
        $attachmentParts = [];
        if ($userMessageRecord && !empty($tempIds)) {
            foreach ($tempIds as $tempId) {
                $meta = session("upload_{$tempId}");
                if (!$meta) continue;

                $attachment = $userMessageRecord->attachments()->create([
                    'filename' => $meta['filename'],
                    'storage_path' => $meta['storage_path'],
                    'mime_type' => $meta['mime_type'],
                    'size' => $meta['size'],
                ]);

                session()->forget("upload_{$tempId}");

                // Build Prism content parts
                if (str_starts_with($meta['mime_type'], 'image/')) {
                    $attachmentParts[] = Image::fromStoragePath($meta['storage_path']);
                } else {
                    $attachmentParts[] = Document::fromStoragePath($meta['storage_path']);
                }
            }
        }

        // Build Prism Message objects
        $prismMessages = collect($messages)->map(function ($m, $i) use ($messages, $attachmentParts) {
            if ($m['role'] === 'assistant') {
                return new AssistantMessage($m['content']);
            }
            // Only attach files to the last user message
            if ($i === count($messages) - 1 && !empty($attachmentParts)) {
                return new UserMessage($m['content'], $attachmentParts);
            }
            return new UserMessage($m['content']);
        })->all();

        $provider = $this->providerForModel($model);

        $effectiveSystemPrompt = $conversation->system_prompt
            ?? $user->setting('default_system_prompt')
            ?? 'You are a helpful AI assistant. Be concise, accurate, and friendly. Format responses with markdown when appropriate.';

        // OpenClaw branch — bypass Prism, use WebSocket gateway
        if (str_starts_with($model, 'openclaw:')) {
            return response()->stream(function () use ($conversation, $messages) {
                $this->streamOpenClaw($conversation, $messages);
            }, 200, [
                'Cache-Control' => 'no-cache',
                'Content-Type' => 'text/event-stream',
                'X-Accel-Buffering' => 'no',
                'X-Conversation-Id' => $conversation->id,
            ]);
        }

        // Claude Code CLI branch — bypass Prism entirely
        if (str_starts_with($model, 'claude-code:')) {
            $projectName = substr($model, strlen('claude-code:'));
            $cliProjectDir = rtrim(config('ai.projects_dir'), '/') . '/' . $projectName;

            if (!is_dir($cliProjectDir)) {
                return response()->stream(function () {
                    echo 'Error: Project directory not found.';
                    if (ob_get_level()) ob_flush();
                    flush();
                }, 200, [
                    'Cache-Control' => 'no-cache',
                    'Content-Type' => 'text/event-stream',
                    'X-Accel-Buffering' => 'no',
                    'X-Conversation-Id' => $conversation->id,
                ]);
            }

            return response()->stream(function () use ($conversation, $messages, $cliProjectDir, $effectiveSystemPrompt) {
                $this->streamClaudeCode($conversation, $messages, $cliProjectDir, $effectiveSystemPrompt);
            }, 200, [
                'Cache-Control' => 'no-cache',
                'Content-Type' => 'text/event-stream',
                'X-Accel-Buffering' => 'no',
                'X-Conversation-Id' => $conversation->id,
            ]);
        }

        return response()->stream(function () use ($conversation, $prismMessages, $model, $provider, $effectiveSystemPrompt, $webSearch) {
            $fullResponse = '';
            $inputTokens = null;
            $outputTokens = null;

            try {
                // Two-step web search: Gemini searches, then chosen model answers
                if ($webSearch) {
                    $lastMsg = end($prismMessages);
                    $query = $lastMsg instanceof UserMessage ? $lastMsg->content : '';

                    try {
                        $searchResponse = Prism::text()
                            ->using(Provider::Gemini, 'gemini-2.0-flash')
                            ->withProviderTools([new ProviderTool('google_search')])
                            ->withPrompt("Search the web and provide a comprehensive summary of current information about: {$query}")
                            ->asText();

                        $lastIndex = count($prismMessages) - 1;
                        $enriched = "Web search results:\n\n{$searchResponse->text}\n\n---\n\nUsing the above search results as context, please answer: {$query}";
                        $media = $lastMsg instanceof UserMessage
                            ? array_merge($lastMsg->images(), $lastMsg->documents())
                            : [];
                        $prismMessages[$lastIndex] = new UserMessage($enriched, $media);
                    } catch (\Exception $e) {
                        \Log::warning('Web search failed, continuing without: ' . $e->getMessage());
                    }
                }

                // Haiku 3.5 only supports 8192 max_tokens; Prism defaults to 64000
                $maxTokens = str_contains($model, 'haiku') ? 8192 : 64000;

                $stream = Prism::text()
                    ->using($provider, $model)
                    ->withMaxTokens($maxTokens)
                    ->withSystemPrompt($effectiveSystemPrompt)
                    ->withMessages($prismMessages)
                    ->asStream();

                foreach ($stream as $event) {
                    if ($event instanceof TextDeltaEvent) {
                        $fullResponse .= $event->delta;
                        echo $event->delta;
                        if (ob_get_level()) ob_flush();
                        flush();
                    }

                    if ($event instanceof StreamEndEvent && $event->usage) {
                        $inputTokens = $event->usage->promptTokens;
                        $outputTokens = $event->usage->completionTokens;
                    }
                }
            } catch (\Exception $e) {
                $fullResponse = 'Error: ' . $e->getMessage();
                echo $fullResponse;
                if (ob_get_level()) ob_flush();
                flush();
            }

            // Save assistant response
            if ($fullResponse) {
                $conversation->messages()->create([
                    'role' => 'assistant',
                    'content' => $fullResponse,
                    'input_tokens' => $inputTokens,
                    'output_tokens' => $outputTokens,
                ]);

                // Auto-generate title from first user message
                if ($conversation->title === 'Untitled') {
                    $firstMessage = $conversation->messages()->where('role', 'user')->first();
                    if ($firstMessage) {
                        $title = str($firstMessage->content)->limit(50)->toString();
                        $conversation->update(['title' => $title]);
                    }
                }
            }
        }, 200, [
            'Cache-Control' => 'no-cache',
            'Content-Type' => 'text/event-stream',
            'X-Accel-Buffering' => 'no',
            'X-Conversation-Id' => $conversation->id,
        ]);
    }

    public function export(Conversation $conversation)
    {
        abort_unless($conversation->user_id === Auth::id(), 403);

        $conversation->load('messages');

        $markdown = "# {$conversation->title}\n\n";
        $markdown .= "Model: {$conversation->model}\n";
        $markdown .= "Date: {$conversation->created_at->format('Y-m-d H:i')}\n\n---\n\n";

        foreach ($conversation->messages as $msg) {
            $label = $msg->role === 'user' ? '**User**' : '**Assistant**';
            $markdown .= "{$label}\n\n{$msg->content}\n\n---\n\n";
        }

        $filename = Str::slug($conversation->title) . '.md';

        return response($markdown, 200, [
            'Content-Type' => 'text/markdown',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function upload(Request $request)
    {
        $request->validate([
            'files' => 'required|array|max:5',
            'files.*' => 'file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,txt,md',
        ]);

        $user = Auth::user();
        $tempIds = [];

        foreach ($request->file('files') as $file) {
            $tempId = Str::uuid()->toString();
            $path = $file->store("attachments/{$user->id}", 'local');

            session(["upload_{$tempId}" => [
                'filename' => $file->getClientOriginalName(),
                'storage_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]]);

            $tempIds[] = $tempId;
        }

        return response()->json(['temp_ids' => $tempIds]);
    }

    public function attachment(MessageAttachment $attachment)
    {
        $message = $attachment->message;
        abort_unless($message->conversation->user_id === Auth::id(), 403);

        return response()->file(
            Storage::disk('local')->path($attachment->storage_path),
            ['Content-Type' => $attachment->mime_type],
        );
    }

    public function lastMessage(Conversation $conversation)
    {
        abort_unless($conversation->user_id === Auth::id(), 403);

        $msg = $conversation->messages()
            ->where('role', 'assistant')
            ->latest()
            ->first(['id', 'input_tokens', 'output_tokens', 'cost']);

        return response()->json($msg);
    }

    public function destroy(Conversation $conversation)
    {
        abort_unless($conversation->user_id === Auth::id(), 403);

        $conversation->delete();

        return redirect()->route('chat.index');
    }

    /**
     * Append an external message (from OpenClaw TUI mirror) to a conversation.
     */
    public function appendMessage(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->user_id === Auth::id(), 403);

        $validated = $request->validate([
            'role' => 'required|in:user,assistant',
            'content' => 'required|string',
            'model_label' => 'nullable|string',
            'input_tokens' => 'nullable|integer',
            'output_tokens' => 'nullable|integer',
        ]);

        $message = $conversation->messages()->create([
            'role' => $validated['role'],
            'content' => $validated['content'],
            'input_tokens' => $validated['input_tokens'] ?? null,
            'output_tokens' => $validated['output_tokens'] ?? null,
        ]);

        return response()->json(['id' => $message->id], 201);
    }

    /**
     * Get the last user message from the OpenClaw session JSONL log.
     */
    public function openclawLastUser()
    {
        $sessionDir = env('HOME', '/home/markc') . '/.openclaw/agents/main/sessions/';
        $files = glob($sessionDir . '*.jsonl');
        if (empty($files)) {
            return response()->json(['content' => null]);
        }

        // Get the most recently modified JSONL file
        usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
        $file = $files[0];

        // Read last 50 lines and find the last user message
        $lines = array_slice(file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES), -50);
        $lastUserContent = null;

        foreach (array_reverse($lines) as $line) {
            $obj = json_decode($line, true);
            if (!$obj || ($obj['type'] ?? '') !== 'message') continue;
            $msg = $obj['message'] ?? [];
            if (($msg['role'] ?? '') !== 'user') continue;

            $content = $msg['content'] ?? '';
            if (is_array($content)) {
                $content = implode('', array_map(
                    fn($b) => ($b['type'] ?? '') === 'text' ? ($b['text'] ?? '') : '',
                    $content
                ));
            }

            // Strip OpenClaw envelope metadata + timestamp + file paths
            $content = preg_replace('/^Conversation info \(untrusted metadata\):.*?\n\n/ms', '', $content);
            // Strip [timestamp] prefix and any /tmp/ file paths
            $content = preg_replace('/^\[.*?\]\s*/', '', $content);
            $content = preg_replace('/\s*\/tmp\/\S+/', '', $content);
            $content = trim($content);

            if ($content) {
                $lastUserContent = $content;
                break;
            }
        }

        return response()->json(['content' => $lastUserContent]);
    }

    private function streamClaudeCode(Conversation $conversation, array $messages, string $projectDir, string $systemPrompt): void
    {
        set_time_limit(300);
        $fullResponse = '';

        try {
            // Build prompt from the last user message
            $lastMsg = end($messages);
            $prompt = $lastMsg['content'] ?? '';

            // Include conversation context if there are prior messages
            if (count($messages) > 1) {
                $contextParts = [];
                foreach (array_slice($messages, 0, -1) as $msg) {
                    $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
                    $contextParts[] = "{$role}: {$msg['content']}";
                }
                $context = implode("\n\n", $contextParts);
                $prompt = "Previous conversation:\n{$context}\n\nCurrent request: {$prompt}";
            }

            $home = getenv('HOME') ?: '/home/' . get_current_user();

            $process = new Process(
                [
                    $home . '/.local/bin/claude', '-p', $prompt,
                    '--no-session-persistence',
                    '--output-format', 'text',
                    '--dangerously-skip-permissions',
                    '--add-dir', "$home/.ssh",
                    '--add-dir', "$home/.ns",
                ],
                $projectDir,
                array_merge(getenv(), [
                    'HOME' => $home,
                    'SSH_AUTH_SOCK' => getenv('SSH_AUTH_SOCK') ?: '',
                ]),
                null,
                300
            );
            $process->start();

            while ($process->isRunning()) {
                $chunk = $process->getIncrementalOutput();
                if ($chunk !== '') {
                    $fullResponse .= $chunk;
                    echo $chunk;
                    if (ob_get_level()) ob_flush();
                    flush();
                }
                usleep(50000); // 50ms poll
            }

            // Capture remaining output
            $chunk = $process->getIncrementalOutput();
            if ($chunk !== '') {
                $fullResponse .= $chunk;
                echo $chunk;
                if (ob_get_level()) ob_flush();
                flush();
            }

            if ($process->getExitCode() !== 0) {
                $stderr = $process->getErrorOutput();
                if ($stderr && !$fullResponse) {
                    $fullResponse = "Error: {$stderr}";
                    echo $fullResponse;
                    if (ob_get_level()) ob_flush();
                    flush();
                }
            }
        } catch (\Exception $e) {
            $fullResponse = 'Error: ' . $e->getMessage();
            echo $fullResponse;
            if (ob_get_level()) ob_flush();
            flush();
        }

        // Save assistant response
        if ($fullResponse) {
            $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $fullResponse,
                'input_tokens' => null,
                'output_tokens' => null,
            ]);

            if ($conversation->title === 'Untitled') {
                $firstMessage = $conversation->messages()->where('role', 'user')->first();
                if ($firstMessage) {
                    $title = str($firstMessage->content)->limit(50)->toString();
                    $conversation->update(['title' => $title]);
                }
            }
        }
    }

    private function streamOpenClaw(Conversation $conversation, array $messages): void
    {
        $fullResponse = '';

        try {
            $lastMsg = end($messages);
            $prompt = $lastMsg['content'] ?? '';

            // Include conversation context if there are prior messages
            if (count($messages) > 1) {
                $contextParts = [];
                foreach (array_slice($messages, 0, -1) as $msg) {
                    $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
                    $contextParts[] = "{$role}: {$msg['content']}";
                }
                $context = implode("\n\n", $contextParts);
                $prompt = "Previous conversation:\n{$context}\n\nCurrent request: {$prompt}";
            }

            $bridge = new OpenClawBridge();
            foreach ($bridge->streamMessage($prompt) as $chunk) {
                $fullResponse .= $chunk;
                echo $chunk;
                if (ob_get_level()) ob_flush();
                flush();
            }
        } catch (\Exception $e) {
            $fullResponse = 'Error: ' . $e->getMessage();
            echo $fullResponse;
            if (ob_get_level()) ob_flush();
            flush();
        }

        if ($fullResponse) {
            $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $fullResponse,
                'input_tokens' => null,
                'output_tokens' => null,
            ]);

            if ($conversation->title === 'Untitled') {
                $firstMessage = $conversation->messages()->where('role', 'user')->first();
                if ($firstMessage) {
                    $title = str($firstMessage->content)->limit(50)->toString();
                    $conversation->update(['title' => $title]);
                }
            }
        }
    }

    private function providerForModel(string $model): Provider
    {
        return match (true) {
            str_starts_with($model, 'gpt-'),
            str_starts_with($model, 'o1-'),
            str_starts_with($model, 'o3-') => Provider::OpenAI,
            str_starts_with($model, 'gemini-') => Provider::Gemini,
            default => Provider::Anthropic,
        };
    }
}
