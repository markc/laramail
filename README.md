# ai4me

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-8.4+-777BB4?logo=php&logoColor=white)](https://php.net)
[![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

A Laravel 12 + Inertia 2 + React 19 application featuring a **Dual Carousel Sidebar (DCS)** layout, ChatGPT-style AI chat with multi-provider LLM support, and reusable admin datatables.

## Features

- **Dual Carousel Sidebars** — Left and right sidebars with multi-panel sliding navigation via chevron arrows and dot indicators
- **AI Chat** — ChatGPT-style streaming chat supporting Anthropic, OpenAI, and Gemini via Prism PHP
- **5 OKLCH Color Schemes** — Crimson (default), Stone, Ocean, Forest, Sunset with dark/light mode
- **Glassmorphism UI** — Frosted glass aesthetic with `backdrop-filter` and perceptually uniform OKLCH colors
- **Pin/Unpin Sidebars** — Desktop pinning (1280px+) pushes main content aside; responsive collapse on mobile
- **Persistent State** — Panel positions, sidebar state, theme, and color scheme saved to localStorage
- **Admin Datatables** — Reusable TanStack Table components with sorting, filtering, and pagination

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.4+, Laravel 12, Inertia 2 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| LLM | Prism PHP (Anthropic, OpenAI, Gemini) |
| Streaming | `@laravel/stream-react` SSE |
| Markdown | `streamdown` + `@streamdown/code` |
| Tables | `@tanstack/react-table` |
| Database | SQLite (dev) |
| Build | Vite 7 |

## Quick Start

```bash
git clone https://github.com/markc/ai4me.git
cd ai4me
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
composer dev
```

Set your API keys in `.env`:

```
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here      # optional
GEMINI_API_KEY=your-key-here      # optional
```

## Documentation

See the `docs/` directory for full DCS pattern documentation, viewable as a standalone SPA at `docs/index.html`.

## License

[MIT](LICENSE)
