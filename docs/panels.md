# Panel Configuration

## Current Panel Layout

### Left Sidebar

| Index | Panel | Description |
|-------|-------|-------------|
| 0 | Navigation | Dashboard, AI Chat, Users links |
| 1 | Conversations | Search + conversation list with export/delete |

### Right Sidebar

| Index | Panel | Description |
|-------|-------|-------------|
| 0 | Theme | 5 color schemes + light/dark toggle |
| 1 | Usage | Stats cards + cost-by-model breakdown |

## Adding a New Panel

### 1. Create the panel component

Create a new file in `resources/js/components/panels/`:

```tsx
export default function MyPanel() {
    return (
        <div className="flex flex-col gap-4 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--scheme-fg-muted)' }}>
                My Panel
            </h3>
            {/* Panel content */}
        </div>
    );
}
```

### 2. Register in the sidebar

Add it to the panels array in `left-sidebar.tsx` or `right-sidebar.tsx`:

```tsx
import MyPanel from '@/components/panels/my-panel';

const panels = [
    { label: 'Navigation', content: <NavPanel /> },
    { label: 'Conversations', content: <ConversationsPanel /> },
    { label: 'My Panel', content: <MyPanel /> },
];
```

### 3. Update the clamp range

In `theme-context.tsx`, update `clampPanel` to allow the new index:

```tsx
function clampPanel(n: number, max: number): number {
    return Math.max(0, Math.min(max, n));
}
```

Or keep the current `Math.min(1, n)` and change `1` to `2` (or the max panel index).

## Page-Specific Panel Switching

Pages can auto-switch panels on mount. For example, the chat page switches the left sidebar to the conversations panel:

```tsx
useLayoutEffect(() => {
    setPanel('left', 1);  // Switch to conversations
    return () => {};       // Optional: reset on unmount
}, [setPanel]);
```

This uses `useLayoutEffect` to switch before the first paint, avoiding a visible flash.

## Panel State Persistence

Panel indices are persisted in `localStorage` under the `base-state` key:

```json
{
    "theme": "dark",
    "scheme": "crimson",
    "leftOpen": true,
    "leftPinned": true,
    "leftPanel": 1,
    "rightOpen": false,
    "rightPinned": false,
    "rightPanel": 0
}
```

On page refresh, the last-viewed panel is restored for each sidebar.
