<?php declare(strict_types=1);
// Copyright (C) 2015-2026 Mark Constable <mc@netserva.org> (MIT License)
// ai4me Project Dashboard
// Usage: cd ~/.gh && php -S localhost:8000 index.php → /ai4me/

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve static files
if ($uri !== '/' && is_file(__DIR__ . $uri)) return false;

// Docs folder
if (str_starts_with($uri, '/docs')) {
    $f = __DIR__ . $uri;
    if (is_file($f)) return false;
    if (is_dir($f) && is_file("$f/index.html")) return require "$f/index.html";
}

// Dashboard page
$features = [
    ['message-square', 'AI Chat', 'Multi-provider LLM chat with SSE streaming, web search, file attachments'],
    ['columns-3', 'DCS Layout', 'Dual Carousel Sidebars with multi-panel sliding navigation'],
    ['palette', 'Theme System', '5 OKLCH color schemes + dark/light mode with glassmorphism'],
    ['table', 'Datatables', 'Reusable admin tables via TanStack Table with sorting and pagination'],
    ['bar-chart-3', 'Usage Stats', 'Token tracking, cost breakdown by model, conversation analytics'],
    ['shield', 'Multi-Provider', 'Anthropic, OpenAI, and Google Gemini via Prism PHP'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ai4me</title>
    <link rel="stylesheet" href="docs/base.css">
    <link rel="stylesheet" href="docs/site.css">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <script>(function(){var s=JSON.parse(localStorage.getItem('base-state')||'{}'),t=s.theme,c=s.scheme,h=document.documentElement;h.className='preload '+(t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))+(c&&c!=='default'&&c!=='crimson'?' scheme-'+c:'');})()</script>
</head>
<body>
<nav class="topnav">
    <button class="menu-toggle" data-sidebar="left"><i data-lucide="menu"></i></button>
    <h1><a class="brand" href="./"><span>ai4me</span></a></h1>
    <button class="menu-toggle" data-sidebar="right"><i data-lucide="menu"></i></button>
</nav>
<aside class="sidebar sidebar-left">
    <div class="sidebar-header">
        <span><i data-lucide="compass"></i> Navigation</span>
        <button class="pin-toggle" data-sidebar="left" title="Pin sidebar"><i data-lucide="pin"></i></button>
    </div>
    <nav>
        <a href="docs/" data-icon="book-open"><i data-lucide="book-open"></i> Documentation</a>
        <a href="https://github.com/markc/ai4me" data-icon="github"><i data-lucide="github"></i> GitHub</a>
    </nav>
</aside>
<aside class="sidebar sidebar-right">
    <div class="sidebar-header">
        <span><i data-lucide="sliders-horizontal"></i> Settings</span>
        <button class="pin-toggle" data-sidebar="right" title="Pin sidebar"><i data-lucide="pin"></i></button>
    </div>
    <nav>
        <a href="#" data-scheme="default" data-icon="flame"><i data-lucide="flame"></i> Crimson</a>
        <a href="#" data-scheme="stone" data-icon="circle"><i data-lucide="circle"></i> Stone</a>
        <a href="#" data-scheme="ocean" data-icon="waves"><i data-lucide="waves"></i> Ocean</a>
        <a href="#" data-scheme="forest" data-icon="trees"><i data-lucide="trees"></i> Forest</a>
        <a href="#" data-scheme="sunset" data-icon="sunset"><i data-lucide="sunset"></i> Sunset</a>
        <div class="sidebar-divider"></div>
        <a href="#" onclick="Base.toggleTheme();return false" data-icon="moon"><i data-lucide="moon"></i> Toggle Theme</a>
    </nav>
</aside>
<main>
    <div class="card">
        <h2>ai4me</h2>
        <p>Laravel 12 + React 19 AI chat application with Dual Carousel Sidebars (DCS)</p>
        <table class="chapter-table">
<?php foreach ($features as $f): ?>
            <tr>
                <td><strong><i data-lucide="<?= $f[0] ?>"></i> <?= $f[1] ?></strong></td>
                <td><?= $f[2] ?></td>
            </tr>
<?php endforeach; ?>
        </table>
    </div>
    <div class="card mt-4">
        <h2>Tech Stack</h2>
        <table class="chapter-table">
            <tr><td><strong>Backend</strong></td><td>PHP 8.4+, Laravel 12, Inertia 2</td></tr>
            <tr><td><strong>Frontend</strong></td><td>React 19, TypeScript, Tailwind CSS 4</td></tr>
            <tr><td><strong>LLM</strong></td><td>Prism PHP (Anthropic, OpenAI, Gemini)</td></tr>
            <tr><td><strong>Streaming</strong></td><td>@laravel/stream-react SSE</td></tr>
            <tr><td><strong>Build</strong></td><td>Vite 7, SQLite (dev)</td></tr>
        </table>
    </div>
</main>
<div class="overlay"></div>
<script src="docs/base.js"></script>
</body>
</html>
