# UX Improvements and Barrier Placement Fixes

**Branch:** `feature/ux-improvements-and-barrier-fixes`  
**Date:** 17 de dezembro de 2025  
**Status:** 📋 Planning Phase - Awaiting Approval

---

## 📊 Issue Analysis

### Issue 1: Loading Spinner Duplication
**Current State:**
- Loading spinner code duplicated across 6+ components
- Inconsistent sizes, colors, and styling
- Code: `<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>`

**Locations Found:**
1. `GameBoard.tsx` (3 instances - different sizes: h-12/w-12, h-5/w-5, h-4/w-4)
2. `WaitingLobby.tsx` (2 instances - h-12/w-12, h-6/w-6)
3. `CreateRoom.tsx` (inline loading text)
4. `JoinRoom.tsx` (h-5/w-5)
5. Other potential locations

**Impact:**
- Maintenance overhead (changing styles requires 6+ file edits)
- Inconsistent user experience
- Larger bundle size (repeated Tailwind classes)

---

### Issue 2: Auto-Start Game When Room is Full
**Current State:**
- Host must manually click "Iniciar Jogo" button
- No automatic game start when minimum players join
- Players wait unnecessarily in lobby

**Expected Behavior:**
- TWO_PLAYER mode: Auto-start when 2 players join
- FOUR_PLAYER mode: Auto-start when 4 players join
- Host can still manually start with minimum players (2 in 4P mode)

**Implementation Considerations:**
- Polling in WaitingLobby already detects player count changes
- Need to check `room.players.length === maxPlayers`
- Call `startGame()` automatically
- Show toast notification: "Sala cheia! Iniciando jogo..."

---

### Issue 3: Host Not Redirected to Lobby After Room Creation
**Current State:**
- After creating room, host sees room code screen
- Must manually click "Continue to Lobby" button
- Extra step that could be automated

**Expected Behavior:**
- After room creation, immediately redirect to `/room/{code}/lobby`
- Skip the intermediate "code display" screen (or show it briefly as toast)
- Faster workflow, less friction

**Implementation Location:**
- `CreateRoom.tsx` - `handleCreateRoom()` function
- After successful room creation, auto-navigate

---

### Issue 4: Barrier Placement Boundary Logic Issues

#### 4.1 Cannot Place Barrier Between Columns 8 and 9
**Current State:**
- Clicking on column 9 or 8 cells doesn't allow barrier placement between them
- Logic incorrectly calculates `baseCol`

**Root Cause Analysis:**
Looking at `game.tsx` lines 687-704:
```tsx
if (wallOrientation === "V") {
  // Vertical barrier logic
  if (clickCol >= INNER_SIZE) {
    baseCol = SIZE - 3; // Always sets to 8 when clicking col 9+
  } else {
    baseCol = Math.max(0, clickCol - 1); // Clicking col 8 sets baseCol 7
  }
  baseRow = Math.max(0, Math.min(clickRow - 1, SIZE - 3));
  if (clickRow >= INNER_SIZE - 1) {
    baseRow = SIZE - 3; // 8
  }
}
```

**Problem:**
- Clicking column 9 → `baseCol = 8` (barrier between 8-9) ✅
- Clicking column 8 → `baseCol = 7` (barrier between 7-8) ❌ Should be 8!
- Missing logic: when `clickCol === 8`, should also allow `baseCol = 8`

#### 4.2 Row 1 Allows Vertical Barriers (Should Not)
**Current State:**
- Clicking any cell in row 1 allows vertical barrier placement
- This is invalid - row 1 is border, barriers should be between rows 2-10

**Root Cause:**
- No validation preventing `baseRow = 0` for vertical barriers
- Vertical barriers block edges between rows (e.g., row 0 to row 1)
- Row 0 is the top border - no barriers should block border access

**Expected:**
- Clicking row 1 cells should NOT show vertical barrier preview
- Same for row 10 (bottom border)

#### 4.3 Column 1 Allows Horizontal Barriers (Should Not)
**Current State:**
- Clicking any cell in column 1 allows horizontal barrier placement
- This is invalid - column 1 is border, barriers should be between columns 2-10

**Root Cause:**
- No validation preventing `baseCol = 0` for horizontal barriers
- Horizontal barriers block edges between columns (e.g., col 0 to col 1)
- Column 0 is the left border - no barriers should block border access

**Expected:**
- Clicking column 1 cells should NOT show horizontal barrier preview
- Same for column 10 (right border)

#### 4.4 Comprehensive Barrier Placement Rules

**Valid Barrier Positions:**
- **Horizontal Barriers:**
  - Must be placed between **columns 1-9** (internal columns)
  - `baseCol` range: 1 to 8 (blocks between col 1-2, 2-3, ..., 8-9)
  - `baseRow` range: 0 to 8 (can span any two rows from border to border)
  
- **Vertical Barriers:**
  - Must be placed between **rows 1-9** (internal rows)
  - `baseRow` range: 1 to 8 (blocks between row 1-2, 2-3, ..., 8-9)
  - `baseCol` range: 0 to 8 (can span any two columns from border to border)

**Current Grid Layout (11x11 with borders):**
```
    0   1   2   3   4   5   6   7   8   9   10  (columns)
0   B   B   B   B   B   B   B   B   B   B   B   (top border)
1   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
2   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
3   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
4   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
5   B   ·   ·   ·   P   ·   ·   ·   ·   ·   B
6   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
7   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
8   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
9   B   ·   ·   ·   ·   ·   ·   ·   ·   ·   B
10  B   B   B   B   B   B   B   B   B   B   B   (bottom border)
```

**Examples:**
- ✅ Horizontal barrier at (5, 3): blocks between col 3-4, spanning rows 5-6
- ❌ Horizontal barrier at (5, 0): would block border column 0-1
- ✅ Vertical barrier at (3, 5): blocks between row 3-4, spanning cols 5-6
- ❌ Vertical barrier at (0, 5): would block border row 0-1

---

## 🎯 Implementation Plan

### Phase 1: Loading Component (Estimated: 30 minutes)

#### 1.1 Create Reusable Loading Component
**File:** `src/components/ui/Loading.tsx`

```typescript
interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "blue" | "white" | "amber" | "green" | "red";
  className?: string;
  message?: string;
}

// Size mappings
// sm: h-4 w-4
// md: h-5 w-5
// lg: h-8 w-8
// xl: h-12 w-12

// Color mappings
// blue: border-blue-500
// white: border-white
// amber: border-amber-500
// etc.
```

**Features:**
- Configurable size (sm, md, lg, xl)
- Configurable color
- Optional loading message below spinner
- Centered by default with optional className override

#### 1.2 Replace All Loading Spinners
**Files to Update:**
1. `src/components/GameBoard.tsx` (3 instances)
2. `src/components/WaitingLobby.tsx` (2 instances)
3. `src/components/CreateRoom.tsx`
4. `src/components/JoinRoom.tsx`

**Example Replacements:**
```tsx
// Before:
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
<p className="text-slate-400">Carregando jogo...</p>

// After:
<Loading size="xl" color="blue" message="Carregando jogo..." />
```

---

### Phase 2: Auto-Start Game (Estimated: 45 minutes)

#### 2.1 Update WaitingLobby Logic
**File:** `src/components/WaitingLobby.tsx`

**Changes:**
1. Add state: `const [autoStarting, setAutoStarting] = useState(false)`
2. In polling effect, check if room is full:
   ```tsx
   const config = getGameModeConfig(result.room.gameMode);
   const isFull = result.room.players.length === config.maxPlayers;
   const isHost = result.myPlayerId === 0;
   
   if (isFull && isHost && !autoStarting && result.room.status === 'WAITING') {
     setAutoStarting(true);
     toast.success("Sala cheia! Iniciando jogo...");
     await startGame(roomCode);
   }
   ```
3. Show loading state when auto-starting

**Edge Cases:**
- Only host triggers auto-start (prevents duplicate calls)
- `autoStarting` flag prevents multiple triggers
- Toast notification informs users
- Manual start button still works if needed

#### 2.2 Update Server Validation
**File:** `src/lib/actions/game-actions.ts`

**No changes needed** - `startGame` already validates minimum players

---

### Phase 3: Host Auto-Redirect to Lobby (Estimated: 20 minutes)

#### 3.1 Update CreateRoom Flow
**File:** `src/components/CreateRoom.tsx`

**Option A: Immediate Redirect (Recommended)**
```tsx
const handleCreateRoom = async () => {
  setLoading(true);
  setError(null);

  try {
    const result = await createRoom(selectedMode);

    if ("error" in result) {
      setError(result.error);
    } else {
      // Store player ID
      sessionStorage.setItem(`room_${result.code}_playerId`, String(result.playerId));
      
      // Show success toast with code
      toast.success(`Sala criada! Código: ${result.code}`);
      
      // Auto-navigate to lobby
      router.push(`/room/${result.code}/lobby`);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to create room");
  } finally {
    setLoading(false);
  }
};
```

**Option B: Brief Code Display (Alternative)**
- Show room code for 2 seconds
- Auto-redirect after timeout
- User can copy code during this time

**Recommendation:** Option A - faster, code visible in lobby URL anyway

---

### Phase 4: Barrier Placement Boundary Fixes (Estimated: 2 hours)

#### 4.1 Fix Column 8-9 Barrier Placement
**File:** `src/app/game.tsx` - `checkWallPlacement()` function

**Current Code (lines 687-704):**
```tsx
if (wallOrientation === "V") {
  if (clickCol >= INNER_SIZE) {
    baseCol = SIZE - 3; // 8
  } else {
    baseCol = Math.max(0, clickCol - 1);
  }
  baseRow = Math.max(0, Math.min(clickRow - 1, SIZE - 3));
  if (clickRow >= INNER_SIZE - 1) {
    baseRow = SIZE - 3; // 8
  }
}
```

**Fixed Logic:**
```tsx
if (wallOrientation === "V") {
  // Vertical barriers block between columns
  if (clickCol >= INNER_SIZE) {
    // Clicking col 9 or 10 → barrier at 8 (between 8-9)
    baseCol = SIZE - 3; // 8
  } else if (clickCol === INNER_SIZE - 1) {
    // Clicking col 8 → allow barrier at 8 (between 8-9) OR 7 (between 7-8)
    // For now, default to 8 to match clicking col 9
    baseCol = SIZE - 3; // 8
  } else {
    // Clicking col 1-7 → barrier between (col-1) and col
    baseCol = Math.max(0, clickCol - 1);
  }
  
  // Vertical barriers cannot be at baseRow 0 or 9 (borders)
  baseRow = Math.max(1, Math.min(clickRow - 1, SIZE - 3));
  if (clickRow >= INNER_SIZE - 1) {
    baseRow = SIZE - 3; // 8
  } else if (clickRow === 1) {
    baseRow = 1; // Don't allow baseRow 0
  }
}
```

#### 4.2 Add Border Validation
**Location:** Same function, after calculating `baseRow` and `baseCol`

```tsx
// Validate barriers are not on borders
if (orientation === "H") {
  // Horizontal barriers: baseCol must be 1-8 (not 0 or 9+)
  if (baseCol < 1 || baseCol >= SIZE - 2) {
    if (!silent) toast.error("Não pode colocar barreira na borda");
    return { ok: false, baseRow, baseCol, orientation, edgesToAdd };
  }
} else {
  // Vertical barriers: baseRow must be 1-8 (not 0 or 9+)
  if (baseRow < 1 || baseRow >= SIZE - 2) {
    if (!silent) toast.error("Não pode colocar barreira na borda");
    return { ok: false, baseRow, baseCol, orientation, edgesToAdd };
  }
}
```

#### 4.3 Update Horizontal Barrier Logic (Mirror Vertical)
**Same pattern for horizontal barriers:**

```tsx
if (wallOrientation === "H") {
  // Horizontal barriers cannot be at baseCol 0 or 9 (borders)
  if (clickCol >= INNER_SIZE) {
    baseCol = SIZE - 3; // 8
  } else if (clickCol === INNER_SIZE - 1) {
    baseCol = SIZE - 3; // 8 - match with clicking col 9
  } else {
    baseCol = Math.max(1, clickCol - 1); // Changed from 0 to 1
  }
  
  // Horizontal barriers block between rows
  baseRow = Math.max(0, Math.min(clickRow - 1, SIZE - 3));
  if (clickRow >= INNER_SIZE - 1) {
    baseRow = SIZE - 3; // 8
  }
}
```

#### 4.4 Testing Checklist

**Test Scenarios:**
- [ ] Click column 8 cell → can place vertical barrier at 8 (between 8-9)
- [ ] Click column 9 cell → can place vertical barrier at 8 (between 8-9)
- [ ] Click column 1 cell → **cannot** place horizontal barrier (border)
- [ ] Click column 10 cell → **cannot** place horizontal barrier (border)
- [ ] Click row 1 cell → **cannot** place vertical barrier (border)
- [ ] Click row 10 cell → **cannot** place vertical barrier (border)
- [ ] Click internal cells (2-8) → both orientations work normally
- [ ] Ghost barrier preview shows correct position
- [ ] Mobile barrier placement respects same rules

---

## 📋 Implementation Checklist

### Phase 1: Loading Component ✅
- [ ] Create `src/components/ui/Loading.tsx`
- [ ] Define size/color variants
- [ ] Add optional message prop
- [ ] Replace spinner in `GameBoard.tsx` (3 locations)
- [ ] Replace spinner in `WaitingLobby.tsx` (2 locations)
- [ ] Replace spinner in `CreateRoom.tsx`
- [ ] Replace spinner in `JoinRoom.tsx`
- [ ] Test visual consistency

### Phase 2: Auto-Start Game ✅
- [ ] Add `autoStarting` state to `WaitingLobby.tsx`
- [ ] Implement room-full detection in polling effect
- [ ] Add auto-start logic (host only)
- [ ] Show toast notification
- [ ] Test with 2-player mode (auto-start at 2 players)
- [ ] Test with 4-player mode (auto-start at 4 players)
- [ ] Ensure manual start still works

### Phase 3: Host Redirect ✅
- [ ] Update `CreateRoom.tsx` handleCreateRoom
- [ ] Add toast with room code
- [ ] Auto-redirect to lobby
- [ ] Test redirect timing
- [ ] Verify player ID persists

### Phase 4: Barrier Fixes ✅
- [ ] Fix vertical barrier column 8-9 logic
- [ ] Add vertical barrier row border validation (not 0 or 9)
- [ ] Add horizontal barrier column border validation (not 0 or 9)
- [ ] Update ghost barrier preview logic
- [ ] Test all boundary scenarios (see 4.4 checklist)
- [ ] Test mobile barrier placement
- [ ] Verify server-side validation matches client

---

## 🧪 Testing Strategy

### Unit Tests (Optional - Manual First)
- Loading component renders all size/color variants
- Auto-start triggers only for host
- Barrier validation blocks border placements

### Manual Testing
1. **Loading Component:**
   - Visit all screens with loading states
   - Verify consistent appearance
   - Check different sizes render correctly

2. **Auto-Start:**
   - Create 2P room → join with 2nd player → verify auto-start
   - Create 4P room → join with 2nd player → verify NO auto-start
   - Join 3rd and 4th players → verify auto-start at 4
   - Test manual start with 2/4 players

3. **Host Redirect:**
   - Create room → verify immediate redirect to lobby
   - Check room code shown in toast
   - Verify host can start game from lobby

4. **Barrier Boundaries:**
   - Systematically test all 4 borders (top, right, bottom, left)
   - Test column 8-9 placement specifically
   - Test ghost preview matches final placement
   - Test both orientations in all positions

---

## 📊 Impact Analysis

### Benefits
✅ **Code Quality:**
- Reduced duplication (Loading component)
- Better maintainability
- Consistent UX

✅ **User Experience:**
- Faster game start (auto-start + redirect)
- Less confusion (automatic flows)
- Correct game mechanics (barrier boundaries)

✅ **Bug Fixes:**
- Column 8-9 barrier placement works
- No invalid border barriers
- Matches Quoridor rules correctly

### Risks
⚠️ **Auto-Start:**
- May surprise users (mitigated by toast notification)
- Need clear visual feedback

⚠️ **Barrier Logic:**
- Complex edge cases - thorough testing needed
- Mobile vs desktop behavior must match

### Rollback Plan
- Each phase is independent
- Can deploy incrementally
- Git branch allows easy revert

---

## 📅 Estimated Timeline

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Loading Component | 30min | Medium |
| 2 | Auto-Start Game | 45min | High |
| 3 | Host Redirect | 20min | Medium |
| 4 | Barrier Fixes | 2h | **Critical** |
| Testing | Manual QA | 1h | High |
| **Total** | | **~4.5 hours** | |

---

## 🚀 Deployment Strategy

1. ✅ Get approval on this plan
2. Implement phases 1-4 sequentially
3. Test each phase before moving to next
4. Create PR with all changes
5. Deploy to production after approval

---

## 📝 Notes

- All changes backwards compatible
- No database migrations needed
- No breaking API changes
- Safe to deploy incrementally

---

**Status:** 📋 Awaiting approval to proceed with implementation
