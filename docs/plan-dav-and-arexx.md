# Plan: *DAV Services + WebSocket Command Bus ("Arexx Port")

## Part 1: Stalwart *DAV Integration

### What Stalwart Already Provides

Stalwart serves **all protocols on the same HTTP listener** with unified auth:

| Protocol | JMAP Capability | DAV Path | Data Format |
|----------|----------------|----------|-------------|
| Contacts | `urn:ietf:params:jmap:contacts` (RFC 9610) | `/dav/card/` | JSContact (RFC 9553) |
| Calendars | `urn:ietf:params:jmap:calendars` (draft-26, RFC queue) | `/dav/cal/` | JSCalendar (RFC 8984) |
| Files | `urn:ietf:params:jmap:filenode` (draft-06) | `/dav/file/` | FileNode |
| Sharing | `urn:ietf:params:jmap:principals` (RFC 9670) | `/dav/pal` | Principal |

All accessible via the **same Basic Auth token** we already use for mail. The Caddy proxy at `mail.kanary.org` already forwards `/jmap/*` to Stalwart — we just need to also proxy `/dav/*` and `/.well-known/caldav|carddav`.

### Implementation Plan

#### Phase 1: Contacts (CardDAV / JMAP Contacts)
1. **Caddy proxy:** Add `/dav/*` and `/.well-known/caldav`, `/.well-known/carddav` to the `@jmap` matcher
2. **JMAP client:** Add `AddressBook/get`, `ContactCard/get`, `ContactCard/query`, `ContactCard/set` wrappers to `jmap-client.ts`
3. **Store:** New `contacts-store.ts` (Zustand) — address books, contact list, selected contact
4. **UI:** New left sidebar panel (panel 3) for contacts, contact detail view in reader pane
5. **Compose integration:** Autocomplete To/Cc/Bcc from contacts

#### Phase 2: Calendar (CalDAV / JMAP Calendars)
1. **JMAP client:** `Calendar/get`, `CalendarEvent/get`, `CalendarEvent/query`, `CalendarEvent/set`
2. **Store:** `calendar-store.ts` — calendars, events by date range, selected event
3. **UI:** Calendar view (month/week/day), event detail, create/edit event modal
4. **Scheduling:** `ParticipantIdentity` + `sendSchedulingMessages: true` for iTIP invites

#### Phase 3: Files (WebDAV / JMAP FileNode)
1. **JMAP client:** `FileNode/get`, `FileNode/set`, `FileNode/query` + blob upload/download
2. **Store:** `files-store.ts` — file tree, breadcrumbs, selected file
3. **UI:** File browser with folder hierarchy, upload/download, preview for images/text

#### Phase 4: Sharing
1. **JMAP client:** `Principal/get`, `ShareNotification/get`
2. **UI:** Share dialog on contacts/calendars/files — set `shareWith` permissions
3. **Notifications:** `ShareNotification` events displayed in notifications panel

### Architecture Notes

- All *DAV data accessed via **JMAP** (not raw DAV XML) — same `jmap-jam` client, same auth pattern
- Each app is a new "mode" in the left sidebar navigation (Mail, Contacts, Calendar, Files)
- Thunderbird/mobile can access the same data via native CalDAV/CardDAV (already works, same Stalwart server)
- JSContact/JSCalendar are JSON-native — no vCard/iCalendar parsing needed in the browser

---

## Part 2: WebSocket Command Bus ("Arexx Port")

### Concept

A **programmatic control plane** for the laramail UI, accessible via WebSocket (Reverb). External systems (AI agents, cron jobs, D-Bus bridges, CLI tools) can:

- Open the compose modal with pre-filled To/Subject/Body
- Navigate to a specific mailbox or email
- Trigger actions (send, reply, forward, move, delete)
- Switch between apps (Mail, Contacts, Calendar, Files)
- Query UI state (current mailbox, selected email, etc.)
- Push data into any future app panel

Like **Arexx** on the Amiga or **D-Bus** on Linux — a message bus that any app can listen on and respond to.

### Why Reverb

We already have:
- Reverb server running (`laramail-reverb.service`)
- Echo client initialized in the browser (`echo.ts`)
- Private `user.{id}` channel with auth
- `SystemEventPushed` event pattern to build on
- Bearer token auth for external pushers (`/api/system-events/push`)

### Architecture

```
                    ┌─────────────────────────────────┐
                    │         React Frontend           │
                    │  Echo.private('command.{userId}')│
                    │  → useCommandBus() hook          │
                    │  → dispatch to stores/UI         │
                    └──────────┬──────────────────────┘
                               │ WebSocket (Reverb)
                               │
                    ┌──────────┴──────────────────────┐
                    │       Laravel Backend            │
                    │  POST /api/command               │
                    │  → validate + broadcast          │
                    │  → CommandReceived event         │
                    └──────────┬──────────────────────┘
                               │ HTTP POST
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────┴─────┐      ┌──────┴──────┐     ┌──────┴──────┐
    │ AI Agent  │      │ Cron / Timer│     │ CLI / D-Bus │
    │ (Clawd)   │      │             │     │ Bridge      │
    └───────────┘      └─────────────┘     └─────────────┘
```

### Command Protocol

Commands are JSON messages with a `command` type and `payload`:

```typescript
interface AppCommand {
    id: string;           // UUID for request/response correlation
    command: string;       // Dot-separated namespace: "mail.compose", "calendar.create", etc.
    payload: Record<string, unknown>;
    replyTo?: string;      // Optional: channel to send response back
}
```

#### Mail Commands
| Command | Payload | Effect |
|---------|---------|--------|
| `mail.compose` | `{ to, subject, body }` | Open compose modal pre-filled |
| `mail.reply` | `{ emailId, body }` | Open reply to specific email |
| `mail.send` | `{ to, subject, body }` | Compose and send immediately (no UI) |
| `mail.navigate` | `{ mailboxId }` | Switch to mailbox |
| `mail.select` | `{ emailId }` | Select and display email |
| `mail.search` | `{ query }` | Search emails |

#### App Commands
| Command | Payload | Effect |
|---------|---------|--------|
| `app.switch` | `{ app: 'mail'|'contacts'|'calendar'|'files' }` | Switch app mode |
| `app.notify` | `{ title, body, type }` | Show notification |
| `app.state` | `{}` | Return current UI state |

#### Future *DAV Commands
| Command | Payload | Effect |
|---------|---------|--------|
| `contacts.create` | `{ name, email, phone }` | Create contact |
| `calendar.create` | `{ title, start, end, attendees }` | Create event |
| `files.upload` | `{ path, blobId }` | Upload file to path |

### Implementation Plan

#### Step 1: Command Event + Endpoint
```php
// app/Events/CommandReceived.php
class CommandReceived implements ShouldBroadcastNow {
    public function broadcastOn(): Channel {
        return new PrivateChannel("command.{$this->userId}");
    }
}

// POST /api/command (bearer token auth)
```

#### Step 2: Frontend Hook
```typescript
// resources/js/hooks/use-command-bus.ts
export function useCommandBus() {
    useEffect(() => {
        window.Echo.private(`command.${userId}`)
            .listen('.CommandReceived', (e: AppCommand) => {
                handleCommand(e);
            });
    }, []);
}

function handleCommand(cmd: AppCommand) {
    switch (cmd.command) {
        case 'mail.compose':
            useComposeStore.getState().openNew();
            useComposeStore.getState().updateCompose(cmd.payload);
            break;
        case 'mail.navigate':
            useMailboxStore.getState().selectMailbox(cmd.payload.mailboxId);
            break;
        // ...
    }
}
```

#### Step 3: CLI Tool
```bash
# Send command from terminal
php artisan app:command mail.compose \
    --to="someone@example.com" \
    --subject="Hello from CLI" \
    --body="This was triggered by a cron job"
```

#### Step 4: AI Agent Integration
The Clawd/AI subsystem can:
1. Receive a timer/webhook trigger
2. Generate email content
3. POST to `/api/command` with `mail.compose` or `mail.send`
4. The browser UI opens the compose modal with AI-generated content
5. User reviews and clicks Send (or it auto-sends with `mail.send`)

### Response Channel (Optional, Phase 2)

For bidirectional communication, commands can include `replyTo` — the frontend sends results back:

```typescript
// Frontend responds to app.state query
Echo.private(`command-reply.${cmd.replyTo}`)
    .whisper('response', { state: getCurrentState() });
```

This enables:
- CLI tools that query UI state
- AI agents that wait for user action (e.g., "compose this email, tell me when they send it")
- Test automation

---

## Timeline Suggestion

| Phase | Scope | Estimate |
|-------|-------|----------|
| **Tomorrow** | Caddy DAV proxy + JMAP Contacts read-only | Phase 1a |
| **This week** | Contacts CRUD + compose autocomplete | Phase 1b |
| **Next week** | Calendar read + basic event view | Phase 2a |
| **Next week** | Command bus (mail.compose from CLI) | Arexx Step 1-3 |
| **Following** | Files, sharing, full Arexx protocol | Phase 3-4 + Step 4 |
