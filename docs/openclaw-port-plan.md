# OpenClaw Control UI → LaRaDav Port Plan

## Source Analysis

The OpenClaw Control UI (`~/.gh/clawd/ui/src/ui/`) is a **Lit + TypeScript** SPA with ~30K lines across 139 files:

| Layer | Files | Lines | Purpose |
|-------|-------|-------|---------|
| **Views** | 50 | 14,006 | Lit HTML templates (the bulk — channel configs, usage charts, etc.) |
| **App-level** | 14 | 4,935 | State management, lifecycle, routing, scroll, events |
| **Controllers** | 22 | 2,522 | Gateway RPC wrappers (chat, sessions, config, cron, etc.) |
| **Chat** | 8 | 1,208 | Message extraction, normalization, tool cards, grouped rendering |
| **Gateway** | 1 | 312 | WebSocket client (`GatewayBrowserClient` class) |
| **Types** | 3 | 810 | TypeScript interfaces for all gateway data |
| **Utilities** | ~40 | ~5,800 | Formatting, markdown, icons, theme, navigation, UUID |

### Architecture Pattern
- **`GatewayBrowserClient`** — WebSocket class with challenge-response auth, request/response promises, event dispatch, auto-reconnect with backoff
- **Controllers** — Pure functions that mutate state objects (`ChatState`, `SessionsState`, etc.) via gateway RPC calls
- **Views** — Lit `html` templates that read state and dispatch events
- **App** — Single `LitElement` component with ~100 `@state()` properties, orchestrates everything

### Key Insight
The controllers and gateway client are **framework-agnostic** — they operate on plain TypeScript state objects. Only the views and app shell are Lit-specific. This makes porting straightforward.

---

## Target Stack

| Layer | OpenClaw (Lit) | LaRaDav (Target) |
|-------|----------------|------------------|
| **UI Framework** | Lit Web Components | React 19 + Inertia 2 |
| **State** | Mutable `@state()` properties | React hooks (`useState`, `useReducer`, Context) |
| **Routing** | Custom `navigation.ts` + `popstate` | Inertia router + Laravel routes |
| **Styling** | CSS-in-JS (Lit `css`) | Tailwind CSS + shadcn/ui |
| **Markdown** | Custom `markdown.ts` (marked) | react-markdown (already in LaRaDav) |
| **Backend** | None (pure client) | Laravel 12 + SQLite |
| **LLM** | Gateway only | Gateway + Prism PHP (multi-provider) |
| **Notifications** | None | Reverb/Echo WebSocket |
| **Persistence** | None (ephemeral) | SQLite via Eloquent |
| **Auth** | Gateway token | Laravel Breeze (session) |

---

## Porting Strategy: Phased Approach

### Phase 0: Foundation (Already Done ✅)
What we built tonight:
- `use-openclaw.ts` — WebSocket hook (basic version of `GatewayBrowserClient`)
- Bidirectional TUI ↔ LaRaDav chat
- Model selector with Local group (Clawd Chat/Dev)
- Message persistence to SQLite
- Token usage metadata display

### Phase 1: Gateway Client Rewrite
**Port `gateway.ts` → `use-gateway.ts` React hook**

Replace our ad-hoc `use-openclaw.ts` with a proper port of `GatewayBrowserClient`:
- Challenge-response auth with device identity (crypto.subtle)
- Proper backoff reconnection (800ms → 15s with 1.7x factor)
- Sequence tracking with gap detection
- Clean request/response promise management
- Event dispatch via callback refs

**Files to port:**
- `gateway.ts` → `hooks/use-gateway.ts` (React hook wrapping the class)
- `uuid.ts` → `lib/uuid.ts` (drop-in, crypto.randomUUID)
- `device-identity.ts` → `lib/device-identity.ts` (drop-in if secure context)
- `device-auth.ts` → `lib/device-auth.ts` (localStorage token management)

**Effort:** ~1 session

### Phase 2: Chat Core
**Port chat controllers + message handling**

- `controllers/chat.ts` → `hooks/use-chat.ts`
  - `sendChatMessage()` with content blocks + image attachments
  - `handleChatEvent()` with proper runId tracking
  - `loadChatHistory()` via gateway RPC
  - `abortChatRun()`
- `chat/message-extract.ts` → `lib/message-extract.ts` (drop-in)
- `chat/message-normalizer.ts` → `lib/message-normalizer.ts` (drop-in)
- `chat/tool-helpers.ts` → `lib/tool-helpers.ts` (drop-in)
- `chat/tool-cards.ts` → `components/chat/tool-cards.tsx` (Lit→React)
- `chat/grouped-render.ts` → `components/chat/message-group.tsx` (Lit→React)
- `chat/copy-as-markdown.ts` → `lib/copy-as-markdown.ts` (drop-in)
- `app-tool-stream.ts` → `hooks/use-tool-stream.ts` (tool call tracking)

**Key changes from Lit:**
- `handleChatEvent` mutates state → React needs `dispatch` or `setState` callbacks
- Grouped rendering uses Lit `html` → convert to JSX
- Tool cards use Lit directives → convert to React components

**Effort:** ~2 sessions

### Phase 3: Session Management
**Port session listing, switching, creation**

- `controllers/sessions.ts` → `hooks/use-sessions.ts`
  - `loadSessions()` — list active sessions with filters
  - `patchSession()` — rename, change thinking level
  - `deleteSession()` — with confirmation
- `views/sessions.ts` → `pages/sessions.tsx` (Inertia page)
- Session selector in chat header (already partially done)

**Backend addition:**
- `SessionController.php` — proxy or cache session data in SQLite
- Model: `OpenClawSession` — optional local mirror of gateway sessions

**Effort:** ~1 session

### Phase 4: Overview & Status Dashboard
**Port the overview/status tab**

- `controllers/presence.ts` → `hooks/use-presence.ts`
- `views/overview.ts` → `pages/overview.tsx`
  - Gateway status (version, uptime, model)
  - Connected clients/instances
  - Channel status summary
  - Health indicators
- `views/instances.ts` → `pages/instances.tsx`

**Effort:** ~1 session

### Phase 5: Configuration Editor
**Port the config editor**

- `controllers/config.ts` → `hooks/use-config.ts`
  - `loadConfig()` / `saveConfig()` / `resetConfig()`
  - Schema-driven form generation
- `controllers/config/form-utils.ts` → `lib/config-form-utils.ts`
- `controllers/config/form-coerce.ts` → `lib/config-form-coerce.ts`
- `views/config.ts` + `config-form.ts` → `pages/config.tsx`

This is the most complex view (form generation from JSON schema). Consider using a React JSON schema form library instead of porting the custom Lit implementation.

**Effort:** ~2 sessions

### Phase 6: Cron Jobs
**Port cron management**

- `controllers/cron.ts` → `hooks/use-cron.ts`
  - CRUD operations on cron jobs
  - Run history
  - Manual trigger
- `views/cron.ts` → `pages/cron.tsx`

**Effort:** ~1 session

### Phase 7: Usage & Metrics
**Port usage analytics**

- `controllers/usage.ts` → `hooks/use-usage.ts`
- `usage-helpers.ts` → `lib/usage-helpers.ts` (drop-in, query filtering)
- `views/usage.ts` + `usage-metrics.ts` + `usage-query.ts` → `pages/usage.tsx`
- `views/usage-render-*.ts` → `components/usage/` (React components)

**Effort:** ~2 sessions

### Phase 8: Agent Management
**Port agent workspace, files, skills, identity**

- `controllers/agents.ts` → `hooks/use-agents.ts`
- `controllers/agent-files.ts` → `hooks/use-agent-files.ts`
- `controllers/agent-skills.ts` → `hooks/use-agent-skills.ts`
- `controllers/agent-identity.ts` → `hooks/use-agent-identity.ts`
- `views/agents.ts` → `pages/agents.tsx`
- `views/skills.ts` → `pages/skills.tsx`

**Effort:** ~2 sessions

### Phase 9: Channel Management (Optional)
**Port channel configuration — may not be needed since markc doesn't use messaging apps**

- `controllers/channels.ts` → `hooks/use-channels.ts`
- `views/channels.*.ts` → `pages/channels/*.tsx`

**Effort:** ~3 sessions (lots of provider-specific views)
**Recommendation:** Skip entirely. markc doesn't use 3rd party messaging.

### Phase 10: Debug & Logs
**Port debug tools and log viewer**

- `controllers/logs.ts` → `hooks/use-logs.ts`
- `controllers/debug.ts` → `hooks/use-debug.ts`
- `views/logs.ts` → `pages/logs.tsx` (live log tail)
- `views/debug.ts` → `pages/debug.tsx` (raw RPC, event viewer)

**Effort:** ~1 session

---

## What LaRaDav Adds Beyond the Control UI

| Feature | Control UI | LaRaDav |
|---------|-----------|---------|
| **Multi-provider chat** | Gateway only | Prism PHP (Claude, GPT, Gemini, Ollama) |
| **Message persistence** | Ephemeral | SQLite with full history |
| **Conversation management** | Single session | Multiple conversations with titles |
| **File attachments** | Image preview | Upload + store + reference |
| **System prompts** | None | Templates + custom per-conversation |
| **Web search** | Via tools | Gemini web grounding integration |
| **Push notifications** | None | Reverb/Echo real-time events |
| **Auth** | Token only | Full user auth (Breeze) |
| **TUI mirroring** | N/A | Bidirectional TUI ↔ browser |
| **Theme** | Built-in dark/light | DCS (Dual Carousel Sidebar) with schemes |

---

## Drop-in Files (No Framework Changes Needed)

These can be copied directly from `~/.gh/clawd/ui/src/ui/` with minimal changes (remove Lit imports, adjust paths):

1. `chat/message-extract.ts` → `lib/message-extract.ts`
2. `chat/message-normalizer.ts` → `lib/message-normalizer.ts`
3. `chat/tool-helpers.ts` → `lib/tool-helpers.ts`
4. `chat/copy-as-markdown.ts` → `lib/copy-as-markdown.ts`
5. `chat/constants.ts` → `lib/chat-constants.ts`
6. `uuid.ts` → `lib/uuid.ts`
7. `format.ts` → `lib/format.ts`
8. `text-direction.ts` → `lib/text-direction.ts`
9. `usage-helpers.ts` → `lib/usage-helpers.ts`
10. `tool-display.ts` + `tool-display.json` → `lib/tool-display.ts`

---

## Priority Order (Recommended)

1. **Phase 1** — Gateway client rewrite (foundation for everything)
2. **Phase 2** — Chat core (biggest user-facing improvement)
3. **Phase 3** — Sessions (multi-session chat)
4. **Phase 4** — Overview dashboard
5. **Phase 6** — Cron jobs
6. **Phase 10** — Debug & logs
7. **Phase 5** — Config editor
8. **Phase 7** — Usage metrics
9. **Phase 8** — Agent management
10. **Phase 9** — Channels (skip unless needed)

---

## Estimated Total Effort

| Phases | Sessions | Priority |
|--------|----------|----------|
| 1-3 (Core) | ~4 sessions | **Must have** |
| 4-6 (Control) | ~3 sessions | **Should have** |
| 7-8 (Analytics/Agents) | ~4 sessions | Nice to have |
| 9 (Channels) | ~3 sessions | Skip |
| 10 (Debug) | ~1 session | Nice to have |

**Core port: ~4 working sessions. Full port (minus channels): ~12 sessions.**

---

## Laravel/AI + Laravel/Boost Integration Points

### Laravel/AI (Prism PHP successor?)
- Could replace direct Prism calls for multi-provider chat
- Gateway chat remains separate (WebSocket, not HTTP)
- Useful for: embeddings, RAG, structured output, tool calling via API providers

### Laravel/Boost
- MCP server support — could expose LaRaDav tools to the gateway agent
- Browser automation via Boost's Playwright integration
- File search / code analysis

### Reverb/Echo
- Already integrated for push notifications
- Extend to: session status updates, cron job completions, agent alerts
- Private channels per user for multi-tenant support

---

## File Structure (Proposed)

```
resources/js/
├── lib/                          # Drop-in utilities from OpenClaw
│   ├── message-extract.ts
│   ├── message-normalizer.ts
│   ├── tool-helpers.ts
│   ├── format.ts
│   ├── uuid.ts
│   └── ...
├── hooks/                        # React hooks (ported controllers)
│   ├── use-gateway.ts            # GatewayBrowserClient as hook
│   ├── use-chat.ts               # Chat state + events
│   ├── use-sessions.ts           # Session management
│   ├── use-tool-stream.ts        # Tool call tracking
│   ├── use-config.ts             # Config editor
│   ├── use-cron.ts               # Cron management
│   └── ...
├── components/
│   ├── chat/                     # Chat UI components
│   │   ├── message-group.tsx     # Slack-style grouped messages
│   │   ├── tool-cards.tsx        # Tool call/result display
│   │   ├── message-input.tsx     # (existing, enhanced)
│   │   ├── message-list.tsx      # (existing, enhanced)
│   │   └── stream-bubble.tsx     # Streaming response
│   ├── control/                  # Control panel components
│   │   ├── overview-card.tsx
│   │   ├── session-list.tsx
│   │   └── ...
│   └── ...
├── pages/                        # Inertia pages
│   ├── chat/                     # Chat interface (existing)
│   ├── control/                  # Control dashboard
│   │   ├── overview.tsx
│   │   ├── sessions.tsx
│   │   ├── config.tsx
│   │   ├── cron.tsx
│   │   ├── usage.tsx
│   │   └── logs.tsx
│   └── ...
└── contexts/
    └── gateway-context.tsx       # Shared gateway connection
```
