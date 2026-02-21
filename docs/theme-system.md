# Theme System

## OKLCH Color Architecture

All color schemes use the **OKLCH** color space for perceptual uniformity. Each scheme follows an identical lightness/chroma structure with only the **hue** changing.

### Color Variable Structure

| Variable | Light Mode | Dark Mode | Purpose |
|----------|-----------|-----------|---------|
| `--bg-primary` | L: 98% | L: 12% | Page background |
| `--bg-secondary` | L: 96% | L: 16% | Cards, sidebars |
| `--bg-tertiary` | L: 92% | L: 22% | Hover states |
| `--fg-primary` | L: 25% | L: 95% | Main text |
| `--fg-secondary` | L: 40-45% | L: 75% | Secondary text |
| `--fg-muted` | L: 50-55% | L: 55% | Muted text |
| `--accent` | L: 45-60% | L: 70-80% | Brand accent |
| `--glass` | 80% opacity | 85% opacity | Sidebar background |

### Available Schemes

| Scheme | Hue | Accent (Light) | Accent (Dark) |
|--------|-----|---------------|---------------|
| Crimson | 25 | `oklch(47% 0.2 25)` | `oklch(70% 0.18 25)` |
| Stone | 60 | `oklch(45% 0.05 60)` | `oklch(80% 0.03 60)` |
| Ocean | 220 | `oklch(55% 0.12 220)` | `oklch(75% 0.12 220)` |
| Forest | 150 | `oklch(50% 0.12 150)` | `oklch(70% 0.12 150)` |
| Sunset | 45 | `oklch(60% 0.16 45)` | `oklch(72% 0.14 45)` |

## Theme Toggle

The theme system supports three modes:
1. **System preference** — `prefers-color-scheme` media query (default)
2. **Manual toggle** — Adds `dark` or `light` class to `<html>`
3. **Persisted** — Saved to `base-state` localStorage key

### Implementation

**React (ai4me app):** `ThemeContext` manages state via `useState` + `useEffect` for DOM updates.

**Vanilla JS (docs):** `Base.toggleTheme()` / `Base.setScheme()` directly manipulate DOM classes and localStorage.

Both implementations share the same `base-state` localStorage key, so theme preferences carry across the app and docs.

## Glassmorphism

Sidebars use a glass effect:

```css
background: var(--glass);           /* semi-transparent bg */
backdrop-filter: blur(20px);        /* frosted glass blur */
border-color: var(--glass-border);  /* subtle border */
```

The glass variables adjust opacity between light (80%) and dark (85%) modes for optimal readability.
