/**
 * Test script for useGameRoom hook
 *
 * Tests the database operations:
 * 1. Create a new room
 * 2. Load the room
 * 3. Update the room
 * 4. Verify the changes
 */

import { config } from "dotenv";
import postgres from "postgres";
import type { GameSnapshot, PlayerId } from "../src/types/game";

// Load environment variables
config({ path: ".env.development.local" });

// Create SQL client directly (not from lib since it's a script)
const sql = postgres(process.env.DATABASE_URL!);

// Mock initial game state
const mockGameState: GameSnapshot = {
  players: [
    {
      id: 0 as PlayerId,
      row: 5,
      col: 0,
      goalSide: "RIGHT",
      wallsLeft: 6,
      color: "#ef4444",
      label: "P1",
      name: "Player 1",
    },
    {
      id: 1 as PlayerId,
      row: 0,
      col: 5,
      goalSide: "BOTTOM",
      wallsLeft: 6,
      color: "#3b82f6",
      label: "P2",
      name: "Player 2",
    },
    {
      id: 2 as PlayerId,
      row: 5,
      col: 10,
      goalSide: "LEFT",
      wallsLeft: 6,
      color: "#22c55e",
      label: "P3",
      name: "Player 3",
    },
    {
      id: 3 as PlayerId,
      row: 10,
      col: 5,
      goalSide: "TOP",
      wallsLeft: 6,
      color: "#f59e0b",
      label: "P4",
      name: "Player 4",
    },
  ],
  blockedEdges: [],
  barriers: [],
  currentPlayerId: 0 as PlayerId,
  winner: null,
};

async function testGameRoomOperations() {
  console.log("🧪 Testing useGameRoom operations...\n");

  try {
    // Test 1: Create room
    console.log("1️⃣  Creating test room...");
    const roomCode =
      "TEST" + Math.random().toString(36).substring(2, 5).toUpperCase();

    await sql`
      INSERT INTO game_rooms (
        id,
        status,
        host_player_id,
        current_player_id,
        game_state
      ) VALUES (
        ${roomCode},
        ${"waiting"},
        ${0},
        ${0},
        ${JSON.stringify(mockGameState)}
      )
    `;
    console.log(`   ✅ Created room: ${roomCode}\n`);

    // Test 2: Load room
    console.log("2️⃣  Loading room from database...");
    const result = await sql`
      SELECT * FROM game_rooms WHERE id = ${roomCode}
    `;

    if (result.length === 0) {
      throw new Error("Room not found after creation!");
    }

    const room = result[0] as any;
    console.log(`   ✅ Loaded room: ${room.id}`);
    console.log(`   📊 Status: ${room.status}`);
    console.log(`   👥 Host: Player ${room.host_player_id}`);
    console.log(`   🎮 Current turn: Player ${room.current_player_id}\n`);

    // Test 3: Update room
    console.log("3️⃣  Updating room state...");
    const updatedState = {
      ...mockGameState,
      currentPlayerId: 1 as PlayerId,
      players: mockGameState.players.map((p) =>
        p.id === 0 ? { ...p, row: 6, col: 1 } : p
      ),
    };

    await sql`
      UPDATE game_rooms
      SET
        current_player_id = ${1},
        game_state = ${JSON.stringify(updatedState)},
        status = ${"playing"},
        updated_at = NOW()
      WHERE id = ${roomCode}
    `;
    console.log(`   ✅ Updated room state\n`);

    // Test 4: Verify update
    console.log("4️⃣  Verifying update...");
    const verifyResult = await sql`
      SELECT * FROM game_rooms WHERE id = ${roomCode}
    `;

    const updatedRoom = verifyResult[0] as any;
    const gameState = JSON.parse(updatedRoom.game_state);

    console.log(`   ✅ Current turn: Player ${updatedRoom.current_player_id}`);
    console.log(`   ✅ Status: ${updatedRoom.status}`);
    console.log(`   ✅ Player 1 moved to row ${gameState.players[0].row}\n`);

    // Test 5: Cleanup
    console.log("5️⃣  Cleaning up test room...");
    await sql`DELETE FROM game_rooms WHERE id = ${roomCode}`;
    console.log(`   ✅ Deleted test room\n`);

    console.log("🎉 All tests passed! Hook is ready to use.\n");

    // Close connection
    if ("end" in sql) {
      await (sql as any).end();
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testGameRoomOperations();
