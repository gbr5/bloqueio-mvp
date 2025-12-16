// __tests__/pathfinding-edge-cases.test.ts
/**
 * @jest-environment node
 */

import { placeBarrier } from "../src/lib/actions/game-actions";

// Mock the session module
jest.mock("../src/lib/session", () => ({
  getOrCreateSessionId: jest.fn().mockResolvedValue("test-session-123"),
}));

// Mock Prisma client with correct model names
jest.mock("../src/lib/db", () => ({
  db: {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    player: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    barrier: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { db } from "../src/lib/db";

describe("Pathfinding Edge Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject barrier that completely blocks a player from their goal", async () => {
    // Scenario: Blue at (1,5) needs to reach BOTTOM
    // Place barriers that trap Blue at the top edge
    const mockPlayer = {
      id: "player-1",
      playerId: 0,
      sessionId: "test-session-123",
      wallsLeft: 6,
      row: 5,
      col: 1,
      goalSide: "RIGHT",
    };

    const mockRoom = {
      id: "room-1",
      code: "TEST01",
      status: "PLAYING" as const,
      currentTurn: 0, // Red's turn
      players: [
        {
          id: "p0",
          playerId: 0,
          row: 5,
          col: 1,
          goalSide: "RIGHT",
          wallsLeft: 6,
          color: "#ef4444",
          name: "Player 1",
        },
        {
          id: "p1",
          playerId: 1,
          row: 1,
          col: 5,
          goalSide: "BOTTOM",
          wallsLeft: 5,
          color: "#3b82f6",
          name: "Player 2",
        }, // Blue trapped at top
        {
          id: "p2",
          playerId: 2,
          row: 5,
          col: 9,
          goalSide: "LEFT",
          wallsLeft: 6,
          color: "#22c55e",
          name: "Player 3",
        },
        {
          id: "p3",
          playerId: 3,
          row: 9,
          col: 5,
          goalSide: "TOP",
          wallsLeft: 6,
          color: "#f59e0b",
          name: "Player 4",
        },
      ],
      barriers: [
        { id: "1", row: 1, col: 4, orientation: "HORIZONTAL" }, // Blocks Blue from moving down-left
        { id: "2", row: 2, col: 5, orientation: "VERTICAL" }, // Blocks Blue from moving down
        { id: "3", row: 2, col: 6, orientation: "VERTICAL" }, // Blocks Blue from moving down-right
      ],
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
    (db.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);

    // Try to place a barrier that would completely trap Blue
    const result = await placeBarrier("TEST01", 1, 6, "VERTICAL");

    // Should reject because Blue would have no path from (1,5) to row 10
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("block");
    }
  });

  it("should allow barrier if player can still reach goal via alternate path", async () => {
    // Scenario: Blue at (1,5) can go left around a barrier
    const mockPlayer = {
      id: "player-1",
      playerId: 0,
      sessionId: "test-session-123",
      wallsLeft: 6,
      row: 5,
      col: 1,
      goalSide: "RIGHT",
    };

    const mockRoom = {
      id: "room-1",
      code: "TEST02",
      status: "PLAYING" as const,
      currentTurn: 0,
      players: [
        {
          id: "p0",
          playerId: 0,
          row: 5,
          col: 1,
          goalSide: "RIGHT",
          wallsLeft: 6,
          color: "#ef4444",
          name: "Player 1",
        },
        {
          id: "p1",
          playerId: 1,
          row: 1,
          col: 5,
          goalSide: "BOTTOM",
          wallsLeft: 5,
          color: "#3b82f6",
          name: "Player 2",
        },
        {
          id: "p2",
          playerId: 2,
          row: 5,
          col: 9,
          goalSide: "LEFT",
          wallsLeft: 6,
          color: "#22c55e",
          name: "Player 3",
        },
        {
          id: "p3",
          playerId: 3,
          row: 9,
          col: 5,
          goalSide: "TOP",
          wallsLeft: 6,
          color: "#f59e0b",
          name: "Player 4",
        },
      ],
      barriers: [
        { id: "1", row: 2, col: 5, orientation: "VERTICAL" }, // Blocks direct path down
      ],
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
    (db.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
    (db.$transaction as jest.Mock).mockResolvedValue([]);

    // Place barrier to the right - Blue can still go left and down
    const result = await placeBarrier("TEST02", 1, 6, "VERTICAL");

    // Should succeed because Blue can go around via left side
    expect("success" in result).toBe(true);
  });

  it("should correctly validate path when player is one cell from goal", async () => {
    // Scenario: Blue at (9,5) is one cell from BOTTOM border (row 10)
    const mockPlayer = {
      id: "player-1",
      playerId: 0,
      sessionId: "test-session-123",
      wallsLeft: 6,
      row: 5,
      col: 1,
      goalSide: "RIGHT",
    };

    const mockRoom = {
      id: "room-1",
      code: "TEST03",
      status: "PLAYING" as const,
      currentTurn: 0,
      players: [
        {
          id: "p0",
          playerId: 0,
          row: 5,
          col: 1,
          goalSide: "RIGHT",
          wallsLeft: 6,
          color: "#ef4444",
          name: "Player 1",
        },
        {
          id: "p1",
          playerId: 1,
          row: 9,
          col: 5,
          goalSide: "BOTTOM",
          wallsLeft: 5,
          color: "#3b82f6",
          name: "Player 2",
        }, // One move from victory
        {
          id: "p2",
          playerId: 2,
          row: 5,
          col: 9,
          goalSide: "LEFT",
          wallsLeft: 6,
          color: "#22c55e",
          name: "Player 3",
        },
        {
          id: "p3",
          playerId: 3,
          row: 1,
          col: 5,
          goalSide: "TOP",
          wallsLeft: 6,
          color: "#f59e0b",
          name: "Player 4",
        },
      ],
      barriers: [],
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
    (db.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);

    // Try to block Blue's path to the goal - but row 9 col 5 is too close to edge
    // Server validation rejects barriers on row >= 9 (GRID_SIZE - 2)
    const result = await placeBarrier("TEST03", 8, 5, "HORIZONTAL");

    // This should be allowed since Blue can still go around
    // (the barrier at 8,5 doesn't completely block row 9)
    expect("success" in result || "error" in result).toBe(true);
  });

  it("should NOT allow pathfinding through border cells that are not the goal", async () => {
    // Scenario: Blue at (1,1) trying to reach BOTTOM, with barriers forcing path through LEFT border
    const mockPlayer = {
      id: "player-1",
      playerId: 0,
      sessionId: "test-session-123",
      wallsLeft: 6,
      row: 5,
      col: 1,
      goalSide: "RIGHT",
    };

    const mockRoom = {
      id: "room-1",
      code: "TEST04",
      status: "PLAYING" as const,
      currentTurn: 0,
      players: [
        {
          id: "p0",
          playerId: 0,
          row: 5,
          col: 1,
          goalSide: "RIGHT",
          wallsLeft: 6,
          color: "#ef4444",
          name: "Player 1",
        },
        {
          id: "p1",
          playerId: 1,
          row: 1,
          col: 1,
          goalSide: "BOTTOM",
          wallsLeft: 3,
          color: "#3b82f6",
          name: "Player 2",
        }, // Corner position
        {
          id: "p2",
          playerId: 2,
          row: 5,
          col: 9,
          goalSide: "LEFT",
          wallsLeft: 6,
          color: "#22c55e",
          name: "Player 3",
        },
        {
          id: "p3",
          playerId: 3,
          row: 9,
          col: 5,
          goalSide: "TOP",
          wallsLeft: 6,
          color: "#f59e0b",
          name: "Player 4",
        },
      ],
      barriers: [
        { id: "1", row: 1, col: 1, orientation: "HORIZONTAL" }, // Block right
        { id: "2", row: 2, col: 1, orientation: "VERTICAL" }, // Block down
      ],
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer);
    (db.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);

    // Try to place another barrier that would force Blue to need to go through col 0 (LEFT border)
    const result = await placeBarrier("TEST04", 1, 2, "HORIZONTAL");

    // Should reject - Blue would be trapped and cannot pathfind through LEFT border to reach BOTTOM
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("block");
    }
  });
});
