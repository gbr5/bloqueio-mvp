# Bloqueio Game - AI Agent Instructions

## 📍 Current State vs. End Goal

**Current State (v0.1 - Local Play):**

- ✅ Working 4-player board game (hot-seat multiplayer)
- ⚠️ 1100-line monolithic component in `src/app/page.tsx`
- ⚠️ Inline styles, no state management, no backend
- ✅ Fully functional game logic with barriers and movement validation

**End Goal (v1.0 - Online Multiplayer):**

- 🎯 Real-time online multiplayer (2-4 players)
- 🎯 Modular, testable architecture
- 🎯 Freemium business model ($500-2000/mo side income target)
- 🎯 Mobile-responsive PWA

**Implementation Strategy:**

- **MVP-first approach** (2-3 weeks to multiplayer) - see `docs/MVP_PLAN.md`
- **Neon + polling for real-time** (no custom backend initially)
- **Validate market first** before over-engineering
- **Scale only if traction exists** - see `docs/SCALING_PLAYBOOK.md`

---

## Project Overview

This is a **4-player Quoridor-style board game** built with Next.js 14+, React 19, and TypeScript. The game features an 11x11 grid (9x9 internal + border) where players race to reach opposite sides while strategically placing barriers to block opponents.

**Current Phase:** Building MVP for online multiplayer (Week 1-2 of `docs/MVP_PLAN.md`)

## Architecture & Core Systems

### Game Board System

- **Coordinate System**: 11x11 grid with (0,0) at top-left
- **Border Logic**: Outer border cells (row/col 0 or SIZE-1) serve as colored goal zones for each player
- **Edge Representation**: Movement blocked via edge keys using `edgeKey(r1,c1,r2,c2)` function that normalizes coordinates

### Player & Movement Logic

- **4 Players**: Starting positions at mid-edges, each with opposite goal sides (TOP↔BOTTOM, LEFT↔RIGHT)
- **Movement Rules**:
  - Normal: 1 orthogonal step
  - Jump: 2 steps in straight line when jumping over another player, if landing cell is blocked, side-step allowed, side-step I mean moving one cell front, and another cell to the left or right of the jumped player
- **Goal Detection**: Players win by reaching any cell on their assigned border edge

### Barrier/Wall System

- **Placement**: 2x1 barriers that block movement between adjacent cells
- **Orientations**: Horizontal (`H`) and Vertical (`V`) barriers
- **Validation**: Barriers cannot cross existing barriers or completely cut off any player's path to goal
- **Path Validation**: Uses BFS in `hasPathToGoal()` to ensure all players maintain reachable paths

## Key Data Structures

```typescript
type Player = {
  id: PlayerId; // 0-3
  row: number;
  col: number;
  goalSide: GoalSide; // 'TOP'|'RIGHT'|'BOTTOM'|'LEFT'
  wallsLeft: number; // 6 barriers per player
  color: string;
  label: string;
  name: string;
};

type Barrier = {
  row: number;
  col: number; // base position (top-left of 2x2 area)
  orientation: "H" | "V";
  id: string;
};

// Game state tracking for undo/history
type GameSnapshot = {
  players: Player[];
  blockedEdges: string[];
  barriers: Barrier[];
  currentPlayerId: PlayerId;
  winner: PlayerId | null;
};
```

## Critical Game Logic Functions

- **`canPawnMoveTo()`**: Validates all movement (normal steps + jumps over players)
- **`hasPathToGoal()`**: BFS pathfinding to ensure players aren't completely blocked
- **`checkWallPlacement()`**: Comprehensive barrier placement validation
- **`edgeKey()`**: Normalizes coordinate pairs for consistent edge tracking

## UI & Interaction Patterns

### Game Modes

- **Move Mode**: Click to move current player's pawn
- **Wall Mode**: Click to place barriers (toggle H/V orientation)
- **Hover System**: Visual feedback shows valid moves/placements with colored borders

### State Management Pattern

```typescript
// All game actions use snapshot system for undo functionality
function pushSnapshot() {
  /* saves current state to history[] */
}
function handleUndo() {
  /* restores last snapshot */
}

// Mode switching between 'move' and 'wall'
const [mode, setMode] = useState<Mode>("move");
```

## Development Workflow

### Running the Game

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # ESLint validation
```

### Key File Structure

- **`src/app/page.tsx`**: Complete game implementation (1100+ lines, single component)
- **`src/app/layout.tsx`**: Next.js layout with Geist fonts
- **`src/app/globals.css`**: Tailwind CSS with custom dark theme variables

## Project-Specific Conventions

### Styling Approach

- **Inline styles throughout** - no CSS modules or styled-components
- **Dark theme** with `radial-gradient(circle at top, #020617, #000000)` background
- **Player colors**: Red(#ef4444), Blue(#3b82f6), Green(#22c55e), Yellow(#f59e0b)

### Code Organization

- **Single large component** rather than componentization - entire game logic in `BloqueioPage()`
- **Functional approach** with extensive use of React hooks
- **Portuguese UI text** (`"Mover peão"`, `"Barreiras"`, etc.)

## Game Rules & Win Conditions

1. **Turn-based**: Players alternate between moving pawns and placing barriers
2. **Movement**: 1 orthogonal step or jump over adjacent players
3. **Barriers**: Each player has 6 barriers that block movement but cannot isolate players
4. **Victory**: First to reach any cell on opposite border wins

## Common Extension Points

- **Multiplayer**: Current state system supports network sync
- **AI Players**: `canPawnMoveTo()` and `hasPathToGoal()` provide game tree evaluation
- **Game Variants**: Modify `INNER_SIZE` and `createInitialPlayers()` for different board sizes
- **Save/Load**: `GameSnapshot` type designed for persistence

## Performance Considerations

- **Path validation** runs on every barrier placement - consider memoization for larger boards
- **Barrier rendering** uses absolute positioning - watch for layout thrashing with many barriers
- **Edge tracking** with `Set<string>` is efficient but could use `Map` for metadata

---

## MVP Development Plan

### Immediate Next Steps (Week 1-2)

**Phase 1: Neon Setup** (30 minutes)

- Create Neon database via Vercel Storage
- Set up `game_rooms` table
- See `docs/MVP_PLAN.md` for full schema

**Phase 2: Minimal Refactor** (4-6 hours)

- Extract types to `src/types/game.ts`
- Create `useGameRoom` hook for Neon
- Keep game logic in `page.tsx` (don't over-refactor yet)

**Phase 3: Create/Join Flow** (6-8 hours)

- Build home screen with Create/Join options
- Implement 6-digit room code system
- Create waiting lobby component

**Phase 4: Real-time Sync** (8-10 hours)

- Poll Neon for changes (1-2 second intervals)
- Sync game state across clients
- Implement basic turn validation

**Phase 5: Polish & Deploy** (4-6 hours)

- Add loading states
- Deploy to Vercel
- Test with real users

### What We're NOT Building (Yet)

❌ **Deliberately deferred until market validation:**

- User authentication
- Player profiles/stats
- Matchmaking
- Reconnection handling
- Accessibility beyond basics
- Mobile optimization
- Comprehensive testing

**Why:** These add weeks of work with no validation of whether anyone wants the product. Ship fast, validate, then invest.

---

## Business Strategy Context

**Target:** $500-2000/mo side income (not world domination)

**Monetization Plan:**

- Freemium model (free play + premium features)
- Premium tier: $4.99/mo (custom themes, stats, private rooms)
- Target: 3-5% conversion rate from free → paid

**Market Validation (Week 2-4):**

1. Test with 10-15 friends
2. Post to r/boardgames, r/WebGames
3. Measure completion rates and organic sharing
4. Collect email signups for "premium features coming soon"

**Go/No-Go Decision (End of Month 1):**

- ✅ If 50+ organic users + 20%+ return rate → Keep building
- 🚨 If < 20 users or nobody returns → Honest pivot conversation

See `docs/BUSINESS_STRATEGY.md` for full details.

---

## Scaling Strategy (If Traction Exists)

**Only scale if revenue > $2000/mo for 3+ months**

**Scaling Path:**

1. **Phase 1**: Stabilize foundation (monitoring, rate limiting, cleanup)
2. **Phase 2**: Decide to continue with Neon or migrate to custom infrastructure
3. **Phase 3**: Add premium features (themes, stats, tournaments)
4. **Phase 4**: Consider hiring (community manager, contractors)

**Full refactor to custom WebSocket server:**

- See `docs/IMPLEMENTATION_PLAN.md` (28-PR plan)
- Only needed if: Revenue > $5K/mo or Neon costs > $500/mo
- Timeline: 6-8 weeks of development

See `docs/SCALING_PLAYBOOK.md` for complete scaling strategy.

---

## Important Principles

**For AI Agents Working on This Codebase:**

1. **MVP First**: Don't over-engineer. Ship working multiplayer in 2-3 weeks, not 3 months.

2. **No Premature Optimization**: Current monolithic approach is fine for MVP. Refactor only when we have paying users.

3. **Validate Before Building**: If a feature doesn't help validate market demand, it's not for MVP.

4. **Keep It Simple**: Use Neon + polling, not custom WebSockets. Use Context, not Zustand (initially). Inline styles are fine for now.

5. **Business-Aware**: Every code decision should consider: Does this get us to revenue faster or slower?

6. **Lean Startup Method**: Build → Measure → Learn → Iterate. Not Build → Build → Build → Hope.

When suggesting features or architecture changes, always ask: **"Does this help us validate the market, or is it scaling we don't need yet?"**

---

## Documentation Structure

- **`docs/MVP_PLAN.md`**: 2-3 week plan to multiplayer (START HERE)
- **`docs/BUSINESS_STRATEGY.md`**: Market validation & monetization
- **`docs/SCALING_PLAYBOOK.md`**: What to do when you have traction
- **`docs/IMPLEMENTATION_PLAN.md`**: Full 28-PR refactor (only if scaling)

Read MVP_PLAN.md first for immediate next steps.
