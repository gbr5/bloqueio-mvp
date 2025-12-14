-- Initialize bloqueio database schema
-- This runs automatically when Docker container first starts

-- game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY,              -- 6-digit room code
  status TEXT NOT NULL,              -- 'waiting' | 'playing' | 'finished'
  host_player_id INTEGER NOT NULL,   -- Player 0-3
  current_player_id INTEGER NOT NULL, -- Current turn
  game_state JSONB NOT NULL,         -- Serialized game state
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_room_status ON game_rooms(status, created_at);
CREATE INDEX IF NOT EXISTS idx_room_updated ON game_rooms(updated_at);

-- Update trigger for updated_at
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

-- Insert test data for local development
INSERT INTO game_rooms (id, status, host_player_id, current_player_id, game_state)
VALUES ('TEST01', 'waiting', 0, 0, '{"test": true}')
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Bloqueio database initialized successfully!';
END $$;
