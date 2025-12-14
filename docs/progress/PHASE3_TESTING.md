# Phase 3 Testing Checklist

**Test Session Started:** 1:15 PM (Dec 14, 2025)

## Environment Setup

- [x] Dev server running on localhost:3000
- [x] Database configured (Neon for prod, checking local)
- [x] Browser open to test UI
- [x] Server Action logging added

## Manual Test Cases

### 1. HomeScreen Navigation

- [x] Open http://localhost:3000
- [x] Verify HomeScreen displays with 3 buttons
- [x] Click "Create New Game" → Should navigate to CreateRoom
- [x] Go back, click "Join Game" → Should navigate to JoinRoom
- [ ] Go back, click "Play Offline" → Should navigate to placeholder game screen

### 2. Create Room Flow

- [x] Click "Create New Game"
- [] Click "Create Room" button
- [ ] Verify loading state shows "Creating Room..."
- [ ] **Check server logs** for:
  ```
  🎮 [Server Action] createGameRoom called
  🔑 Generated room code: XXXXXX
  ✅ Room created successfully
  ```
- [ ] Verify 6-character room code displays
- [ ] Click "Copy Code" → Verify "✓ Copied!" feedback
- [ ] **Manually verify clipboard** contains room code
- [ ] Click "Continue to Lobby" → Should navigate to WaitingLobby

### 3. Database Verification

After creating a room:

- [ ] Check server logs for INSERT query
- [ ] Query database to verify room exists:
  ```sql
  SELECT * FROM game_rooms ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify room_code matches displayed code
- [ ] Verify status = 'waiting'
- [ ] Verify game_state JSON is valid

### 4. JoinRoom Flow (Manual Entry)

- [ ] Navigate to "Join Game"
- [ ] Type invalid code (e.g., "INVALID") character by character
- [ ] Verify auto-focus moves between inputs
- [ ] Verify "Join Room" button enables when 6 chars entered
- [ ] Click "Join Room" → Should show "Room not found" error
- [ ] Clear inputs and enter **valid room code from Create test**
- [ ] Verify navigation to WaitingLobby

### 5. JoinRoom Flow (Paste)

- [ ] Navigate to "Join Game"
- [ ] Paste a 6-character code from clipboard
- [ ] Verify all 6 inputs fill automatically
- [ ] Verify auto-submission occurs

### 6. WaitingLobby (Host View)

- [ ] Create a room and continue to lobby
- [ ] Verify room code displays correctly
- [ ] Verify "Copy" button works
- [ ] Verify "HOST" badge shows on Player 1
- [ ] Verify "Start Game" button is **disabled** (need 2+ players)
- [ ] Verify "Leave Room" button works → Returns to home

### 7. Error Handling

- [ ] Test with database disconnected (if possible)
- [ ] Verify error messages display correctly
- [ ] Verify loading states clear on error
- [ ] Verify user can retry after error

## Expected Server Logs

```
🎮 [Server Action] createGameRoom called
📊 Initial state: {
  "players": [],
  "blockedEdges": [],
  "barriers": [],
  "currentPlayerId": 0,
  "winner": null
}
🔑 Generated room code: ABC123
✅ Room created successfully: [{ room_code: 'ABC123' }]
```

## Issues Found

### Issue #1: Database Schema Mismatch ✅ FIXED

- **Found:** 1:22 PM
- **Fixed:** 1:22 PM (5 minutes)
- **Problem:** Server Actions used `room_code` column, but schema has `id` column
- **Root Cause:** Schema in `init-db.sql` uses different column naming:
  - `id` (TEXT) instead of `room_code`
  - `host_player_id` and `current_player_id` required fields
- **Solution:** Updated all Server Actions to match actual schema
  - `createGameRoom`: INSERT with id, host_player_id, current_player_id
  - `loadGameRoom`: SELECT WHERE id = ...
  - `updateGameRoom`: UPDATE current_player_id
- **Commit:** `6811367`
- **Status:** ✅ Ready to retest

---

**Test Session:** ⏱️ In Progress  
**Tester:** Manual browser testing  
**Environment:** Development (localhost:3000)

## Test Results

### Round 1: Initial Test (1:15 PM - 1:22 PM)

- ❌ Room creation failed with schema error
- ✅ Error logging worked perfectly
- ✅ Fix applied in 5 minutes

### Round 2: After Schema Fix (1:22 PM - 1:30 PM)

- ✅ Room creation successful!
- ✅ Room code generated and displayed
- ✅ Join flow works (anonymous tab)
- ❌ **BUG: Player duplication** - Second player added 3 times
- ❌ **BUG: Room full prematurely** - 4 slots filled with only 2 real players
- ⚠️ **Missing: Player slot management** - Need to assign unique player IDs

### Issue #2: Player Duplication in Polling ⏱️ FIXING NOW

- **Found:** 1:30 PM
- **Problem:** Mock polling in WaitingLobby adds duplicate players
- **Root Cause:** No real player management, no player ID assignment
- **Solution Needed:**
  - Implement proper player joining logic
  - Assign unique player IDs (0-3) when joining
  - Track which browser/user owns which player
  - Real polling from database instead of mock data
