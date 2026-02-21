<?php

namespace Database\Seeders;

use App\Models\SystemPromptTemplate;
use Illuminate\Database\Seeder;

class SystemPromptTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Default Assistant',
                'prompt' => 'You are a helpful AI assistant. Be concise, accurate, and friendly. Format responses with markdown when appropriate.',
            ],
            [
                'name' => 'Code Expert',
                'prompt' => 'You are an expert software engineer. Provide clean, well-structured code with brief explanations. Follow best practices and modern patterns. When reviewing code, be specific about issues and suggest improvements.',
            ],
            [
                'name' => 'Creative Writer',
                'prompt' => 'You are a creative writing assistant. Help with storytelling, copywriting, and content creation. Use vivid language, varied sentence structures, and engaging prose. Adapt your tone to match the requested style.',
            ],
            [
                'name' => 'Concise Responder',
                'prompt' => 'Be extremely concise. Answer in as few words as possible while remaining accurate and helpful. Use bullet points for lists. Skip pleasantries and filler words. Get straight to the point.',
            ],
        ];

        foreach ($templates as $template) {
            SystemPromptTemplate::firstOrCreate(
                ['name' => $template['name'], 'user_id' => null],
                $template,
            );
        }
    }
}
