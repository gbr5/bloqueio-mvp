# Real-Time Update Strategy Analysis

**Date:** December 16, 2025  
**Context:** Current polling implementation causes re-render interference during gameplay  
**Goal:** Find optimal real-time solution that balances UX, complexity, and MVP speed

---

## Current Situation

### What We Have

- ✅ Neon PostgreSQL database (serverless)
- ✅ Vercel deployment (serverless functions)
- ✅ Next.js 16 + React 19
- ✅ Prisma ORM for type-safe database access
- ✅ Turn-based game (not high-frequency like FPS)
- ✅ 2-4 players per game room

### The Problem

**Polling interference fixed but not optimal:**

- Polling only happens when NOT your turn (solved re-render issue)
- Still 1-second latency to see opponent moves
- Inefficient for database (constant queries even when idle)
- Doesn't scale well (1000 rooms = 1000 queries/second minimum)

### MVP Philosophy Constraints

From copilot-instructions.md:

- ⚠️ **"MVP First"** - Ship working multiplayer in 2-3 weeks
- ⚠️ **"Validate Before Building"** - Don't over-engineer before market validation
- ⚠️ **"Does this help us validate the market?"** - Critical decision filter
- ✅ Target revenue: $500-2000/mo (not world domination)
- ✅ Scaling only if traction exists (>$2K MRR for 3+ months)

---

## Option Analysis

### Option 1: Optimized Polling (What We Have)

**Implementation:** Keep current approach but optimize

**Pros:**

- ✅ Already working
- ✅ Zero new dependencies
- ✅ Simple to understand
- ✅ Works on Vercel serverless
- ✅ Good enough for turn-based games

**Cons:**

- ❌ 1-second latency feels sluggish
- ❌ Database load scales linearly with rooms
- ❌ Wastes resources polling empty rooms
- ❌ Not "real-time" feeling

**Effort:** 0-2 hours (optimizations only)  
**Cost:** $0 additional  
**UX Score:** 6/10  
**MVP Fit:** ⭐⭐⭐⭐⭐ (Already done!)

**Optimizations Available:**

```typescript
// Adaptive polling based on game activity
- Active game: 500ms polling
- Inactive (no moves): 2s polling
- Exponential backoff if no changes
- Stop polling after 5min inactivity
```

---

### Option 2: Server-Sent Events (SSE)

**Implementation:** One-way push from server to client

**How It Works:**

```typescript
// Server (Next.js API route)
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Push updates when database changes
  const interval = setInterval(async () => {
    const room = await getRoomState(roomCode);
    await writer.write(encoder.encode(`data: ${JSON.stringify(room)}\n\n`));
  }, 1000);

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// Client
const eventSource = new EventSource(`/api/room/${code}/stream`);
eventSource.onmessage = (event) => {
  const room = JSON.parse(event.data);
  setRoom(room);
};
```

**Pros:**

- ✅ Native browser API (EventSource)
- ✅ Works on Vercel serverless (with caveats)
- ✅ One-way push (perfect for our use case)
- ✅ Auto-reconnection built-in
- ✅ Lower latency than polling (~100-500ms)
- ✅ Less database load (server controls when to query)

**Cons:**

- ⚠️ Vercel Edge Functions timeout after 25s
- ⚠️ Still polls database server-side (moves load, doesn't eliminate)
- ❌ No native database change notifications from Neon
- ⚠️ Requires keeping connection open (1 connection per client)

**Effort:** 4-6 hours  
**Cost:** $0 (within Vercel limits)  
**UX Score:** 7.5/10  
**MVP Fit:** ⭐⭐⭐⭐ (Good balance, but Vercel timeout is concern)

**Vercel Compatibility:**

- Edge Functions: 25-second timeout (too short for game sessions)
- Node.js Functions: No built-in streaming support
- **Workaround:** Chunked responses with periodic reconnection

---

### Option 3: Pusher/Ably (Third-Party Real-Time)

**Implementation:** Use managed WebSocket service

**How It Works:**

```typescript
// Server action
import Pusher from "pusher";
const pusher = new Pusher({ appId, key, secret });

await pusher.trigger(`room-${code}`, "move-made", {
  playerId,
  row,
  col,
});

// Client
import PusherJS from "pusher-js";
const pusher = new PusherJS(publicKey);
const channel = pusher.subscribe(`room-${code}`);
channel.bind("move-made", (data) => {
  updateGameState(data);
});
```

**Pros:**

- ✅ True real-time (< 100ms latency)
- ✅ Works perfectly on Vercel serverless
- ✅ No connection management needed
- ✅ Handles scaling automatically
- ✅ Free tier available
- ✅ 2-4 hours to implement
- ✅ Production-ready, battle-tested

**Cons:**

- ❌ External dependency (lock-in risk)
- ❌ Pricing can scale expensively
- ⚠️ Adds complexity to stack
- ❌ Need to trigger events from server actions

**Effort:** 3-4 hours  
**Cost:**

- Pusher: Free (100 connections, 200K messages/day) → $49/mo (500 connections)
- Ably: Free (200 connections, 6M messages/mo) → $29/mo (1K connections)

**UX Score:** 9/10  
**MVP Fit:** ⭐⭐⭐ (Great UX, but adds dependency before market validation)

**Free Tier Analysis:**

- 100 concurrent connections = ~25-50 active game rooms
- 200K messages/day = ~140 messages/min sustained
- **Enough for MVP testing with 50-100 users**

---

### Option 4: Supabase Realtime

**Implementation:** Migrate to Supabase for database + realtime

**How It Works:**

```typescript
// Client listens to database changes
const channel = supabase
  .channel(`room:${code}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "Room" },
    (payload) => updateGameState(payload.new)
  )
  .subscribe();
```

**Pros:**

- ✅ True database-level change notifications
- ✅ No polling at all (Postgres LISTEN/NOTIFY)
- ✅ Generous free tier
- ✅ Includes auth, storage, database
- ✅ WebSocket connections managed

**Cons:**

- ❌ **REQUIRES DATABASE MIGRATION** (Neon → Supabase)
- ❌ 8-12 hours migration work
- ❌ Lose Prisma ORM (Supabase uses own client)
- ❌ Vercel integration less seamless than Neon
- ⚠️ Different from documented tech stack

**Effort:** 12-16 hours (migration + testing)  
**Cost:** Free tier → $25/mo (100GB bandwidth, 500K MAU)  
**UX Score:** 9/10  
**MVP Fit:** ⭐ (Too much work before validation)

---

### Option 5: Custom WebSocket Server

**Implementation:** Full custom backend (original 28-PR plan)

**Stack:**

```
- Node.js + Express + Socket.io
- PostgreSQL (keep Neon or migrate)
- Deploy on Railway/Fly.io
```

**Pros:**

- ✅ Complete control
- ✅ Best performance possible
- ✅ Can optimize exactly for game logic
- ✅ No external service limits

**Cons:**

- ❌ **6-8 WEEKS OF WORK**
- ❌ Separate backend to maintain
- ❌ Infrastructure costs ($100-300/mo)
- ❌ Complexity increases 3-5x
- ❌ Deploy/monitor two systems
- ⚠️ **Only justified if revenue > $5K/mo**

**Effort:** 240-320 hours  
**Cost:** $100-300/mo infrastructure  
**UX Score:** 10/10  
**MVP Fit:** ⭐ (Massive over-engineering for MVP)

---

### Option 6: Neon + Hybrid Polling/SSE

**Implementation:** Smart polling with SSE for instant updates

**How It Works:**

```typescript
// Use SSE for "someone is typing" instant feedback
// Use optimized polling (500ms) for state sync
// Server tracks last activity per room
// Auto-pause polling on inactive rooms
```

**Pros:**

- ✅ Best of both worlds
- ✅ Keep Neon (no migration)
- ✅ Immediate feedback for active moves
- ✅ Fallback to polling if SSE fails
- ✅ Progressive enhancement

**Cons:**

- ⚠️ More complex than single approach
- ⚠️ Still some database load
- ❌ Two systems to debug

**Effort:** 6-8 hours  
**Cost:** $0  
**UX Score:** 8/10  
**MVP Fit:** ⭐⭐⭐⭐ (Pragmatic, keeps existing stack)

---

## Recommendation Matrix

| Option                | MVP Fit    | UX     | Effort | Cost        | Risk      |
| --------------------- | ---------- | ------ | ------ | ----------- | --------- |
| **Optimized Polling** | ⭐⭐⭐⭐⭐ | 6/10   | 2h     | $0          | None      |
| **SSE**               | ⭐⭐⭐⭐   | 7.5/10 | 6h     | $0          | Medium    |
| **Pusher/Ably**       | ⭐⭐⭐     | 9/10   | 4h     | $0-49/mo    | Lock-in   |
| **Supabase**          | ⭐         | 9/10   | 16h    | $0-25/mo    | Migration |
| **Custom WS**         | ⭐         | 10/10  | 300h   | $100-300/mo | High      |
| **Hybrid**            | ⭐⭐⭐⭐   | 8/10   | 8h     | $0          | Medium    |

---

## Decision Framework

### If Target: Quick Market Validation (Current Goal)

**Choose:** Optimized Polling or Pusher

**Reasoning:**

- Polling works, just needs tweaks (adaptive intervals, exponential backoff)
- Pusher free tier covers 50-100 users (enough for validation)
- 2-4 hours vs weeks of work
- Can always migrate later with data

### If Target: Better UX Before Launch

**Choose:** Pusher/Ably

**Reasoning:**

- True real-time with minimal effort
- Free tier sufficient for MVP testing
- Battle-tested, handles edge cases
- Easy to remove if we scale beyond free tier

### If Target: Long-Term Scalable Architecture

**Choose:** Custom WebSocket (6-8 weeks later)

**Reasoning:**

- Only if revenue > $5K/mo for 3+ months
- Only if external service costs > $500/mo
- Follow SCALING_PLAYBOOK.md path

---

## Recommended Path

### Phase 1: Immediate (This Week)

**Implement: Optimized Polling**

```typescript
// Adaptive polling intervals
const getPollingInterval = (room: Room) => {
  const now = Date.now();
  const lastMove = new Date(room.updatedAt).getTime();
  const timeSinceMove = now - lastMove;

  // Recent activity: 500ms
  if (timeSinceMove < 10_000) return 500;

  // Moderate activity: 1s
  if (timeSinceMove < 60_000) return 1000;

  // Idle: 2s
  if (timeSinceMove < 300_000) return 2000;

  // Very idle: stop polling, show "room inactive" message
  return null;
};
```

**Effort:** 2-3 hours  
**UX Gain:** 6/10 → 7/10  
**Keeps:** MVP timeline on track

### Phase 2: If Validation Succeeds (Week 3-4)

**Add: Pusher for instant feedback**

```typescript
// Keep polling as fallback
// Add Pusher for < 100ms move notifications
// Use free tier (good for 50-100 concurrent users)
```

**Effort:** 3-4 hours  
**UX Gain:** 7/10 → 9/10  
**Cost:** $0 (free tier)

### Phase 3: If Revenue > $2K/mo (Month 2-3)

**Evaluate:** Pusher paid tier vs custom WebSocket

- If Pusher cost < $100/mo: Keep it
- If Pusher cost > $500/mo: Migrate to custom
- Follow SCALING_PLAYBOOK.md decision tree

---

## Implementation Priorities

### Must Have (MVP)

1. ✅ Moves sync between players (already works)
2. ✅ Turn validation (already works)
3. 🔄 Acceptable latency (< 1 second) - **needs improvement**

### Nice to Have (Post-Validation)

- Real-time presence (who's online)
- Instant move feedback
- Optimistic updates with rollback
- Connection status indicators

### Future (If Scaling)

- Custom WebSocket server
- Horizontal scaling
- Geographic regions
- Advanced matchmaking

---

## Cost Projections

### Scenario: 100 Active Users (MVP Success)

- Optimized Polling: $0 (Vercel free tier)
- Pusher Free: $0 (within limits)
- Neon: $0-19/mo

**Total: $0-19/mo**

### Scenario: 1,000 Active Users (Product-Market Fit)

- Optimized Polling: $20/mo (Vercel Pro)
- Pusher: $49-99/mo (need paid tier)
- Neon: $69/mo (Scale plan)

**Total: $138-188/mo**

### Scenario: 10,000 Active Users (Scale Phase)

- Custom WebSocket: $200-400/mo infrastructure
- Database: $200-400/mo
- CDN/Monitoring: $100/mo

**Total: $500-900/mo**

---

## Key Insights

### 1. Polling Isn't Evil for Turn-Based Games

- Chess.com uses polling for casual games
- Turn-based = low update frequency
- 500ms polling feels instant to humans

### 2. Premature WebSocket = Premature Optimization

- Adding 6-8 weeks before validation = bad MVP
- Current polling already works
- Fix the 20% that matters (adaptive intervals)

### 3. Pusher Sweet Spot

- Free tier = perfect for validation phase
- $49/mo = reasonable if revenue > $500/mo
- Easy migration path (just remove, keep polling)

### 4. Database is Real Bottleneck

- Polling vs WebSocket doesn't matter if database is slow
- Neon serverless adds 50-150ms latency
- Need indexes + connection pooling first

---

## Questions for User

Before we proceed with implementation:

1. **Timeline:** Need to launch in 2-3 weeks or flexible?

   - If urgent → Optimized Polling (2 hours)
   - If have 1 week → Pusher (4 hours)

2. **User Expectations:** How real-time should it feel?

   - "Works reliably" → Polling
   - "Feels instant" → Pusher

3. **Future Vision:** Planning to scale or testing idea?

   - Just testing → Don't add dependencies
   - Serious product → Pusher is reasonable

4. **Technical Debt Tolerance:** Okay with "good enough" for MVP?
   - Yes → Polling + optimize later
   - No → Pusher from start

---

## Next Steps

After decision:

1. Create detailed implementation plan
2. Estimate effort breakdown
3. Identify migration path if needed
4. Document testing strategy
5. Plan rollback procedure
