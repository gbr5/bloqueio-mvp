# Phase 3 Testing Checklist

**Test Session Started:** 1:15 PM (Dec 14, 2025)

## Environment Setup

- [x] Dev server running on localhost:3000
- [x] Database configured (Neon for prod, checking local)
- [x] Browser open to test UI
- [x] Server Action logging added

## Manual Test Cases

### 1. HomeScreen Navigation

- [ ] Open http://localhost:3000
- [ ] Verify HomeScreen displays with 3 buttons
- [ ] Click "Create New Game" → Should navigate to CreateRoom
- [ ] Go back, click "Join Game" → Should navigate to JoinRoom
- [ ] Go back, click "Play Offline" → Should navigate to placeholder game screen

### 2. Create Room Flow

- [ ] Click "Create New Game"
- [ ] Click "Create Room" button
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

Document any bugs/issues discovered during testing here.

---

**Test Session:** ⏱️ In Progress  
**Tester:** Manual browser testing  
**Environment:** Development (localhost:3000)
