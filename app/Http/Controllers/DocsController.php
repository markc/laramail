<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class DocsController extends Controller
{
    public function index()
    {
        return Inertia::render('docs', [
            'doc' => null,
        ]);
    }

    public function show(string $slug)
    {
        $path = base_path("docs/{$slug}.md");

        if (! File::exists($path)) {
            abort(404);
        }

        $content = File::get($path);
        $title = $slug;

        if (preg_match('/^#\s+(.+)$/m', $content, $matches)) {
            $title = $matches[1];
        }

        return Inertia::render('docs', [
            'doc' => [
                'slug' => $slug,
                'title' => $title,
                'content' => $content,
            ],
        ]);
    }
}
