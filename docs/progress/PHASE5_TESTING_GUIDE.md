# Phase 5: Two-Player Mode Testing Guide

**Date:** December 17, 2025  
**Feature:** Two-Player Mode (2P-MODE-001)  
**Phase:** 5 - Testing & QA

---

## 🎯 Testing Objectives

1. Verify 2-player mode works end-to-end
2. Ensure 4-player mode still works (regression testing)
3. Validate barrier counts (12 vs 6)
4. Test pathfinding with 2 players
5. Verify UI displays correctly for both modes

---

## 🧪 Manual Testing Checklist

### Test Suite 1: Two-Player Room Creation & Joining

**Test 1.1: Create 2-Player Room**

- [ ] Start dev server: `pnpm dev`
- [ ] Navigate to http://localhost:3000
- [ ] Click "Criar Sala" (Create Room)
- [ ] Verify modal shows two mode options: 🎯 2 Players and 🎲 4 Players
- [ ] Select "🎯 2 Players - Classic Duel - 12 Barriers Each Side"
- [ ] Click "Criar Sala"
- [ ] **Expected:** Room created, redirected to lobby
- [ ] **Verify:** URL shows room code (e.g., `/room/ABC123/lobby`)
- [ ] **Verify:** Lobby shows "🎯 2 Jogadores • 12 barreiras cada" badge
- [ ] **Verify:** Player slots show "Jogadores (1/2)"
- [ ] **Verify:** Start button disabled (need 2 players)

**Test 1.2: Join 2-Player Room (Second Player)**

- [ ] Copy room code from lobby
- [ ] Open incognito/private window
- [ ] Navigate to http://localhost:3000
- [ ] Click "Entrar em Sala" (Join Room)
- [ ] Paste room code
- [ ] Enter guest name or login
- [ ] Click "Entrar"
- [ ] **Expected:** Successfully joined
- [ ] **Verify:** Both windows show "Jogadores (2/2)"
- [ ] **Verify:** Two player cards visible (Red and Green)
- [ ] **Verify:** No slots for Blue (right) or Yellow (left) players
- [ ] **Verify:** Host window shows enabled "Iniciar Jogo" button

**Test 1.3: Attempt Third Player Join (Should Fail)**

- [ ] Open another incognito window
- [ ] Try to join same room code
- [ ] **Expected:** Error message "Room is full (2 players max)" or similar
- [ ] **Verify:** Join fails gracefully

---

### Test Suite 2: Two-Player Game Start & Gameplay

**Test 2.1: Start 2-Player Game**

- [ ] From host window (with 2 players in lobby)
- [ ] Click "Iniciar Jogo" button
- [ ] **Expected:** Both windows redirect to `/room/ABC123/game`
- [ ] **Verify:** Game board displays
- [ ] **Verify:** Only 2 pawns visible: Red (top) and Green (bottom)
- [ ] **Verify:** No Blue (right) or Yellow (left) pawns
- [ ] **Verify:** Status shows current player turn
- [ ] **Verify:** Barrier counter shows "Colocar barreira (12/12)" for starting player

**Test 2.2: Player Movement**

- [ ] Current player clicks cell adjacent to their pawn
- [ ] **Expected:** Pawn moves to clicked cell
- [ ] **Verify:** Turn switches to other player
- [ ] **Verify:** Both windows update simultaneously (within 1-2 seconds)

**Test 2.3: Barrier Placement (2P Mode)**

- [ ] Player in barrier mode clicks internal cell
- [ ] **Expected:** Confirmation modal appears
- [ ] **Verify:** Modal shows "Barreira horizontal/vertical na posição (X, Y)"
- [ ] **Verify:** Modal shows remaining barriers: "Você tem 12 barreiras restantes"
- [ ] Click "Confirmar"
- [ ] **Expected:** Barrier placed, counter decrements
- [ ] **Verify:** Barrier counter shows "11/12" after first placement
- [ ] **Verify:** Barrier visible in player's color (Red or Green)

**Test 2.4: Place All 12 Barriers**

- [ ] Continue placing barriers (alternating with moves)
- [ ] Place all 12 barriers for one player
- [ ] **Expected:** After 12th barrier, "Colocar barreira (0/12)" displayed
- [ ] Try to place 13th barrier
- [ ] **Expected:** Error toast "Sem barreiras restantes!"
- [ ] **Verify:** Cannot place more barriers

**Test 2.5: Win Condition (2P)**

- [ ] Move Red player (top) to bottom border (row 10)
- [ ] **Expected:** Red player wins
- [ ] **Verify:** Status shows "Jogador 1 venceu!"
- [ ] **Verify:** Game locked (no more moves)

---

### Test Suite 3: Four-Player Mode Regression

**Test 3.1: Create 4-Player Room**

- [ ] Create new room
- [ ] Select "🎲 4 Players - Standard - 6 Barriers Per Side"
- [ ] **Expected:** Room created successfully
- [ ] **Verify:** Lobby shows "🎲 4 Jogadores • 6 barreiras cada" badge
- [ ] **Verify:** Player slots show "Jogadores (1/4)"

**Test 3.2: Join 4 Players**

- [ ] Use 3 incognito windows + host window
- [ ] Join 3 more players
- [ ] **Expected:** All 4 player slots filled
- [ ] **Verify:** Four player cards: Red, Blue, Green, Yellow
- [ ] **Verify:** "Jogadores (4/4)"
- [ ] **Verify:** Start button enabled

**Test 3.3: Start & Play 4-Player Game**

- [ ] Start game
- [ ] **Expected:** Game board shows 4 pawns (all sides)
- [ ] **Verify:** Barrier counter shows "(6/6)"
- [ ] Move pawns around
- [ ] Place barriers
- [ ] **Verify:** Each player has 6 barriers max
- [ ] **Verify:** Game works as before (no regressions)

---

### Test Suite 4: Edge Cases & Error Handling

**Test 4.1: Default Mode is 4-Player**

- [ ] Create room WITHOUT selecting mode
- [ ] **Expected:** Creates 4-player room (backward compatibility)

**Test 4.2: Pathfinding Validation (2P)**

- [ ] In 2P game, place barriers to nearly block a player
- [ ] Try to place final blocking barrier
- [ ] **Expected:** Error toast "Esta barreira bloquearia [player] de alcançar seu objetivo"
- [ ] **Verify:** Barrier NOT placed

**Test 4.3: Jump Mechanics (2P)**

- [ ] Move Red and Green pawns adjacent to each other
- [ ] Try to jump over opponent
- [ ] **Expected:** Jump works correctly
- [ ] **Verify:** Can jump forward or side-step if forward blocked

**Test 4.4: Mobile Responsiveness**

- [ ] Resize browser to mobile width (< 640px)
- [ ] **Verify:** 2P mode works on mobile
- [ ] **Verify:** 4P mode works on mobile
- [ ] **Verify:** Mode selection cards stack vertically
- [ ] **Verify:** Barrier placement works (tap + timer + confirmation)

**Test 4.5: Room Code Persistence**

- [ ] Join room
- [ ] Refresh page
- [ ] **Expected:** Still in same room
- [ ] **Verify:** Game state preserved

---

## 🐛 Known Issues to Watch For

1. **Prisma Client Types:** If you see TypeScript errors about `room.gameMode`, restart VS Code TypeScript server
2. **Polling Lag:** Updates may take 1-2 seconds due to polling interval
3. **Test Failures:** Some pathfinding tests fail (pre-existing, not related to 2P mode)

---

## ✅ Success Criteria

**Phase 5 is complete when:**

- [ ] All Test Suite 1 tests pass (2P room creation)
- [ ] All Test Suite 2 tests pass (2P gameplay)
- [ ] All Test Suite 3 tests pass (4P regression)
- [ ] All Test Suite 4 tests pass (edge cases)
- [ ] No critical bugs found
- [ ] Performance acceptable (<2s for updates)
- [ ] UI/UX feels smooth and intuitive

---

## 📝 Bug Report Template

If you find a bug, document it as:

```markdown
**Bug ID:** BUG-2P-XXX
**Severity:** Critical / Major / Minor
**Test:** [Test Suite X.Y]
**Description:** [What happened]
**Expected:** [What should happen]
**Steps to Reproduce:**

1. ...
2. ...
   **Screenshot/Video:** [If applicable]
   **Browser/Device:** Chrome/Safari/Mobile
```

---

## 🎯 Next Steps After Testing

1. Fix any critical bugs found
2. Document test results in `docs/progress/PHASE5_RESULTS.md`
3. Update acceptance criteria checkboxes
4. Proceed to Phase 6: Documentation & Polish
5. Prepare for production deployment

---

**Testing Started:** [Fill in date/time]  
**Testing Completed:** [Fill in date/time]  
**Total Bugs Found:** [Fill in count]  
**Status:** 🔄 In Progress
