# Bloqueio Online - Implementation Plan

**Version:** 1.0
**Created:** December 13, 2025
**Base Branch:** `main`
**Feature Branch:** `feature/multiplayer-foundation`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Branching Strategy](#2-branching-strategy)
3. [PR Guidelines](#3-pr-guidelines)
4. [Phase 1: Foundation](#4-phase-1-foundation)
5. [Phase 2: State Management](#5-phase-2-state-management)
6. [Phase 3: WebSocket Infrastructure](#6-phase-3-websocket-infrastructure)
7. [Phase 4: Multiplayer Features](#7-phase-4-multiplayer-features)
8. [Phase 5: Polish & Production](#8-phase-5-polish--production)
9. [Dependency Graph](#9-dependency-graph)
10. [Milestone Definitions](#10-milestone-definitions)

---

## 1. Overview

### Goals

1. Transform monolithic codebase into modular architecture
2. Enable online multiplayer functionality
3. Maintain local play capability throughout
4. Achieve >80% test coverage
5. Production-ready deployment

### Success Criteria

- [ ] Game playable locally at all times (no regressions)
- [ ] 4 players can play online in real-time
- [ ] Reconnection works seamlessly
- [ ] < 100ms latency for game actions
- [ ] Mobile-responsive UI

### Timeline Overview

| Phase | PRs | Focus Area |
|-------|-----|------------|
| Phase 1 | PR #01-08 | Foundation & Refactoring |
| Phase 2 | PR #09-12 | State Management |
| Phase 3 | PR #13-17 | WebSocket Infrastructure |
| Phase 4 | PR #18-23 | Multiplayer Features |
| Phase 5 | PR #24-28 | Polish & Production |

---

## 2. Branching Strategy

### Branch Naming Convention

```
<type>/<ticket-number>-<short-description>

Types:
- feature/   → New functionality
- refactor/  → Code restructuring
- fix/       → Bug fixes
- test/      → Test additions
- docs/      → Documentation
- chore/     → Maintenance tasks
```

### Branch Hierarchy

```
main (protected)
│
├── develop (integration branch)
│   │
│   ├── feature/multiplayer-foundation (epic branch)
│   │   │
│   │   ├── refactor/01-extract-types
│   │   ├── refactor/02-extract-constants
│   │   ├── refactor/03-extract-game-logic
│   │   ├── test/04-game-logic-tests
│   │   ├── refactor/05-extract-components
│   │   ├── refactor/06-migrate-styles
│   │   ├── feature/07-game-reducer
│   │   ├── fix/08-diagonal-jump
│   │   └── ... (continues)
│   │
│   └── (other feature branches)
│
└── (hotfix branches if needed)
```

### Merge Strategy

1. **Feature → Epic Branch**: Squash merge
2. **Epic → Develop**: Merge commit (preserve history)
3. **Develop → Main**: Merge commit with release tag

---

## 3. PR Guidelines

### PR Template

```markdown
## Summary
Brief description of changes (2-3 sentences)

## Type of Change
- [ ] Refactor (no functional changes)
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation

## Changes Made
- Bullet points of specific changes

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions in local play

## Screenshots (if UI changes)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Build succeeds
- [ ] Documentation updated (if needed)

## Dependencies
PRs that must be merged before this one: #XX, #XX
```

### Review Requirements

| PR Size | Reviewers | Approval Needed |
|---------|-----------|-----------------|
| S (< 100 lines) | 1 | 1 |
| M (100-300 lines) | 1-2 | 1 |
| L (300-500 lines) | 2 | 2 |
| XL (> 500 lines) | Consider splitting | - |

### Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, refactor, test, docs, chore, style
**Scope:** game-logic, components, state, socket, ui, config

**Examples:**
```
feat(game-logic): add diagonal jump movement

Implements diagonal jump when straight jump is blocked by a wall.
Players can now jump diagonally over an opponent when the
straight path is obstructed.

Closes #XX
```

---

## 4. Phase 1: Foundation

> **Goal:** Prepare codebase for multiplayer without breaking existing functionality

### PR #01: Extract Type Definitions

**Branch:** `refactor/01-extract-types`
**Size:** S (~80 lines)
**Dependencies:** None

**Description:**
Create centralized type definitions module.

**Files to Create:**
- `src/types/game.ts`
- `src/types/index.ts`

**Tasks:**
- [ ] Create `src/types/game.ts` with all game types
- [ ] Export PlayerId, GoalSide, Mode, Cell, BarrierOrientation
- [ ] Export Player, Barrier, GameSnapshot types
- [ ] Add new GameState, GameAction types
- [ ] Create barrel export in `src/types/index.ts`
- [ ] Update imports in `page.tsx`

**Acceptance Criteria:**
- All types exported from `@/types`
- `page.tsx` imports from new location
- No TypeScript errors
- Game still works locally

---

### PR #02: Extract Constants

**Branch:** `refactor/02-extract-constants`
**Size:** S (~100 lines)
**Dependencies:** PR #01

**Description:**
Create constants module for all game configuration values.

**Files to Create:**
- `src/lib/constants.ts`

**Tasks:**
- [ ] Create `src/lib/constants.ts`
- [ ] Move INNER_SIZE, SIZE constants
- [ ] Move COL_LABELS, ROW_LABELS
- [ ] Move PLAYER_BASE_COLORS
- [ ] Add BOARD, PLAYERS, COLORS, LABELS objects
- [ ] Update imports in `page.tsx`

**Acceptance Criteria:**
- No magic numbers in `page.tsx` (except indices)
- All constants importable from `@/lib/constants`
- Game still works locally

---

### PR #03: Extract Core Game Logic

**Branch:** `refactor/03-extract-game-logic`
**Size:** M (~250 lines)
**Dependencies:** PR #01, PR #02

**Description:**
Extract pure game logic functions to separate module.

**Files to Create:**
- `src/lib/game-logic.ts`

**Functions to Extract:**
- [ ] `edgeKey(r1, c1, r2, c2)` - Edge identification
- [ ] `isInside(row, col)` - Bounds checking
- [ ] `isGoal(row, col, goalSide)` - Win condition check
- [ ] `isBorderCell(row, col)` - Border detection (new)
- [ ] `createInitialPlayers()` - Game setup
- [ ] `hasPathToGoal(player, blockedEdges)` - BFS pathfinding
- [ ] `canPawnMoveTo(...)` - Move validation
- [ ] `checkWallPlacement(...)` - Barrier validation (pure version)
- [ ] `nextPlayerId(id)` - Turn cycling
- [ ] `getValidMoves(player, blockedEdges, players)` - All valid moves (new)

**Tasks:**
- [ ] Create `src/lib/game-logic.ts`
- [ ] Extract all pure functions
- [ ] Remove state dependencies from `checkWallPlacement`
- [ ] Add JSDoc comments to all functions
- [ ] Update imports in `page.tsx`

**Acceptance Criteria:**
- All functions are pure (no side effects)
- Functions can be imported for server use
- Game still works locally
- TypeScript strict compliance

---

### PR #04: Game Logic Unit Tests

**Branch:** `test/04-game-logic-tests`
**Size:** M (~300 lines)
**Dependencies:** PR #03

**Description:**
Add comprehensive unit tests for game logic.

**Files to Create:**
- `src/__tests__/game-logic.test.ts`
- `vitest.config.ts`

**Tasks:**
- [ ] Install vitest and @testing-library/react
- [ ] Configure vitest
- [ ] Add test script to package.json
- [ ] Test `edgeKey` - canonical ordering
- [ ] Test `isInside` - boundary conditions
- [ ] Test `isGoal` - all goal sides
- [ ] Test `hasPathToGoal` - path exists/blocked scenarios
- [ ] Test `canPawnMoveTo` - normal moves, jumps, barriers
- [ ] Test `checkWallPlacement` - valid/invalid placements
- [ ] Test `createInitialPlayers` - correct setup

**Test Coverage Targets:**
- `edgeKey`: 100%
- `isInside`: 100%
- `isGoal`: 100%
- `hasPathToGoal`: >90%
- `canPawnMoveTo`: >90%
- `checkWallPlacement`: >90%

**Acceptance Criteria:**
- `pnpm test` passes
- Coverage report generated
- >80% overall coverage for game-logic.ts

---

### PR #05: Fix Diagonal Jump Movement

**Branch:** `fix/05-diagonal-jump`
**Size:** S (~100 lines)
**Dependencies:** PR #03, PR #04

**Description:**
Implement missing diagonal jump rule when straight jump is blocked.

**Files to Modify:**
- `src/lib/game-logic.ts`
- `src/__tests__/game-logic.test.ts`

**Tasks:**
- [ ] Modify `canPawnMoveTo` to handle diagonal jumps
- [ ] Add logic: if straight jump blocked by wall → allow diagonal
- [ ] Add tests for diagonal jump scenarios
- [ ] Test: diagonal blocked by wall
- [ ] Test: diagonal when opponent at edge
- [ ] Update GAME_RULES.md if needed

**Algorithm:**
```typescript
// When adjacent to opponent and straight jump blocked:
// 1. Check if wall blocks straight path beyond opponent
// 2. If blocked, allow diagonal moves (opponent_row ± 1, opponent_col ± 1)
// 3. Diagonal must not be blocked by walls
// 4. Diagonal must be inside board and not occupied
```

**Acceptance Criteria:**
- Diagonal jumps work correctly
- All existing tests still pass
- New diagonal tests pass
- Game behavior matches GAME_RULES.md

---

### PR #06: Extract UI Components

**Branch:** `refactor/06-extract-components`
**Size:** L (~400 lines)
**Dependencies:** PR #03

**Description:**
Extract UI components from monolithic page.tsx.

**Files to Create:**
- `src/components/game/Board.tsx`
- `src/components/game/Cell.tsx`
- `src/components/game/Pawn.tsx`
- `src/components/game/Barrier.tsx`
- `src/components/game/GhostBarrier.tsx`
- `src/components/game/CoordinateLabels.tsx`
- `src/components/panels/PlayerPanel.tsx`
- `src/components/panels/GameControls.tsx`
- `src/components/panels/StatusBar.tsx`
- `src/components/game/index.ts` (barrel)
- `src/components/panels/index.ts` (barrel)

**Tasks:**
- [ ] Create component directory structure
- [ ] Extract Board component (grid + barriers)
- [ ] Extract Cell component (individual cell button)
- [ ] Extract Pawn component (player piece)
- [ ] Extract Barrier component (wall rendering)
- [ ] Extract GhostBarrier component (hover preview)
- [ ] Extract CoordinateLabels component
- [ ] Extract PlayerPanel component
- [ ] Extract GameControls component
- [ ] Extract StatusBar component
- [ ] Create barrel exports
- [ ] Update page.tsx to use new components

**Component Props Interface Example:**
```typescript
interface BoardProps {
  players: Player[];
  barriers: Barrier[];
  blockedEdges: Set<string>;
  currentPlayerId: PlayerId;
  mode: Mode;
  wallOrientation: BarrierOrientation;
  hoveredCell: Cell | null;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (cell: Cell | null) => void;
  canMoveTo: (row: number, col: number) => boolean;
  checkWallPlacement: (row: number, col: number) => WallCheckResult;
}
```

**Acceptance Criteria:**
- `page.tsx` reduced to < 300 lines
- All components have TypeScript interfaces
- Game still works locally
- No visual changes

---

### PR #07: Migrate Inline Styles to Tailwind

**Branch:** `refactor/07-migrate-styles`
**Size:** L (~400 lines)
**Dependencies:** PR #06

**Description:**
Convert inline styles to Tailwind CSS classes.

**Files to Modify:**
- All components in `src/components/`
- `src/app/globals.css`

**Tasks:**
- [ ] Define CSS custom properties in globals.css
- [ ] Create Tailwind color theme extensions
- [ ] Convert Board styles to Tailwind
- [ ] Convert Cell styles to Tailwind
- [ ] Convert Pawn styles to Tailwind
- [ ] Convert Barrier styles to Tailwind
- [ ] Convert Panel styles to Tailwind
- [ ] Convert StatusBar styles to Tailwind
- [ ] Remove all inline style objects
- [ ] Add dark mode support

**CSS Variables to Define:**
```css
:root {
  --color-board-cell: theme('colors.slate.950');
  --color-board-border: theme('colors.gray.800');
  --color-player-red: theme('colors.red.500');
  --color-player-blue: theme('colors.blue.500');
  --color-player-green: theme('colors.green.500');
  --color-player-yellow: theme('colors.amber.500');
  --color-barrier: theme('colors.yellow.400');
}
```

**Acceptance Criteria:**
- Zero inline styles remaining
- Visual appearance unchanged
- Tailwind classes used consistently
- CSS file organized with comments

---

### PR #08: Create Game Reducer

**Branch:** `feature/08-game-reducer`
**Size:** M (~200 lines)
**Dependencies:** PR #03, PR #04

**Description:**
Implement reducer pattern for game state management.

**Files to Create:**
- `src/lib/game-reducer.ts`
- `src/__tests__/game-reducer.test.ts`

**Tasks:**
- [ ] Define GameAction discriminated union
- [ ] Implement gameReducer function
- [ ] Handle MOVE action
- [ ] Handle PLACE_WALL action
- [ ] Handle UNDO action
- [ ] Handle RESTART action
- [ ] Handle SET_MODE action
- [ ] Handle SET_ORIENTATION action
- [ ] Handle SET_HOVERED_CELL action
- [ ] Write reducer tests
- [ ] Ensure immutable state updates

**Reducer Signature:**
```typescript
type GameAction =
  | { type: 'MOVE'; to: Cell }
  | { type: 'PLACE_WALL'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'RESTART' }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_ORIENTATION'; orientation: BarrierOrientation }
  | { type: 'SET_HOVERED_CELL'; cell: Cell | null };

function gameReducer(state: GameState, action: GameAction): GameState;
```

**Acceptance Criteria:**
- Reducer is pure function
- All actions handled
- Tests cover all action types
- State transitions are correct

---

## 5. Phase 2: State Management

> **Goal:** Implement proper state management for multiplayer readiness

### PR #09: Setup Zustand Store

**Branch:** `feature/09-zustand-store`
**Size:** M (~150 lines)
**Dependencies:** PR #08

**Description:**
Create Zustand store for global state management.

**Files to Create:**
- `src/stores/game-store.ts`
- `src/stores/index.ts`

**Tasks:**
- [ ] Install zustand and immer
- [ ] Create game store with GameState
- [ ] Implement actions using reducer
- [ ] Add selectors for common queries
- [ ] Export typed hooks

**Store Interface:**
```typescript
interface GameStore {
  // State
  gameState: GameState;

  // Actions
  dispatch: (action: GameAction) => void;

  // Selectors
  getCurrentPlayer: () => Player;
  getValidMoves: () => Cell[];
  canPlaceWall: (row: number, col: number) => boolean;
}
```

**Acceptance Criteria:**
- Store created and typed
- Actions work correctly
- Selectors are memoized
- No TypeScript errors

---

### PR #10: Create useGame Hook

**Branch:** `feature/10-use-game-hook`
**Size:** S (~100 lines)
**Dependencies:** PR #09

**Description:**
Create custom hook for game interactions.

**Files to Create:**
- `src/hooks/useGame.ts`
- `src/hooks/index.ts`

**Tasks:**
- [ ] Create useGame hook
- [ ] Wrap store actions with game logic
- [ ] Add convenience methods
- [ ] Export from barrel file

**Hook Interface:**
```typescript
function useGame() {
  return {
    // State
    gameState: GameState;
    currentPlayer: Player;
    isGameOver: boolean;
    winner: Player | null;

    // Actions
    move: (to: Cell) => boolean;
    placeWall: (row: number, col: number) => boolean;
    undo: () => void;
    restart: () => void;
    setMode: (mode: Mode) => void;
    setOrientation: (orientation: BarrierOrientation) => void;

    // Queries
    canMoveTo: (row: number, col: number) => boolean;
    canPlaceWallAt: (row: number, col: number) => WallCheckResult;
    getValidMoves: () => Cell[];
  };
}
```

**Acceptance Criteria:**
- Hook provides clean API
- Actions return success/failure
- All game operations work through hook

---

### PR #11: Refactor Page to Use Store

**Branch:** `refactor/11-page-use-store`
**Size:** M (~200 lines)
**Dependencies:** PR #10, PR #06

**Description:**
Refactor main page to use Zustand store instead of useState.

**Files to Modify:**
- `src/app/page.tsx`

**Tasks:**
- [ ] Remove all useState calls for game state
- [ ] Use useGame hook
- [ ] Update event handlers to use hook actions
- [ ] Simplify component logic
- [ ] Remove duplicate state management code

**Before/After:**
```typescript
// Before
const [players, setPlayers] = useState<Player[]>(...);
const [barriers, setBarriers] = useState<Barrier[]>([]);
// ... 8 more useState calls

// After
const { gameState, move, placeWall, ... } = useGame();
```

**Acceptance Criteria:**
- `page.tsx` uses only useGame hook
- No local game state in page
- All functionality preserved
- Code significantly cleaner

---

### PR #12: Add useLocalGame Hook

**Branch:** `feature/12-use-local-game`
**Size:** S (~80 lines)
**Dependencies:** PR #10

**Description:**
Create hook for local-only game sessions (no network).

**Files to Create:**
- `src/hooks/useLocalGame.ts`

**Tasks:**
- [ ] Create useLocalGame hook
- [ ] Initialize game state locally
- [ ] Handle all game actions locally
- [ ] Support hot-seat multiplayer

**Hook Interface:**
```typescript
function useLocalGame() {
  // Same as useGame but guaranteed local-only
  // No network dependencies
}
```

**Acceptance Criteria:**
- Local games work without network
- Can be used for offline play
- Matches useGame interface

---

## 6. Phase 3: WebSocket Infrastructure

> **Goal:** Establish real-time communication

### PR #13: WebSocket Types & Events

**Branch:** `feature/13-socket-types`
**Size:** S (~100 lines)
**Dependencies:** PR #01

**Description:**
Define WebSocket message types and events.

**Files to Create:**
- `src/types/socket.ts`
- `src/types/room.ts`

**Tasks:**
- [ ] Define client-to-server message types
- [ ] Define server-to-client message types
- [ ] Define RoomState type
- [ ] Define PlayerConnection type
- [ ] Define error types
- [ ] Export from types/index.ts

**Acceptance Criteria:**
- All WebSocket messages typed
- Types are shared-compatible (client & server)
- No any types

---

### PR #14: Socket.io Server Setup

**Branch:** `feature/14-socket-server`
**Size:** M (~250 lines)
**Dependencies:** PR #13, PR #03

**Description:**
Create Socket.io server for game rooms.

**Files to Create:**
- `src/server/index.ts`
- `src/server/socket-handlers.ts`
- `src/server/room-manager.ts`
- `src/server/game-validator.ts`

**Tasks:**
- [ ] Install socket.io
- [ ] Create server entry point
- [ ] Implement room manager (create, join, leave)
- [ ] Implement game validator (server-side validation)
- [ ] Implement socket event handlers
- [ ] Add connection/disconnection handling
- [ ] Add reconnection support

**Server Events:**
```typescript
// Handlers
io.on('connection', (socket) => {
  socket.on('create_room', handleCreateRoom);
  socket.on('join_room', handleJoinRoom);
  socket.on('leave_room', handleLeaveRoom);
  socket.on('player_ready', handlePlayerReady);
  socket.on('game_action', handleGameAction);
  socket.on('disconnect', handleDisconnect);
});
```

**Acceptance Criteria:**
- Server starts without errors
- Rooms can be created/joined
- Game actions validated server-side
- Reconnection works

---

### PR #15: useSocket Hook

**Branch:** `feature/15-use-socket-hook`
**Size:** M (~150 lines)
**Dependencies:** PR #14

**Description:**
Create client-side WebSocket hook.

**Files to Create:**
- `src/hooks/useSocket.ts`

**Tasks:**
- [ ] Install socket.io-client
- [ ] Create useSocket hook
- [ ] Handle connection lifecycle
- [ ] Implement auto-reconnection
- [ ] Add connection status tracking
- [ ] Handle all server events

**Hook Interface:**
```typescript
function useSocket() {
  return {
    // State
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    error: string | null;

    // Actions
    connect: () => void;
    disconnect: () => void;
    emit: <T>(event: string, data: T) => void;

    // Event handlers (set by consumer)
    on: <T>(event: string, handler: (data: T) => void) => void;
    off: (event: string) => void;
  };
}
```

**Acceptance Criteria:**
- Hook manages WebSocket lifecycle
- Auto-reconnection works
- Type-safe event handling
- Clean disconnect on unmount

---

### PR #16: Room Store & useRoom Hook

**Branch:** `feature/16-room-management`
**Size:** M (~200 lines)
**Dependencies:** PR #15, PR #09

**Description:**
Create room state management.

**Files to Create:**
- `src/stores/room-store.ts`
- `src/hooks/useRoom.ts`

**Tasks:**
- [ ] Create room store
- [ ] Track room state
- [ ] Track players in room
- [ ] Handle room events
- [ ] Create useRoom hook
- [ ] Implement create/join/leave

**Hook Interface:**
```typescript
function useRoom() {
  return {
    // State
    roomState: RoomState | null;
    isHost: boolean;
    myPlayerId: PlayerId | null;
    players: PlayerConnection[];

    // Actions
    createRoom: (nickname: string) => Promise<string>;
    joinRoom: (roomId: string, nickname: string) => Promise<void>;
    leaveRoom: () => void;
    setReady: (ready: boolean) => void;
    startGame: () => void; // Host only
  };
}
```

**Acceptance Criteria:**
- Room creation returns room ID
- Players can join by ID
- Room state synced across clients
- Host controls work

---

### PR #17: useMultiplayer Hook

**Branch:** `feature/17-use-multiplayer`
**Size:** M (~150 lines)
**Dependencies:** PR #16, PR #10

**Description:**
Create unified multiplayer game hook.

**Files to Create:**
- `src/hooks/useMultiplayer.ts`

**Tasks:**
- [ ] Create useMultiplayer hook
- [ ] Combine room + game functionality
- [ ] Handle game state sync
- [ ] Implement optimistic updates
- [ ] Handle server reconciliation

**Hook Interface:**
```typescript
function useMultiplayer() {
  return {
    // From useRoom
    ...useRoom(),

    // From useGame (but networked)
    gameState: GameState | null;

    // Networked actions
    move: (to: Cell) => void;       // Sends to server
    placeWall: (row: number, col: number) => void;

    // State
    isMyTurn: boolean;
    canAct: boolean;
  };
}
```

**Acceptance Criteria:**
- Multiplayer actions work
- State syncs across clients
- Turn enforcement works
- Optimistic updates feel responsive

---

## 7. Phase 4: Multiplayer Features

> **Goal:** Complete multiplayer experience

### PR #18: Lobby UI - Create Room

**Branch:** `feature/18-lobby-create`
**Size:** M (~150 lines)
**Dependencies:** PR #16

**Description:**
Create room creation UI.

**Files to Create:**
- `src/components/lobby/CreateRoom.tsx`
- `src/app/page.tsx` (modify for lobby)

**Tasks:**
- [ ] Create CreateRoom component
- [ ] Add nickname input
- [ ] Add create button
- [ ] Show loading state
- [ ] Navigate to room on success
- [ ] Handle errors

**Acceptance Criteria:**
- Users can create rooms
- Room ID displayed/copyable
- Navigation works

---

### PR #19: Lobby UI - Join Room

**Branch:** `feature/19-lobby-join`
**Size:** M (~150 lines)
**Dependencies:** PR #18

**Description:**
Create room joining UI.

**Files to Create:**
- `src/components/lobby/JoinRoom.tsx`

**Tasks:**
- [ ] Create JoinRoom component
- [ ] Add room ID input
- [ ] Add nickname input
- [ ] Add join button
- [ ] Validate room ID format
- [ ] Handle room not found
- [ ] Handle room full

**Acceptance Criteria:**
- Users can join by room ID
- Error messages shown
- Navigation works

---

### PR #20: Room Lobby UI

**Branch:** `feature/20-room-lobby`
**Size:** M (~200 lines)
**Dependencies:** PR #19

**Description:**
Create pre-game room lobby.

**Files to Create:**
- `src/components/lobby/RoomLobby.tsx`
- `src/app/game/[roomId]/page.tsx`

**Tasks:**
- [ ] Create RoomLobby component
- [ ] Show room ID (copyable)
- [ ] Show connected players
- [ ] Show ready status
- [ ] Add ready button
- [ ] Add start button (host only)
- [ ] Add leave button
- [ ] Handle player join/leave events

**Acceptance Criteria:**
- All players see same state
- Ready status syncs
- Host can start when all ready
- Leave works correctly

---

### PR #21: Game Room Integration

**Branch:** `feature/21-game-room`
**Size:** M (~200 lines)
**Dependencies:** PR #20, PR #17

**Description:**
Integrate game board with multiplayer.

**Files to Modify:**
- `src/app/game/[roomId]/page.tsx`

**Tasks:**
- [ ] Add game board to room page
- [ ] Connect to useMultiplayer hook
- [ ] Show current turn indicator
- [ ] Disable actions when not your turn
- [ ] Handle game end
- [ ] Show winner announcement
- [ ] Add rematch option

**Acceptance Criteria:**
- Game plays correctly online
- Turn enforcement works
- Winner shown to all
- Rematch works

---

### PR #22: Player Nicknames & Avatars

**Branch:** `feature/22-player-identity`
**Size:** S (~100 lines)
**Dependencies:** PR #21

**Description:**
Add player identity features.

**Files to Modify:**
- `src/components/panels/PlayerPanel.tsx`
- `src/types/room.ts`

**Tasks:**
- [ ] Store player nicknames
- [ ] Display nicknames in player panel
- [ ] Show connection status indicators
- [ ] Add simple avatar/color selection
- [ ] Persist nickname in localStorage

**Acceptance Criteria:**
- Nicknames shown correctly
- Connection status visible
- Nicknames persist

---

### PR #23: Reconnection Handling

**Branch:** `feature/23-reconnection`
**Size:** M (~150 lines)
**Dependencies:** PR #21

**Description:**
Handle player disconnection and reconnection.

**Files to Modify:**
- `src/hooks/useMultiplayer.ts`
- `src/server/room-manager.ts`
- `src/components/lobby/RoomLobby.tsx`

**Tasks:**
- [ ] Detect disconnection
- [ ] Show disconnection UI
- [ ] Implement reconnection flow
- [ ] Restore game state on reconnect
- [ ] Handle timeout (player left)
- [ ] Pause game during disconnect

**Acceptance Criteria:**
- Reconnection works seamlessly
- Game state preserved
- Other players notified
- Timeout handled gracefully

---

## 8. Phase 5: Polish & Production

> **Goal:** Production-ready application

### PR #24: Error Boundaries & Handling

**Branch:** `feature/24-error-handling`
**Size:** M (~150 lines)
**Dependencies:** PR #21

**Description:**
Add comprehensive error handling.

**Files to Create:**
- `src/components/ErrorBoundary.tsx`
- `src/components/ui/Toast.tsx`

**Tasks:**
- [ ] Create ErrorBoundary component
- [ ] Replace alert() with toast notifications
- [ ] Add error logging
- [ ] Handle network errors gracefully
- [ ] Add retry mechanisms

**Acceptance Criteria:**
- No unhandled errors crash app
- User-friendly error messages
- Errors logged for debugging

---

### PR #25: Loading States & Feedback

**Branch:** `feature/25-loading-states`
**Size:** S (~100 lines)
**Dependencies:** PR #24

**Description:**
Add loading indicators and user feedback.

**Files to Create:**
- `src/components/ui/Spinner.tsx`
- `src/components/ui/Skeleton.tsx`

**Tasks:**
- [ ] Add loading spinners
- [ ] Add skeleton loading states
- [ ] Add action feedback (move confirmed)
- [ ] Add connection status indicator
- [ ] Improve perceived performance

**Acceptance Criteria:**
- Users never see blank states
- Actions feel responsive
- Connection issues visible

---

### PR #26: Accessibility Improvements

**Branch:** `feature/26-accessibility`
**Size:** M (~150 lines)
**Dependencies:** PR #06

**Description:**
Improve accessibility compliance.

**Files to Modify:**
- All components

**Tasks:**
- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation for board
- [ ] Add focus indicators
- [ ] Test with screen reader
- [ ] Add high contrast mode
- [ ] Add colorblind-friendly patterns

**Acceptance Criteria:**
- WCAG 2.1 AA compliance
- Keyboard fully functional
- Screen reader compatible

---

### PR #27: Performance Optimization

**Branch:** `feature/27-performance`
**Size:** M (~150 lines)
**Dependencies:** PR #21

**Description:**
Optimize rendering and bundle size.

**Tasks:**
- [ ] Add React.memo to expensive components
- [ ] Implement useMemo for calculations
- [ ] Add code splitting
- [ ] Optimize bundle size
- [ ] Add performance monitoring

**Metrics Targets:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 200KB gzipped

**Acceptance Criteria:**
- Lighthouse score > 90
- No unnecessary re-renders
- Smooth 60fps gameplay

---

### PR #28: CI/CD & Deployment

**Branch:** `chore/28-deployment`
**Size:** M (~100 lines)
**Dependencies:** All previous PRs

**Description:**
Setup CI/CD pipeline and deployment.

**Files to Create:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `Dockerfile` (if needed)
- `.env.example`

**Tasks:**
- [ ] Setup GitHub Actions for CI
- [ ] Add lint check
- [ ] Add type check
- [ ] Add test runner
- [ ] Add build check
- [ ] Setup deployment pipeline
- [ ] Configure environment variables
- [ ] Add deployment documentation

**Acceptance Criteria:**
- CI runs on all PRs
- Deployment automated
- Environment documented

---

## 9. Dependency Graph

```
PR #01 (Types)
    │
    ├──► PR #02 (Constants)
    │        │
    │        └──► PR #03 (Game Logic) ◄────────┐
    │                 │                         │
    │                 ├──► PR #04 (Tests) ──────┤
    │                 │         │               │
    │                 │         └──► PR #05 (Diagonal Jump)
    │                 │
    │                 ├──► PR #06 (Components)
    │                 │         │
    │                 │         └──► PR #07 (Styles)
    │                 │
    │                 └──► PR #08 (Reducer)
    │                           │
    │                           └──► PR #09 (Zustand)
    │                                     │
    │                                     └──► PR #10 (useGame)
    │                                               │
    │                                               ├──► PR #11 (Refactor Page)
    │                                               │
    │                                               └──► PR #12 (useLocalGame)
    │
    └──► PR #13 (Socket Types)
              │
              └──► PR #14 (Socket Server)
                        │
                        └──► PR #15 (useSocket)
                                  │
                                  └──► PR #16 (Room Management)
                                            │
                                            ├──► PR #17 (useMultiplayer)
                                            │         │
                                            │         └──► PR #21 (Game Room)
                                            │                   │
                                            │                   ├──► PR #22 (Nicknames)
                                            │                   │
                                            │                   ├──► PR #23 (Reconnection)
                                            │                   │
                                            │                   └──► PR #24-28 (Polish)
                                            │
                                            └──► PR #18 (Create Room)
                                                      │
                                                      └──► PR #19 (Join Room)
                                                                │
                                                                └──► PR #20 (Room Lobby)
```

---

## 10. Milestone Definitions

### Milestone 1: Foundation Complete

**PRs:** #01-#08
**Criteria:**
- [x] Types extracted and documented
- [x] Constants centralized
- [x] Game logic pure and tested
- [x] Components modularized
- [x] Styles migrated to Tailwind
- [x] Reducer pattern implemented
- [x] Diagonal jump working
- [x] >80% test coverage on game logic

**Deliverable:** Clean, modular codebase ready for state management

---

### Milestone 2: State Management Complete

**PRs:** #09-#12
**Criteria:**
- [x] Zustand store working
- [x] useGame hook complete
- [x] Page refactored to use store
- [x] Local game hook available
- [x] All existing functionality preserved

**Deliverable:** Centralized state management with clean hooks API

---

### Milestone 3: Infrastructure Complete

**PRs:** #13-#17
**Criteria:**
- [x] WebSocket types defined
- [x] Server running and stable
- [x] Client can connect/disconnect
- [x] Room management working
- [x] Game state syncs correctly

**Deliverable:** Working real-time infrastructure

---

### Milestone 4: Multiplayer MVP

**PRs:** #18-#23
**Criteria:**
- [x] Can create/join rooms
- [x] Pre-game lobby working
- [x] Full game playable online
- [x] Nicknames displayed
- [x] Reconnection handled

**Deliverable:** Playable multiplayer game

---

### Milestone 5: Production Ready

**PRs:** #24-#28
**Criteria:**
- [x] Error handling complete
- [x] Loading states polished
- [x] Accessibility compliant
- [x] Performance optimized
- [x] CI/CD deployed

**Deliverable:** Production-deployed multiplayer game

---

## Appendix: Quick Reference

### PR Checklist Template

```markdown
## Pre-PR
- [ ] Branch named correctly
- [ ] Based on correct parent branch
- [ ] All dependencies merged

## Code Quality
- [ ] TypeScript strict compliance
- [ ] No console.logs
- [ ] No commented code
- [ ] Functions documented
- [ ] Tests written

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] No regressions

## PR Submission
- [ ] PR template filled
- [ ] Screenshots added (if UI)
- [ ] Reviewers assigned
- [ ] Labels added
```

### Commands Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm lint             # Run linter
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage

# Git
git checkout -b refactor/01-extract-types
git push -u origin refactor/01-extract-types

# PR Creation
gh pr create --base feature/multiplayer-foundation
```

---

*Document maintained as part of Bloqueio Online development.*
