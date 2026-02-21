# Architecture

## Layout Structure

The DCS layout consists of three main zones:

```
+----------+---------------------+----------+
| Left     |                     | Right    |
| Sidebar  |    Main Content     | Sidebar  |
| (panels) |                     | (panels) |
+----------+---------------------+----------+
```

### Component Hierarchy

```
ThemeProvider
  AppLayout
    TopNav (hamburger toggles + branding)
    LeftSidebar
      PanelCarousel
        NavPanel (panel 0)
        ConversationsPanel (panel 1)
    MainContent (Inertia page)
    RightSidebar
      PanelCarousel
        ThemePanel (panel 0)
        UsagePanel (panel 1)
```

## State Management

All layout state flows through `ThemeContext`:

- **ThemeState** — `theme`, `scheme`, `left`, `right`
- **SidebarState** — `open`, `pinned`, `panel` (per side)
- **Persistence** — Single `base-state` localStorage key

### State Flow

1. `ThemeProvider` loads state from localStorage on mount
2. State changes trigger `saveState()` and DOM updates (theme class, scheme class)
3. `PanelCarousel` reads `panel` from context, applies `translateX(-N * 100%)`
4. Pin state adds CSS margins to main content via Tailwind conditional classes

## Data Architecture

### Shared Props (HandleInertiaRequests)

| Prop | Type | Description |
|------|------|-------------|
| `sidebarConversations` | Eager closure | 50 latest conversations (id, title, model, updated_at) |
| `sidebarStats` | Eager | Conversation/message counts, token totals, cost by model |

### Page Props

Pages receive only their specific data. The chat page receives `conversation` and `templates` — the conversations list comes from shared props.

## Persistent Layouts

Inertia 2 persistent layouts prevent sidebar remounting on navigation:

- `defaultLayout` defined **outside** `createInertiaApp` as a stable reference
- Applied in the `resolve` callback: `page.default.layout = defaultLayout`
- Auth pages and welcome page excluded from the default layout

This ensures sidebars maintain their open/pinned/panel state across page navigations without FOUC.
