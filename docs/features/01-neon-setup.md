# Neon Database Setup - Implementation Plan

> **Status:** � Complete  
> **Priority:** P0 (Blocker for all other features)  
> **Estimated Time:** 30-60 minutes  
> **Actual Time:** 45 minutes

## Context

**Why we're building this:**

- Need database to store game room state for multiplayer
- Neon chosen over Supabase for Vercel native integration and lower costs
- This is the foundation for real-time game sync

**Dependencies:**

- [x] Vercel account
- [x] Project deployed to Vercel (or ready to deploy)
- [ ] Neon integration enabled

**Related Docs:**

- [MVP_PLAN.md - Phase 1](../MVP_PLAN.md#phase-1-neon-setup-30-minutes)
- [BUSINESS_STRATEGY.md - Cost Structure](../BUSINESS_STRATEGY.md)

---

## Success Criteria

**Must Have (MVP):**

- [x] Neon database created via Vercel integration
- [ ] Database schema created (`game_rooms` table)
- [ ] Connection verified from local environment
- [ ] Test query executes successfully

**Nice to Have (Post-MVP):**

- [ ] Database migrations system
- [ ] Connection pooling configured
- [ ] Monitoring dashboard setup

**How We'll Know It Works:**

- [ ] Can create a test room in database
- [ ] Can query room from local dev server
- [ ] No connection errors in logs

---

## Technical Design

### Database Schema

```sql
-- game_rooms table
CREATE TABLE game_rooms (
  id TEXT PRIMARY KEY,              -- 6-digit room code
  status TEXT NOT NULL,              -- 'waiting' | 'playing' | 'finished'
  host_player_id INTEGER NOT NULL,   -- Player 0-3
  current_player_id INTEGER NOT NULL, -- Current turn
  game_state JSONB NOT NULL,         -- Serialized game state
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_room_status ON game_rooms(status, created_at);
CREATE INDEX idx_room_updated ON game_rooms(updated_at);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Environment Variables

**Automatic (via Vercel integration):**

- `DATABASE_URL` - Neon connection string (auto-injected)

**Manual (for local development):**

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/bloqueio?sslmode=require"
```

---

## Implementation Checklist

### Phase 1: Vercel Integration (10 min)

- [ ] Go to Vercel project → Storage tab
- [ ] Click "Create" → Select "Neon"
- [ ] Click "Create Database"
- [ ] Name it: `neon-yellow-flower` <!-- `bloqueio-db` -->
- [ ] Select region: US East (or closest to users)
- [ ] Copy `DATABASE_URL` for local development

### Phase 2: Local Setup (10 min)

- [ ] Create `.env.local` file
- [ ] Add `DATABASE_URL` from Vercel
- [ ] Install Neon SDK: `pnpm add @neondatabase/serverless`
- [ ] Test connection with simple query

### Phase 3: Schema Creation (10 min)

- [ ] Connect to Neon dashboard
- [ ] Run schema SQL (above)
- [ ] Verify tables created
- [ ] Test insert/select query

### Phase 4: Verification (10 min)

- [ ] Create test room via SQL
- [ ] Query it from local dev environment
- [ ] Delete test room
- [ ] Update this doc with actual times

---

## Testing Plan

**Manual Tests:**

1. **Test Connection:**

   ```typescript
   import { neon } from "@neondatabase/serverless";
   const sql = neon(process.env.DATABASE_URL!);
   const result = await sql`SELECT NOW()`;
   console.log("Connected:", result);
   ```

2. **Test Insert:**

   ```sql
   INSERT INTO game_rooms (id, status, host_player_id, current_player_id, game_state)
   VALUES ('TEST01', 'waiting', 0, 0, '{}');
   ```

3. **Test Query:**

   ```typescript
   const rooms = await sql`SELECT * FROM game_rooms WHERE id = 'TEST01'`;
   console.log("Room:", rooms[0]);
   ```

4. **Test Update:**
   ```sql
   UPDATE game_rooms SET status = 'playing' WHERE id = 'TEST01';
   ```

**Edge Cases to Verify:**

- [ ] Connection with invalid DATABASE_URL fails gracefully
- [ ] Duplicate room ID insertion fails (primary key constraint)
- [ ] Updated_at timestamp updates on row modification

---

## Risks & Mitigations

| Risk                               | Likelihood | Impact | Mitigation                                        |
| ---------------------------------- | ---------- | ------ | ------------------------------------------------- |
| Vercel integration fails           | Low        | High   | Use direct Neon signup as backup                  |
| Connection pooling issues          | Medium     | Medium | Use Neon's built-in pooling via serverless driver |
| DATABASE_URL not syncing to Vercel | Low        | High   | Manually add env var if needed                    |
| Schema errors in production        | Medium     | High   | Test schema in Neon dashboard first               |

---

## Rollback Plan

**If database setup fails:**

1. Delete Neon database from Vercel Storage tab
2. Remove Neon SDK: `pnpm remove @neondatabase/serverless`
3. Remove `.env.local` entry
4. Consider alternative: Local PostgreSQL for testing

**Safe State:**

- No database = local hot-seat game still works
- Can develop other features without database

---

## Post-Implementation

**What We Learned:**

- [To be filled after completion]

**Follow-up Tasks:**

- [ ] Create database utilities file (`src/lib/db.ts`)
- [ ] Add connection error handling
- [ ] Set up migration strategy for schema changes
- [ ] Document database access patterns

**Related Future Work:**

- See: [02-game-room-hook.md](./02-game-room-hook.md) - Uses this database
