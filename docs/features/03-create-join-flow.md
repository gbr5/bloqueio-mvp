# Create/Join Flow - Implementation Plan

> **Status:** 🟡 In Progress  
> **Priority:** P0 (MVP Core Feature)  
> **Estimated Time:** 6-8 hours  
> **Actual Time:** TBD

## Context

**Why we're building this:**

- Players need a way to create multiplayer game rooms
- Players need to join existing rooms via 6-digit codes
- Host needs to see waiting players before starting the game
- This is the entry point for all multiplayer sessions

**Dependencies:**

- [x] Database setup (01-neon-setup.md)
- [x] useGameRoom hook (02-types-and-hook.md)
- [x] Type definitions in place

**Related Docs:**

- [MVP_PLAN.md - Phase 3](../MVP_PLAN.md#phase-3-createjoin-flow)
- [DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md)

---

## Success Criteria

**Must Have (MVP):**

- [ ] Home screen with Create/Join options
- [ ] Create room generates 6-digit code
- [ ] Room code displayed prominently
- [ ] Join screen accepts room code input
- [ ] Waiting lobby shows room code and players
- [ ] Host can start game when ready
- [ ] Navigation between screens works

**Nice to Have (Post-MVP):**

- [ ] Copy room code button
- [ ] Share room link
- [ ] Player name customization
- [ ] Room settings (player count, timer)

**How We'll Know It Works:**

- [ ] Can create room and see code
- [ ] Can join room with code from another browser tab
- [ ] Waiting lobby updates when players join
- [ ] Game starts when host clicks "Start"

---

## Technical Design

### Route Structure

```
/                   → Home (Create or Join)
/room/[code]        → Game Room (playing or waiting)
/room/[code]/lobby  → Waiting Lobby (before game starts)
```

**Note:** For MVP, we'll use single-page navigation with state management instead of Next.js routing. Keep it simple.

### Component Structure

```
src/
├── app/
│   └── page.tsx (main game - already exists)
├── components/
│   ├── HomeScreen.tsx        → Create/Join options
│   ├── CreateRoom.tsx        → Room creation flow
│   ├── JoinRoom.tsx          → Join with code
│   └── WaitingLobby.tsx      → Pre-game lobby
```

### Data Flow

```
Home Screen
    ↓ (Create Room)
    → useGameRoom.createRoom()
    → Get room code
    → Navigate to Waiting Lobby

Home Screen
    ↓ (Join Room)
    → Enter code
    → useGameRoom.loadRoom(code)
    → Navigate to Waiting Lobby

Waiting Lobby
    → Poll for room updates
    → Show joined players
    → Host clicks "Start"
    → Navigate to Game
```

### State Management

```typescript
// App-level state
type AppScreen = "home" | "create" | "join" | "lobby" | "game";
const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
const [roomCode, setRoomCode] = useState<string | null>(null);
const [isHost, setIsHost] = useState(false);
```

---

## Implementation Checklist

### Phase 1: Home Screen (1.5 hours)

- [ ] Create `src/components/HomeScreen.tsx`
- [ ] Design with Create/Join buttons
- [ ] Add simple styling (match current dark theme)
- [ ] Wire up navigation state
- [ ] Test navigation between screens

### Phase 2: Create Room Flow (2 hours)

- [ ] Create `src/components/CreateRoom.tsx`
- [ ] Use `useGameRoom.createRoom()`
- [ ] Display generated room code
- [ ] Add "Copy Code" functionality
- [ ] Navigate to lobby after creation
- [ ] Show loading and error states

### Phase 3: Join Room Flow (2 hours)

- [ ] Create `src/components/JoinRoom.tsx`
- [ ] Build code input (6 characters, uppercase)
- [ ] Use `useGameRoom.loadRoom(code)`
- [ ] Validate room exists
- [ ] Handle "room not found" error
- [ ] Navigate to lobby on success

### Phase 4: Waiting Lobby (2.5 hours)

- [ ] Create `src/components/WaitingLobby.tsx`
- [ ] Display room code prominently
- [ ] Show list of players (from room.gameState)
- [ ] Implement polling for updates (2-second intervals)
- [ ] Add "Start Game" button (host only)
- [ ] Add "Leave Room" button
- [ ] Handle game start transition

### Phase 5: Integration & Testing (1 hour)

- [ ] Integrate all components into `page.tsx`
- [ ] Test full flow: Create → Wait → Start
- [ ] Test full flow: Join → Wait → Start
- [ ] Test error cases (invalid code, etc.)
- [ ] Verify multi-tab simulation works
- [ ] Update documentation

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────┐
│         BLOQUEIO                │
│                                 │
│  ┌─────────────────────────┐  │
│  │   Create New Game       │  │
│  └─────────────────────────┘  │
│                                 │
│  ┌─────────────────────────┐  │
│  │   Join Game             │  │
│  └─────────────────────────┘  │
│                                 │
│  ┌─────────────────────────┐  │
│  │   Play Offline          │  │
│  └─────────────────────────┘  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│    Waiting for Players          │
│                                 │
│    Room Code: ABC123            │
│    [Copy Code]                  │
│                                 │
│    Players (2/4):               │
│    • Player 1 (You) ★          │
│    • Player 2                   │
│                                 │
│    Waiting for more players...  │
│                                 │
│    [Start Game] [Leave]         │
└─────────────────────────────────┘
```

---

## Testing Plan

**Manual Tests:**

1. **Create Room:**

   - Click "Create New Game"
   - Verify room code generated (6 chars)
   - Verify navigated to lobby
   - Check database has room

2. **Join Room:**

   - Open new tab
   - Enter room code
   - Verify joined same room
   - Check both tabs show 2 players

3. **Polling:**

   - With 2 tabs open
   - Join from tab 2
   - Verify tab 1 updates player list (within 2-3 seconds)

4. **Start Game:**
   - Host clicks "Start Game"
   - Verify both tabs navigate to game
   - Check game state is loaded

**Edge Cases to Verify:**

- [ ] Invalid room code shows error
- [ ] Joining full room (4 players) shows error
- [ ] Leaving lobby updates other players
- [ ] Host leaving assigns new host
- [ ] Room cleanup after all players leave

---

## Risks & Mitigations

| Risk                               | Likelihood | Impact | Mitigation                               |
| ---------------------------------- | ---------- | ------ | ---------------------------------------- |
| Polling causes too many DB queries | Medium     | Medium | Use 2-second intervals, optimize queries |
| Multi-tab sync doesn't work        | Low        | High   | Test thoroughly with multiple tabs       |
| Room code collisions               | Very Low   | Low    | 6 chars = 2.1B combinations              |
| Players join mid-game              | Low        | Medium | Check room status before joining         |

---

## Rollback Plan

**If create/join breaks:**

1. Keep "Play Offline" button working
2. Users can still play local hot-seat game
3. Fix multiplayer in separate branch

**Safe State:**

- Current game still works as-is
- New components are additive
- Can disable multiplayer UI if needed

---

## Post-Implementation

**What We Learned:**

- [To be filled after completion]

**Follow-up Tasks:**

- [ ] Add player name customization
- [ ] Add room settings (player count)
- [ ] Add "reconnect" if player disconnects
- [ ] Add room expiration (auto-delete old rooms)

**Related Future Work:**

- See: [04-realtime-sync.md](./04-realtime-sync.md) - Will improve polling
- See: [05-deployment.md](./05-deployment.md) - Will test in production
