# Type Extraction & Game Room Hook - Implementation Plan

> **Status:** 🟡 In Progress  
> **Priority:** P0 (Blocker for MVP)  
> **Estimated Time:** 3-4 hours  
> **Actual Time:** TBD

## Context

**Why we're building this:**

- Current 1100-line `page.tsx` is unmaintainable
- Need clean separation between types, logic, and UI
- Game room hook will enable database sync for multiplayer

**Dependencies:**

- [x] Neon database setup (01-neon-setup.md)
- [x] Docker Postgres running locally
- [x] Drivers installed (@neondatabase/serverless, postgres)

**Related Docs:**

- [MVP_PLAN.md - Phase 2](../MVP_PLAN.md#phase-2-minimal-refactor)
- [DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md)

---

## Success Criteria

**Must Have (MVP):**

- [x] All game types extracted to `src/types/game.ts`
- [ ] `useGameRoom` hook created and tested
- [ ] Hook can read/write room state to database
- [ ] Imports work correctly in `page.tsx`
- [ ] Game still runs locally without errors

**Nice to Have (Post-MVP):**

- [ ] Type utilities for state transformations
- [ ] Hook supports optimistic updates
- [ ] Error boundary for database errors

**How We'll Know It Works:**

- [ ] `pnpm tsc --noEmit` passes (no TypeScript errors)
- [ ] `pnpm build` succeeds
- [ ] Game plays normally in browser
- [ ] Can create/read room from database via hook

---

## Technical Design

### Files to Create

```
src/
├── types/
│   └── game.ts          # All game type definitions
├── lib/
│   ├── db.ts            # Database client wrapper
│   └── hooks/
│       └── useGameRoom.ts  # Game room state management
```

### Types to Extract

```typescript
// From page.tsx → src/types/game.ts
export type PlayerId = 0 | 1 | 2 | 3;
export type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";
export type Mode = "move" | "wall";
export type Orientation = "H" | "V";

export interface Player {
  id: PlayerId;
  row: number;
  col: number;
  goalSide: GoalSide;
  wallsLeft: number;
  color: string;
  label: string;
  name: string;
}

export interface Barrier {
  row: number;
  col: number;
  orientation: Orientation;
  id: string;
}

export interface GameSnapshot {
  players: Player[];
  blockedEdges: string[];
  barriers: Barrier[];
  currentPlayerId: PlayerId;
  winner: PlayerId | null;
}

export interface GameRoom {
  id: string;
  status: "waiting" | "playing" | "finished";
  hostPlayerId: number;
  currentPlayerId: number;
  gameState: GameSnapshot;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Client

```typescript
// src/lib/db.ts
import postgres from "postgres";
import { neon } from "@neondatabase/serverless";

// Use postgres.js for local dev, Neon serverless for Edge Functions
export const sql =
  process.env.VERCEL_ENV === "production"
    ? neon(process.env.DATABASE_URL!)
    : postgres(process.env.DATABASE_URL!);
```

### Hook API

```typescript
// src/lib/hooks/useGameRoom.ts
export function useGameRoom(roomId?: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load room from database
  async function loadRoom(id: string): Promise<GameRoom | null>;

  // Create new room
  async function createRoom(initialState: GameSnapshot): Promise<string>;

  // Update room state
  async function updateRoom(roomId: string, state: GameSnapshot): Promise<void>;

  return {
    room,
    loading,
    error,
    loadRoom,
    createRoom,
    updateRoom,
  };
}
```

---

## Implementation Checklist

### Phase 1: Extract Types (1 hour)

- [ ] Create `src/types/game.ts`
- [ ] Copy type definitions from `page.tsx`
- [ ] Export all types
- [ ] Update `page.tsx` to import from `@/types/game`
- [ ] Verify `pnpm tsc --noEmit` passes

### Phase 2: Database Client (30 min)

- [ ] Create `src/lib/db.ts`
- [ ] Add environment-aware SQL client
- [ ] Export typed query functions
- [ ] Test with simple query

### Phase 3: Game Room Hook (1.5 hours)

- [ ] Create `src/lib/hooks/useGameRoom.ts`
- [ ] Implement `loadRoom` function
- [ ] Implement `createRoom` function
- [ ] Implement `updateRoom` function
- [ ] Add error handling

### Phase 4: Integration & Testing (1 hour)

- [ ] Import hook in `page.tsx` (don't use yet)
- [ ] Test build: `pnpm build`
- [ ] Test TypeScript: `pnpm tsc --noEmit`
- [ ] Manual test: Create room via hook
- [ ] Manual test: Load room via hook
- [ ] Update this doc with learnings

---

## Testing Plan

**Manual Tests:**

1. **Test Type Extraction:**

   ```bash
   # Should have no errors
   pnpm tsc --noEmit
   pnpm build
   ```

2. **Test Database Client:**

   ```typescript
   import { sql } from "@/lib/db";
   const result = await sql`SELECT * FROM game_rooms LIMIT 1`;
   console.log("DB works:", result);
   ```

3. **Test Hook - Create Room:**

   ```typescript
   const { createRoom } = useGameRoom();
   const roomId = await createRoom(initialGameState);
   console.log("Created room:", roomId);
   ```

4. **Test Hook - Load Room:**
   ```typescript
   const { loadRoom, room } = useGameRoom();
   await loadRoom("ABC123");
   console.log("Loaded room:", room);
   ```

**Edge Cases to Verify:**

- [ ] Hook handles missing DATABASE_URL gracefully
- [ ] Hook handles database connection errors
- [ ] Hook handles invalid room IDs
- [ ] Types enforce correct PlayerId values (0-3)

---

## Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                                           |
| ----------------------------------- | ---------- | ------ | ---------------------------------------------------- |
| Breaking imports during refactor    | Medium     | High   | Commit types extraction separately, test before hook |
| SQL driver mismatch (local vs prod) | Medium     | Medium | Test both environments, use feature flags            |
| State serialization issues          | Low        | Medium | Use JSON.stringify/parse, validate schema            |
| Hook causes re-render loops         | Low        | Medium | Use useMemo for derived state                        |

---

## Rollback Plan

**If types extraction breaks build:**

1. `git revert <commit>`
2. Keep types in `page.tsx` for now
3. Investigate import path issues

**If hook breaks game:**

1. Don't integrate hook yet
2. Complete refactor in separate branch
3. Test thoroughly before merging

**Safe State:**

- Commit after types extraction (before hook)
- Commit after hook creation (before integration)
- Don't integrate hook until Phase 3

---

## Post-Implementation

**What We Learned:**

- [To be filled after completion]

**Follow-up Tasks:**

- [ ] Consider using Zod for runtime type validation
- [ ] Add database connection pooling
- [ ] Create utility functions for state transformations
- [ ] Document hook API for team/future reference

**Related Future Work:**

- See: [03-create-join-flow.md](./03-create-join-flow.md) - Will use this hook
- See: [04-realtime-sync.md](./04-realtime-sync.md) - Will poll using this hook
