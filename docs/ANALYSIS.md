# Bloqueio Online - Comprehensive Analysis Report

**Date:** December 13, 2025
**Branch:** `feature/multiplayer-foundation`
**Purpose:** Complete analysis of current application state to plan professional multiplayer implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack Analysis](#2-technology-stack-analysis)
3. [Current Architecture](#3-current-architecture)
4. [Game Rules & Mechanics](#4-game-rules--mechanics)
5. [Type System Analysis](#5-type-system-analysis)
6. [Game Logic Functions](#6-game-logic-functions)
7. [UI/UX Implementation](#7-uiux-implementation)
8. [Code Quality Assessment](#8-code-quality-assessment)
9. [Multiplayer Requirements](#9-multiplayer-requirements)
10. [Recommended Architecture](#10-recommended-architecture)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Risk Assessment](#12-risk-assessment)

---

## 1. Executive Summary

### Current State

**Bloqueio Online** is a functional local 4-player board game similar to Quoridor, implemented as a single-page React application. The entire game logic and UI (~1,110 lines) resides in `src/app/page.tsx`.

### Key Findings

| Aspect             | Status                | Notes                                     |
| ------------------ | --------------------- | ----------------------------------------- |
| Game Logic         | **Complete**          | All rules implemented correctly           |
| Local Multiplayer  | **Working**           | 4 players on same device                  |
| Online Multiplayer | **Not Started**       | No networking code exists                 |
| Code Organization  | **Needs Refactoring** | Monolithic single file                    |
| Testing            | **None**              | No test files exist                       |
| Type Safety        | **Good**              | TypeScript strict mode enabled            |
| Styling            | **Inline**            | No Tailwind usage despite being installed |

### Immediate Priorities

1. Extract game logic into pure functions (testable, server-shareable)
2. Create proper type definitions module
3. Set up state management (Zustand/useReducer)
4. Implement WebSocket infrastructure
5. Add comprehensive testing

---

## 2. Technology Stack Analysis

### Current Dependencies

```json
{
  "dependencies": {
    "next": "16.0.10", // Latest Next.js with App Router
    "react": "19.2.0", // React 19 with new features
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.3",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Stack Assessment

| Technology   | Version | Status      | Notes                            |
| ------------ | ------- | ----------- | -------------------------------- |
| Next.js      | 16.0.10 | **Current** | Latest stable                    |
| React        | 19.2.0  | **Current** | Latest with new hooks            |
| TypeScript   | ^5      | **Current** | Strict mode enabled              |
| Tailwind CSS | ^4      | **Unused**  | Installed but inline styles used |
| ESLint       | ^9      | **Current** | With Next.js config              |

### Missing Dependencies (Required for Multiplayer)

```json
{
  "dependencies": {
    "socket.io-client": "^4.x", // WebSocket client
    "zustand": "^5.x", // State management
    "nanoid": "^5.x" // Room ID generation
  },
  "devDependencies": {
    "socket.io": "^4.x", // WebSocket server
    "vitest": "^2.x", // Testing framework
    "@testing-library/react": "^16.x",
    "msw": "^2.x" // API mocking
  }
}
```

### Configuration Files Status

| File                 | Status      | Issues                        |
| -------------------- | ----------- | ----------------------------- |
| `tsconfig.json`      | **Good**    | Strict mode, paths configured |
| `eslint.config.mjs`  | **Good**    | Next.js + TypeScript rules    |
| `next.config.ts`     | **Empty**   | No custom configuration       |
| `postcss.config.mjs` | **Good**    | Tailwind configured           |
| `globals.css`        | **Minimal** | Basic theme variables only    |

---

## 3. Current Architecture

### File Structure

```
bloqueio_online/
├── .claude/                    # Claude Code configuration
├── .git/
├── .next/                      # Build output
├── node_modules/
├── public/
│   ├── file.svg               # Default Next.js assets
│   ├── globe.svg              # (unused)
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   └── app/
│       ├── globals.css        # Basic CSS variables
│       ├── layout.tsx         # Root layout with fonts
│       └── page.tsx           # ENTIRE GAME (~1,110 lines)
├── .env                       # Environment variables (empty)
├── .gitignore
├── CLAUDE.md                  # AI assistant guidelines
├── README.md                  # Default Next.js README
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
└── tsconfig.json
```

### Current Component Hierarchy

```
RootLayout (layout.tsx)
└── BloqueioPage (page.tsx)
    ├── Header Section
    │   ├── Title
    │   ├── Rules Description
    │   └── Status Display
    ├── Game Board Section
    │   ├── Grid Cells (11x11 buttons)
    │   ├── Barrier Overlays (SVG-like divs)
    │   ├── Ghost Barrier (hover preview)
    │   └── Coordinate Labels (A-I, 1-9)
    └── Side Panel
        ├── Actions Panel
        │   ├── Move Mode Button
        │   ├── Wall Mode Button
        │   ├── Undo Button
        │   ├── Restart Button
        │   └── Orientation Buttons (H/V)
        └── Players Panel
            └── Player List (4 items)
```

### Problems with Current Architecture

1. **Monolithic File**: All logic in one 1,110-line file
2. **No Separation of Concerns**: Game logic mixed with React state and rendering
3. **Untestable**: Pure functions not extracted
4. **Not Server-Ready**: Logic cannot be shared with backend
5. **No State Management**: Multiple `useState` calls, hard to sync
6. **Inline Styles**: 500+ lines of inline style objects

---

## 4. Game Rules & Mechanics

### Board Configuration

```typescript
const INNER_SIZE = 9; // Playable grid
const SIZE = INNER_SIZE + 2; // 11x11 total (with borders)
```

**Board Layout:**

- 11x11 grid including colored border cells
- Inner 9x9 is the playable area
- Row 0 = Red's goal zone (Player 0)
- Row 10 = Green's goal zone (Player 2)
- Col 0 = Yellow's goal zone (Player 3)
- Col 10 = Blue's goal zone (Player 1)

### Player Configuration

| Player    | ID  | Start Position | Goal Side | Color          |
| --------- | --- | -------------- | --------- | -------------- |
| Jogador 1 | 0   | Row 1, Col 5   | BOTTOM    | Red #ef4444    |
| Jogador 2 | 1   | Row 5, Col 9   | LEFT      | Blue #3b82f6   |
| Jogador 3 | 2   | Row 9, Col 5   | TOP       | Green #22c55e  |
| Jogador 4 | 3   | Row 5, Col 1   | RIGHT     | Yellow #f59e0b |

### Movement Rules

1. **Normal Move**: 1 cell orthogonally (up/down/left/right)
2. **Jump Move**: 2 cells straight over an adjacent pawn, if straight is not possible, the user may jump one straight, one to one of the sides.
3. **Restrictions**:
   - Cannot enter border cells (except own goal)
   - Cannot occupy another player's cell
   - Cannot move through barriers

### Barrier (Wall) Rules

1. **Size**: Each barrier spans 2 cells (blocks edge between 2 pairs of cells)
2. **Orientations**: Horizontal (H) or Vertical (V)
3. **Quantity**: Each player has 6 barriers
4. **Placement Restrictions**:
   - Cannot overlap existing barriers
   - Cannot cross another barrier in X pattern
   - Cannot completely block any player's path to their goal
   - Cannot be set on the border cells

### Win Condition

A player wins when their pawn reaches any cell in their goal zone (opposite border row/column).

---

## 5. Type System Analysis

### Current Type Definitions

```typescript
// Player identification
type PlayerId = 0 | 1 | 2 | 3;

// Goal directions
type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

// Action modes
type Mode = "move" | "wall";

// Board position
type Cell = { row: number; col: number };

// Barrier orientation
type BarrierOrientation = "H" | "V";

// Player state
type Player = {
  id: PlayerId;
  row: number;
  col: number;
  goalSide: GoalSide;
  wallsLeft: number;
  color: string;
  label: string;
  name: string;
};

// Barrier state
type Barrier = {
  row: number; // baseRow (top-left of 2x2 block)
  col: number; // baseCol (top-left of 2x2 block)
  orientation: BarrierOrientation;
  id: string; // Unique identifier
};

// Game snapshot for undo functionality
type GameSnapshot = {
  players: Player[];
  blockedEdges: string[];
  barriers: Barrier[];
  currentPlayerId: PlayerId;
  winner: PlayerId | null;
};
```

### Type Improvements Needed

```typescript
// === Recommended Enhanced Types ===

// Game actions for state machine
type GameAction =
  | { type: "MOVE"; playerId: PlayerId; to: Cell }
  | { type: "PLACE_WALL"; playerId: PlayerId; barrier: Barrier }
  | { type: "UNDO" }
  | { type: "RESTART" }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "SET_ORIENTATION"; orientation: BarrierOrientation };

// Complete game state
type GameState = {
  players: Player[];
  barriers: Barrier[];
  blockedEdges: Set<string>;
  currentPlayerId: PlayerId;
  mode: Mode;
  wallOrientation: BarrierOrientation;
  winner: PlayerId | null;
  history: GameSnapshot[];
  hoveredCell: Cell | null;
};

// Multiplayer extensions
type RoomState = {
  roomId: string;
  hostId: string;
  players: PlayerConnection[];
  gameState: GameState | null;
  status: "waiting" | "starting" | "playing" | "finished";
  spectators: string[];
};

type PlayerConnection = {
  odId: string; // Socket/connection ID
  odUserId: string; // Persistent user ID
  odNickname: string;
  odPlayerId: PlayerId | null; // Assigned game slot
  odReady: boolean;
  odConnected: boolean;
};

// WebSocket message types
type WSMessage =
  | { type: "JOIN_ROOM"; roomId: string; nickname: string }
  | { type: "CREATE_ROOM"; nickname: string }
  | { type: "GAME_ACTION"; action: GameAction }
  | { type: "CHAT"; message: string }
  | { type: "READY" }
  | { type: "START_GAME" };

type WSResponse =
  | { type: "ROOM_STATE"; state: RoomState }
  | { type: "GAME_STATE"; state: GameState }
  | { type: "ERROR"; message: string }
  | { type: "PLAYER_JOINED"; player: PlayerConnection }
  | { type: "PLAYER_LEFT"; odUserId: string };
```

---

## 6. Game Logic Functions

### Core Functions Analysis

#### 1. `edgeKey(r1, c1, r2, c2)` - Edge Identification

```typescript
function edgeKey(r1: number, c1: number, r2: number, c2: number): string;
```

**Purpose**: Creates a canonical string key for the edge between two adjacent cells.

**Algorithm**:

- Normalizes order so (r1,c1) is always "less than" (r2,c2)
- Returns format: `"r1,c1-r2,c2"`

**Usage**: Used to track which cell-to-cell movements are blocked by barriers.

**Status**: ✅ Pure function, well-implemented

---

#### 2. `isInside(row, col)` - Bounds Check

```typescript
function isInside(row: number, col: number): boolean;
```

**Purpose**: Checks if a position is within the 11x11 grid.

**Status**: ✅ Pure function, simple

---

#### 3. `isGoal(row, col, goalSide)` - Win Check

```typescript
function isGoal(row: number, col: number, goalSide: GoalSide): boolean;
```

**Purpose**: Determines if a cell is in a player's goal zone.

**Logic**:

- TOP: row === 0
- BOTTOM: row === SIZE - 1
- LEFT: col === 0
- RIGHT: col === SIZE - 1

**Status**: ✅ Pure function, correct

---

#### 4. `createInitialPlayers()` - Game Setup

```typescript
function createInitialPlayers(): Player[];
```

**Purpose**: Creates the initial 4-player configuration.

**Status**: ✅ Pure function, no dependencies

---

#### 5. `hasPathToGoal(player, blockedEdges)` - Pathfinding

```typescript
function hasPathToGoal(player: Player, blockedEdges: Set<string>): boolean;
```

**Purpose**: BFS to verify a player can still reach their goal.

**Algorithm**:

1. Initialize visited grid (SIZE x SIZE)
2. BFS from player's current position
3. For each cell, try all 4 directions
4. Skip if blocked by barrier
5. Return true if any goal cell reached

**Complexity**: O(SIZE²) worst case

**Status**: ✅ Pure function, well-implemented

---

#### 6. `canPawnMoveTo(player, destRow, destCol, blockedEdges, players)` - Move Validation

```typescript
function canPawnMoveTo(
  player: Player,
  destRow: number,
  destCol: number,
  blockedEdges: Set<string>,
  players: Player[]
): boolean;
```

**Purpose**: Validates if a pawn can move to a destination.

**Logic Flow**:

1. Check destination is inside grid
2. Check destination is not current position
3. Check border restrictions (only own goal allowed)
4. Check destination not occupied
5. Check if normal move (manhattan = 1):
   - Verify no barrier blocks path
6. Check if jump move (straight 2 cells):
   - Verify pawn in middle cell
   - Verify no barriers block path

**Missing**: Diagonal jumps when straight jump blocked by wall

**Status**: ⚠️ Pure function, but missing diagonal jump rule

---

#### 7. `checkWallPlacement(clickRow, clickCol, opts)` - Barrier Validation

```typescript
type WallCheckResult = {
  ok: boolean;
  baseRow: number;
  baseCol: number;
  orientation: BarrierOrientation;
  edgesToAdd: string[];
};

function checkWallPlacement(
  clickRow: number,
  clickCol: number,
  opts?: { silent?: boolean }
): WallCheckResult;
```

**Purpose**: Validates barrier placement and returns edges to block.

**Algorithm**:

1. Check game not over
2. Check player has walls remaining
3. Calculate base position (top-left of 2x2)
4. Calculate edges based on orientation:
   - H: blocks edges between row n and n+1
   - V: blocks edges between col n and n+1
5. Check no existing barriers in same edges
6. Check no crossing barrier (same 2x2, different orientation)
7. BFS verify all players still have paths

**Status**: ⚠️ Not pure (uses component state), needs extraction

---

### Functions to Extract

| Function               | Current Location | Target Location   | Changes Needed    |
| ---------------------- | ---------------- | ----------------- | ----------------- |
| `edgeKey`              | page.tsx:55      | lib/game-logic.ts | None              |
| `isInside`             | page.tsx:63      | lib/game-logic.ts | None              |
| `isGoal`               | page.tsx:68      | lib/game-logic.ts | None              |
| `createInitialPlayers` | page.tsx:81      | lib/game-logic.ts | None              |
| `hasPathToGoal`        | page.tsx:128     | lib/game-logic.ts | None              |
| `canPawnMoveTo`        | page.tsx:164     | lib/game-logic.ts | Add diagonal jump |
| `checkWallPlacement`   | page.tsx:302     | lib/game-logic.ts | Remove state deps |
| `nextPlayerId`         | page.tsx:249     | lib/game-logic.ts | None              |

---

## 7. UI/UX Implementation

### Current Styling Approach

**Method**: Inline styles using JavaScript objects

**Example**:

```typescript
<button
  style={{
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    background,
    border: `1px solid ${borderColor}`,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // ... 10+ more properties
  }}
>
```

### Style Statistics

| Category        | Line Count | Percentage |
| --------------- | ---------- | ---------- |
| Inline styles   | ~500 lines | ~45%       |
| JSX structure   | ~300 lines | ~27%       |
| Logic/functions | ~310 lines | ~28%       |

### Color Palette

```css
/* Background */
--bg-primary: #020617; /* slate-950 */
--bg-secondary: #0f172a; /* slate-900 */

/* Borders */
--border: #1f2937; /* gray-800 */

/* Text */
--text-primary: #e5e7eb; /* gray-200 */
--text-secondary: #9ca3af; /* gray-400 */

/* Player Colors */
--player-red: #ef4444;
--player-blue: #3b82f6;
--player-green: #22c55e;
--player-yellow: #f59e0b;

/* Barriers */
--barrier: #facc15; /* yellow-400 */
```

### UI Components to Extract

1. **Board.tsx**

   - Grid rendering
   - Cell buttons
   - Coordinate labels
   - Barrier overlays

2. **PlayerPanel.tsx**

   - Player list
   - Walls remaining indicator
   - Current turn highlight

3. **GameControls.tsx**

   - Mode buttons (move/wall)
   - Orientation buttons
   - Undo/Restart buttons

4. **StatusBar.tsx**

   - Turn indicator
   - Winner announcement

5. **Pawn.tsx**

   - Pawn rendering
   - Animation states

6. **Barrier.tsx**
   - Barrier rendering
   - Ghost preview

### Accessibility Issues

1. **No ARIA labels** on buttons
2. **No keyboard navigation** for board cells
3. **Color-only differentiation** (problematic for colorblind users)
4. **No screen reader support**
5. **Focus indicators** rely on browser defaults

### Responsive Design

- **Current**: Basic flex layout with max-width
- **Board**: Uses `aspectRatio: '1 / 1'` for square
- **Side panel**: `flex: '1 1 200px'` wraps on mobile
- **Missing**: Touch-friendly controls for mobile

---

## 8. Code Quality Assessment

### Strengths

1. **TypeScript Strict Mode**: All types properly defined
2. **Functional Components**: Modern React patterns
3. **Game Logic Correctness**: Rules implemented accurately
4. **State Management**: Proper immutable updates
5. **Undo System**: Complete history tracking

### Weaknesses

1. **No Tests**: Zero test coverage
2. **No Error Boundaries**: Crashes could break entire app
3. **No Loading States**: No feedback during operations
4. **Magic Numbers**: Many hardcoded values
5. **Alert Dialogs**: Using `alert()` for messages
6. **Console Warnings**: JSX key warnings possible

### Code Metrics

| Metric                | Value | Target         |
| --------------------- | ----- | -------------- |
| Total Lines           | 1,110 | < 300 per file |
| Functions per File    | 15+   | < 10           |
| Cyclomatic Complexity | High  | Medium         |
| Test Coverage         | 0%    | > 80%          |
| TypeScript Strict     | Yes   | Yes            |

### ESLint Status

```bash
pnpm lint
# Currently passes (default rules only)
```

### Recommended ESLint Rules to Add

```javascript
{
  rules: {
    'react/no-inline-styles': 'warn',
    'no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
    'max-lines-per-function': ['warn', 50],
    'max-depth': ['warn', 3],
    'complexity': ['warn', 10]
  }
}
```

---

## 9. Multiplayer Requirements

### Functional Requirements

#### P0 - Must Have

| Feature         | Description                                |
| --------------- | ------------------------------------------ |
| Room Creation   | Generate unique room codes                 |
| Room Joining    | Join via room code                         |
| Real-time Sync  | All players see same state                 |
| Turn Validation | Server validates all moves                 |
| Reconnection    | Resume after disconnect                    |
| Game State Sync | New/reconnecting players get current state |

#### P1 - Should Have

| Feature          | Description                      |
| ---------------- | -------------------------------- |
| Player Nicknames | Custom display names             |
| Ready System     | All players confirm before start |
| Turn Timer       | Optional time limit per turn     |
| Chat             | In-game text communication       |
| Spectator Mode   | Watch without playing            |

#### P2 - Nice to Have

| Feature       | Description                    |
| ------------- | ------------------------------ |
| Matchmaking   | Auto-match with random players |
| Rankings      | ELO-based rating system        |
| Game History  | Review past games              |
| Replay System | Watch recorded games           |
| Sound Effects | Audio feedback                 |
| Animations    | Smooth transitions             |

### Technical Requirements

#### WebSocket Events

**Client → Server:**

```typescript
"create_room"; // { nickname: string }
"join_room"; // { roomId: string, nickname: string }
"leave_room"; // {}
"player_ready"; // {}
"game_action"; // { action: GameAction }
"chat_message"; // { message: string }
```

**Server → Client:**

```typescript
"room_created"; // { roomId: string, state: RoomState }
"room_joined"; // { state: RoomState }
"room_updated"; // { state: RoomState }
"game_started"; // { state: GameState }
"game_updated"; // { state: GameState }
"game_ended"; // { winner: PlayerId }
"player_joined"; // { player: PlayerConnection }
"player_left"; // { odUserId: string }
"error"; // { message: string }
```

#### State Synchronization Strategy

1. **Server Authoritative**: Server is source of truth
2. **Optimistic Updates**: Client shows action immediately
3. **Reconciliation**: Server confirms or rejects
4. **Conflict Resolution**: Server state always wins

#### Security Considerations

1. **Move Validation**: All moves validated server-side
2. **Rate Limiting**: Prevent spam/DoS
3. **Input Sanitization**: Prevent XSS in chat
4. **Room Capacity**: Limit players per room
5. **Session Management**: Secure token-based auth

---

## 10. Recommended Architecture

### Target File Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing/home page
│   ├── game/
│   │   └── [roomId]/
│   │       └── page.tsx           # Game room page
│   └── api/
│       └── socket/
│           └── route.ts           # WebSocket endpoint (if using Next.js API)
│
├── components/
│   ├── game/
│   │   ├── Board.tsx              # Game board grid
│   │   ├── Cell.tsx               # Individual cell
│   │   ├── Pawn.tsx               # Player pawn
│   │   ├── Barrier.tsx            # Wall/barrier
│   │   ├── GhostBarrier.tsx       # Hover preview
│   │   └── CoordinateLabels.tsx   # A-I, 1-9 labels
│   ├── ui/
│   │   ├── Button.tsx             # Reusable button
│   │   ├── Card.tsx               # Panel container
│   │   └── Badge.tsx              # Status badges
│   ├── panels/
│   │   ├── PlayerPanel.tsx        # Player list
│   │   ├── GameControls.tsx       # Action buttons
│   │   └── StatusBar.tsx          # Game status
│   └── lobby/
│       ├── CreateRoom.tsx         # Room creation form
│       ├── JoinRoom.tsx           # Room join form
│       └── RoomLobby.tsx          # Pre-game lobby
│
├── lib/
│   ├── game-logic.ts              # Pure game rules
│   ├── game-actions.ts            # Action creators
│   ├── game-reducer.ts            # State reducer
│   ├── constants.ts               # Game constants
│   └── utils.ts                   # Helper functions
│
├── hooks/
│   ├── useGame.ts                 # Local game state
│   ├── useSocket.ts               # WebSocket connection
│   ├── useRoom.ts                 # Room management
│   └── useMultiplayer.ts          # Multiplayer sync
│
├── stores/
│   └── game-store.ts              # Zustand store
│
├── types/
│   ├── game.ts                    # Game types
│   ├── room.ts                    # Room/lobby types
│   └── socket.ts                  # WebSocket types
│
├── server/                        # Backend (separate or same repo)
│   ├── index.ts                   # Server entry
│   ├── socket-handlers.ts         # WebSocket handlers
│   ├── room-manager.ts            # Room state management
│   └── game-validator.ts          # Server-side validation
│
└── __tests__/
    ├── game-logic.test.ts         # Unit tests
    ├── game-reducer.test.ts       # Reducer tests
    └── components/                # Component tests
```

### State Management with Zustand

```typescript
// stores/game-store.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface GameStore {
  // State
  gameState: GameState | null;
  roomState: RoomState | null;
  connectionStatus: "disconnected" | "connecting" | "connected";

  // Actions
  setGameState: (state: GameState) => void;
  setRoomState: (state: RoomState) => void;
  executeAction: (action: GameAction) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    gameState: null,
    roomState: null,
    connectionStatus: "disconnected",

    setGameState: (state) => set({ gameState: state }),
    setRoomState: (state) => set({ roomState: state }),

    executeAction: (action) => {
      const { gameState } = get();
      if (!gameState) return;

      const newState = gameReducer(gameState, action);
      set({ gameState: newState });
    },

    reset: () => set({ gameState: null, roomState: null }),
  }))
);
```

### WebSocket Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│     Client      │◄──────────────────►│     Server      │
│                 │                     │                 │
│  ┌───────────┐  │    join_room        │  ┌───────────┐  │
│  │ useSocket │──┼────────────────────►│──│   Room    │  │
│  │   Hook    │  │                     │  │  Manager  │  │
│  └───────────┘  │    room_updated     │  └───────────┘  │
│       │         │◄────────────────────┼──      │        │
│       ▼         │                     │        ▼        │
│  ┌───────────┐  │    game_action      │  ┌───────────┐  │
│  │  Zustand  │──┼────────────────────►│──│   Game    │  │
│  │   Store   │  │                     │  │ Validator │  │
│  └───────────┘  │    game_updated     │  └───────────┘  │
│       │         │◄────────────────────┼──      │        │
│       ▼         │                     │        ▼        │
│  ┌───────────┐  │                     │  ┌───────────┐  │
│  │    UI     │  │                     │  │   Game    │  │
│  │Components │  │                     │  │   State   │  │
│  └───────────┘  │                     │  └───────────┘  │
└─────────────────┘                     └─────────────────┘
```

---

## 11. Implementation Roadmap

### Phase 1: Code Refactoring (Foundation)

**Goal**: Prepare codebase for multiplayer without breaking existing functionality

#### Tasks:

1. **Extract Types** (`types/game.ts`)

   - Move all type definitions
   - Add multiplayer types
   - Export everything

2. **Extract Constants** (`lib/constants.ts`)

   - Board sizes
   - Player colors
   - Initial positions

3. **Extract Game Logic** (`lib/game-logic.ts`)

   - All pure functions
   - No React dependencies
   - Full test coverage

4. **Create Game Reducer** (`lib/game-reducer.ts`)

   - Action types
   - State transitions
   - Immutable updates

5. **Extract Components**

   - Board.tsx
   - PlayerPanel.tsx
   - GameControls.tsx
   - StatusBar.tsx

6. **Migrate Styles**

   - Convert inline to Tailwind
   - Create design tokens
   - Ensure consistency

7. **Add Testing**
   - Game logic unit tests
   - Reducer tests
   - Component tests

### Phase 2: State Management

**Goal**: Implement proper state management for multiplayer readiness

#### Tasks:

1. **Setup Zustand Store**

   - Game state
   - Room state
   - Connection state

2. **Create Custom Hooks**

   - useGame
   - useLocalGame
   - useGameActions

3. **Refactor Page Component**
   - Use store instead of useState
   - Separate concerns

### Phase 3: WebSocket Infrastructure

**Goal**: Establish real-time communication

#### Tasks:

1. **Server Setup**

   - Socket.io server
   - Room management
   - Connection handling

2. **Client Integration**

   - useSocket hook
   - Event handlers
   - Reconnection logic

3. **State Synchronization**
   - Optimistic updates
   - Server reconciliation
   - Conflict resolution

### Phase 4: Multiplayer Features

**Goal**: Complete multiplayer experience

#### Tasks:

1. **Room System**

   - Create room
   - Join room
   - Leave room
   - Room lobby UI

2. **Game Flow**

   - Ready system
   - Game start
   - Turn enforcement
   - Game end

3. **Player Management**
   - Nicknames
   - Reconnection
   - Spectators

### Phase 5: Polish & Production

**Goal**: Production-ready application

#### Tasks:

1. **Error Handling**

   - Error boundaries
   - User-friendly messages
   - Logging

2. **Performance**

   - Code splitting
   - Bundle optimization
   - Caching

3. **Deployment**
   - Environment setup
   - CI/CD pipeline
   - Monitoring

---

## 12. Risk Assessment

### Technical Risks

| Risk                  | Impact | Probability | Mitigation                            |
| --------------------- | ------ | ----------- | ------------------------------------- |
| WebSocket scaling     | High   | Medium      | Use Redis adapter for Socket.io       |
| State desync          | High   | Medium      | Server authoritative + reconciliation |
| Browser compatibility | Medium | Low         | Test across browsers, polyfills       |
| Mobile performance    | Medium | Medium      | Optimize renders, test on devices     |

### Project Risks

| Risk                    | Impact | Probability | Mitigation                 |
| ----------------------- | ------ | ----------- | -------------------------- |
| Scope creep             | High   | High        | Strict MVP definition      |
| Refactoring breaks game | High   | Medium      | Comprehensive tests first  |
| Multiplayer complexity  | High   | Medium      | Incremental implementation |

### Security Risks

| Risk           | Impact | Probability | Mitigation             |
| -------------- | ------ | ----------- | ---------------------- |
| Cheating       | Medium | High        | Server-side validation |
| XSS in chat    | High   | Low         | Input sanitization     |
| DoS attacks    | High   | Low         | Rate limiting          |
| Room hijacking | High   | Low         | Secure room codes      |

---

## Appendix A: Constants Reference

```typescript
// lib/constants.ts

export const BOARD = {
  INNER_SIZE: 9,
  SIZE: 11, // INNER_SIZE + 2
  MID: 5, // Math.floor(SIZE / 2)
} as const;

export const PLAYERS = {
  COUNT: 4,
  WALLS_PER_PLAYER: 6,
  INITIAL_POSITIONS: [
    { row: 1, col: 5, goalSide: "BOTTOM" },
    { row: 5, col: 9, goalSide: "LEFT" },
    { row: 9, col: 5, goalSide: "TOP" },
    { row: 5, col: 1, goalSide: "RIGHT" },
  ],
} as const;

export const COLORS = {
  PLAYERS: {
    0: { main: "#ef4444", bg: "rgba(239,68,68,0.24)" },
    1: { main: "#3b82f6", bg: "rgba(59,130,246,0.24)" },
    2: { main: "#22c55e", bg: "rgba(34,197,94,0.24)" },
    3: { main: "#f59e0b", bg: "rgba(245,158,11,0.24)" },
  },
  BARRIER: "#facc15",
  BOARD: {
    CELL: "#020617",
    BORDER: "#1f2937",
  },
} as const;

export const LABELS = {
  COLUMNS: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
  ROWS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  PLAYERS: ["Vermelho", "Azul", "Verde", "Amarelo"],
  PLAYER_NAMES: ["Jogador 1", "Jogador 2", "Jogador 3", "Jogador 4"],
} as const;
```

---

## Appendix B: File Line Counts

| File                | Lines      | Purpose        |
| ------------------- | ---------- | -------------- |
| src/app/page.tsx    | 1,110      | Entire game    |
| src/app/layout.tsx  | 35         | Root layout    |
| src/app/globals.css | 27         | CSS variables  |
| CLAUDE.md           | 131        | AI guidelines  |
| package.json        | 26         | Dependencies   |
| tsconfig.json       | 34         | TS config      |
| eslint.config.mjs   | 19         | Lint config    |
| next.config.ts      | 8          | Next config    |
| postcss.config.mjs  | 8          | PostCSS config |
| **Total**           | **~1,400** |                |

---

_Document generated for Bloqueio Online multiplayer foundation planning._
