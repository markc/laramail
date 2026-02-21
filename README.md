# Laramail

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-8.4+-777BB4?logo=php&logoColor=white)](https://php.net)
[![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

A JMAP webmail client for [Stalwart Mail Server](https://stalw.art), built with Laravel 12 + Inertia 2 + React 19. Email data lives exclusively in Stalwart — Laravel handles auth and attachment proxying while React talks directly to the JMAP API via [jmap-jam](https://github.com/iadsam/jmap-jam).

## Features

- **JMAP Webmail** — Full email client targeting Stalwart (RFC 8620/8621): read, compose, reply, forward, delete, move, flag
- **Split-Pane Layout** — Draggable email list + reading pane with virtual scrolling via TanStack Virtual
- **Secure HTML Rendering** — DOMPurify sanitization in a sandboxed iframe, `cid:` image proxying, external image blocking
- **Compose Panel** — Slide-up composer with To/CC/BCC address chips, attachment upload, reply/forward prefill
- **Keyboard Shortcuts** — j/k navigate, r reply, a reply-all, f forward, c compose, # delete, s star, u unread
- **Dual Carousel Sidebars** — Multi-panel sliding sidebars with glassmorphism, including a mailbox folder tree
- **AI Chat** — ChatGPT-style streaming chat supporting Anthropic, OpenAI, and Gemini via Prism PHP
- **5 OKLCH Color Schemes** — Crimson, Stone, Ocean, Forest, Sunset with dark/light mode
- **Admin Datatables** — Reusable TanStack Table components with sorting, filtering, and pagination
- **CalDAV/CardDAV** — Calendar and contact management via SabreDAV

## Architecture

```
Browser ──► React (jmap-jam) ──► Stalwart JMAP API    # reads: mailboxes, emails
Browser ──► Laravel API ──► Stalwart JMAP API          # auth, blob download/upload
```

Email data never touches the Laravel database. The `users` table stores an encrypted JMAP token for session management. Zustand stores manage all mail state client-side with optimistic updates and 15-second polling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.4+, Laravel 12, Inertia 2 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| JMAP Client | jmap-jam (browser), Laravel Http (server proxy) |
| State | Zustand (mail stores), React Context (theme) |
| Email Rendering | DOMPurify, sandboxed iframe |
| Virtual Scrolling | @tanstack/react-virtual |
| LLM | Prism PHP (Anthropic, OpenAI, Gemini) |
| Streaming | @laravel/stream-react SSE |
| Tables | @tanstack/react-table |
| Database | SQLite (dev) — app data only, no email storage |
| Build | Vite 7 |

## Quick Start

```bash
git clone https://github.com/markc/laramail.git
cd laramail
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
composer dev
```

### Environment

Configure your Stalwart server and optional AI keys in `.env`:

```
STALWART_URL=https://mail.example.com
JMAP_SESSION_URL=https://mail.example.com/.well-known/jmap

ANTHROPIC_API_KEY=your-key-here     # required for AI chat
OPENAI_API_KEY=your-key-here        # optional
GEMINI_API_KEY=your-key-here        # optional
```

### Usage

1. Navigate to `/mail`
2. Enter your Stalwart email and password
3. Browse mailboxes, read emails, compose and send

## Project Structure

```
app/
├── Http/Controllers/
│   ├── JmapAuthController.php      # connect/session/disconnect
│   ├── JmapAttachmentController.php # blob download/upload proxy
│   └── MailController.php           # Inertia page
├── Http/Middleware/
│   └── EnsureJmapSession.php        # token validation
├── Http/Requests/
│   └── ConnectJmapRequest.php       # email+password validation
└── Services/
    └── JmapService.php              # PHP JMAP client

resources/js/
├── components/mail/
│   ├── compose-panel.tsx            # slide-up composer
│   ├── email-action-bar.tsx         # reply/forward/delete toolbar
│   ├── email-html-renderer.tsx      # DOMPurify + sandboxed iframe
│   ├── email-list.tsx               # virtual-scrolled list
│   ├── email-reader.tsx             # full email viewer
│   ├── jmap-connect-form.tsx        # auth form
│   └── mail-layout.tsx              # draggable split pane
├── components/panels/
│   └── l4-mailboxes-panel.tsx       # sidebar folder tree
├── hooks/
│   ├── use-email-actions.ts         # composite action hook
│   ├── use-jmap-poll.ts             # 15s polling
│   └── use-mail-shortcuts.ts        # keyboard shortcuts
├── lib/
│   └── jmap-client.ts              # jmap-jam wrapper
├── pages/mail/
│   └── index.tsx                    # mail page
├── stores/mail/
│   ├── session-store.ts             # auth + client
│   ├── mailbox-store.ts             # folders + tree
│   ├── email-store.ts               # list + selection
│   ├── compose-store.ts             # compose state
│   └── ui-store.ts                  # layout + search
└── types/
    └── mail.ts                      # JMAP type definitions
```

## Testing

```bash
php artisan test --compact                              # all tests
php artisan test --compact tests/Feature/JmapAuthControllerTest.php   # JMAP auth
php artisan test --compact tests/Feature/MailControllerTest.php       # mail page
```

## Documentation

See `docs/` for full DCS pattern documentation, viewable as a standalone SPA at `docs/index.html`.

## License

[MIT](LICENSE)
