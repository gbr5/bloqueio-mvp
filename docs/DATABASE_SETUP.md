# Database Setup Quick Reference

## Local Development (Docker)

**Start database:**

```bash
docker compose up -d
```

**Stop database:**

```bash
docker compose down
```

**View logs:**

```bash
docker compose logs -f postgres
```

**Test connection:**

```bash
npx tsx scripts/test-db.ts
```

**Access database directly:**

```bash
docker exec -it bloqueio-db psql -U bloqueio -d bloqueio
```

---

## Production (Neon via Vercel)

**Database:** `neon-yellow-flower`  
**Region:** Auto-selected by Vercel  
**Access:** Via Neon Console in Vercel Storage tab

**Connection:**

- `DATABASE_URL` is auto-injected by Vercel in production
- No manual configuration needed

**Run SQL:**

1. Go to Vercel Dashboard → Storage → Neon
2. Click "Open in Neon Console"
3. Navigate to SQL Editor
4. Run queries

---

## Database Schema

See [`scripts/init-db.sql`](../scripts/init-db.sql) for complete schema.

**Main Table: `game_rooms`**

```sql
CREATE TABLE game_rooms (
  id TEXT PRIMARY KEY,              -- 6-digit room code
  status TEXT NOT NULL,              -- 'waiting' | 'playing' | 'finished'
  host_player_id INTEGER NOT NULL,   -- Player 0-3
  current_player_id INTEGER NOT NULL, -- Current turn
  game_state JSONB NOT NULL,         -- Serialized game state
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Common Tasks

### Create Test Room

```sql
INSERT INTO game_rooms (id, status, host_player_id, current_player_id, game_state)
VALUES ('ABC123', 'waiting', 0, 0, '{"test": true}');
```

### Query Active Rooms

```sql
SELECT id, status, created_at
FROM game_rooms
WHERE status != 'finished'
ORDER BY created_at DESC;
```

### Clean Up Old Games

```sql
DELETE FROM game_rooms
WHERE created_at < NOW() - INTERVAL '7 days'
  AND status = 'finished';
```

---

## Driver Usage

**Local (postgres.js):**

```typescript
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!);
const rooms = await sql`SELECT * FROM game_rooms`;
await sql.end();
```

**Production (Neon serverless - for Vercel Edge Functions):**

```typescript
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rooms = await sql`SELECT * FROM game_rooms`;
// No need to close connection
```

**Important:** Use `postgres.js` for local dev and Neon serverless driver only for production Edge Functions.

---

## Troubleshooting

**Port 5432 already in use:**

- We use port 5433 to avoid conflicts
- If still failing: `docker ps` to see what's running

**Connection refused:**

- Check Docker is running: `docker ps`
- Check database is healthy: `docker compose ps`
- Restart: `docker compose restart`

**Schema out of sync:**

- Drop and recreate: `docker compose down -v && docker compose up -d`
- This destroys local data (safe for development)

**Production not connecting:**

- Verify `DATABASE_URL` in Vercel Environment Variables
- Check Neon dashboard for database status
- Ensure Vercel integration is active
