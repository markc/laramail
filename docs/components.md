# Components

## PanelCarousel

The core DCS component. Renders a header with navigation controls and a sliding viewport of panels.

**File:** `resources/js/components/panel-carousel.tsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `panels` | `{label, content}[]` | Array of panel definitions |
| `activePanel` | `number` | Currently visible panel index |
| `onPanelChange` | `(index) => void` | Called when user navigates |
| `headerLeft` | `ReactNode` | Left slot (spacer or pin button) |
| `headerRight` | `ReactNode` | Right slot (pin button or spacer) |

### Header Layout

```
[headerLeft] [< chevron] [dot · dot] [chevron >] [headerRight]
```

- Active dot renders as a wider pill (16px), inactive as a small circle (6px)
- Chevrons become transparent (invisible) at boundaries
- 300ms ease-in-out transition on the sliding viewport

### Viewport

Uses `overflow-hidden` with a horizontal flex strip. Each panel is `width: 100%; shrink-0` with independent `overflow-y-auto`. Panel switching applies `translateX(-N * 100%)`.

---

## Panel Components

### NavPanel

**File:** `resources/js/components/panels/nav-panel.tsx`

Navigation links (Dashboard, AI Chat, Users) with active-state border highlighting. Extracted from the original `LeftSidebar`.

### ConversationsPanel

**File:** `resources/js/components/panels/conversations-panel.tsx`

Search + conversation list with export/delete actions. Reads `sidebarConversations` from Inertia shared props. Detects current conversation ID from `window.location.pathname`.

### ThemePanel

**File:** `resources/js/components/panels/theme-panel.tsx`

5 color scheme buttons + Light/Dark toggle. Extracted from the original `RightSidebar`.

### UsagePanel

**File:** `resources/js/components/panels/usage-panel.tsx`

4 stat cards (2x2 grid): Chats, Messages, Tokens, Total Cost. Plus a cost-by-model breakdown list. Reads `sidebarStats` from Inertia shared props.

---

## Sidebar Shells

### LeftSidebar / RightSidebar

**Files:** `resources/js/components/left-sidebar.tsx`, `right-sidebar.tsx`

Thin wrappers providing:
- Fixed positioning with glass background
- Slide transition (`translateX` controlled by `open` state)
- `PanelCarousel` with panel definitions and pin button placement

The left sidebar places the pin button on the right (outer corner). The right sidebar places it on the left (outer corner).
