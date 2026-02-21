# ai4me Documentation

**ai4me** is a Laravel 12 + Inertia 2 + React 19 application featuring a **Dual Carousel Sidebar (DCS)** layout, ChatGPT-style AI chat with multi-provider LLM support, and reusable admin datatables.

## What is DCS?

The **Dual Carousel Sidebar** pattern provides two independent sliding sidebars (left and right), each containing multiple panels that slide horizontally via a carousel mechanism. Users navigate between panels using chevron arrows and dot indicators in the sidebar header.

### Key Features

- **Multi-panel sidebars** — Each sidebar hosts 2+ content panels accessible via horizontal sliding
- **Carousel navigation** — Chevron arrows (`< >`) and dot indicators in the header control panel switching
- **Glassmorphism** — Frosted glass aesthetic with `backdrop-filter: blur(20px)` and OKLCH color system
- **Pin/unpin** — Sidebars can be pinned on desktop (1280px+), pushing main content aside
- **Persistent state** — Panel positions, sidebar state, theme, and color scheme saved to localStorage
- **5 color schemes** — Crimson (default), Stone, Ocean, Forest, Sunset — all using OKLCH perceptual uniformity
- **Dark/light modes** — Full theme toggle with system preference detection
- **Responsive** — Sidebars collapse below 1280px, overlay on mobile

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

## Documentation

Browse the sections in the left sidebar to learn about the architecture, components, theme system, and panel configuration.
