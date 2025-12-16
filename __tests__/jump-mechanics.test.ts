/**
 * Test suite for pawn jump mechanics (Quoridor rules)
 * Tests straight jumps and side-step jumps
 */

import { describe, test, expect } from "@jest/globals";

type PlayerId = 0 | 1 | 2 | 3;
type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

interface Player {
  id: PlayerId;
  row: number;
  col: number;
  goalSide: GoalSide;
  wallsLeft: number;
  color: string;
  label: string;
  name: string;
}

interface Barrier {
  row: number;
  col: number;
  orientation: "H" | "V";
  id: string;
}

// Helper to normalize edge keys
const edgeKey = (r1: number, c1: number, r2: number, c2: number): string => {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    [r1, r2] = [r2, r1];
    [c1, c2] = [c2, c1];
  }
  return `${r1},${c1}-${r2},${c2}`;
};

// Compute blocked edges from barriers
const computeBlockedEdges = (barriers: Barrier[]): Set<string> => {
  const edges = new Set<string>();
  for (const b of barriers) {
    if (b.orientation === "H") {
      edges.add(edgeKey(b.row, b.col, b.row + 1, b.col));
      edges.add(edgeKey(b.row, b.col + 1, b.row + 1, b.col + 1));
    } else {
      edges.add(edgeKey(b.row, b.col, b.row, b.col + 1));
      edges.add(edgeKey(b.row + 1, b.col, b.row + 1, b.col + 1));
    }
  }
  return edges;
};

// Simplified jump validation logic (based on game.tsx canPawnMoveTo)
const canJumpTo = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  players: Player[],
  blockedEdges: Set<string>
): { canJump: boolean; reason?: string } => {
  const GRID_SIZE = 11;

  // Check if target is in bounds
  if (toRow < 0 || toRow >= GRID_SIZE || toCol < 0 || toCol >= GRID_SIZE) {
    return { canJump: false, reason: "Out of bounds" };
  }

  // Check if another player is at target
  const occupiedByPlayer = players.some(
    (p) => p.row === toRow && p.col === toCol
  );
  if (occupiedByPlayer) {
    return { canJump: false, reason: "Cell occupied by player" };
  }

  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  const manhattan = rowDiff + colDiff;

  // Must be manhattan distance 2 for a jump
  if (manhattan !== 2) {
    return { canJump: false, reason: "Not a valid jump distance" };
  }

  // Check all 4 neighbors for jump opportunities
  const neighbors = [
    { dr: -1, dc: 0, name: "UP" },
    { dr: 1, dc: 0, name: "DOWN" },
    { dr: 0, dc: -1, name: "LEFT" },
    { dr: 0, dc: 1, name: "RIGHT" },
  ];

  for (const { dr, dc } of neighbors) {
    const nRow = fromRow + dr;
    const nCol = fromCol + dc;

    // Check if there's a player at this neighbor
    const playerAtNeighbor = players.find(
      (p) => p.row === nRow && p.col === nCol
    );
    if (!playerAtNeighbor) continue;

    // Check if we can move to this neighbor (not blocked by barrier)
    const edge = edgeKey(fromRow, fromCol, nRow, nCol);
    if (blockedEdges.has(edge)) continue;

    // STRAIGHT JUMP: Jump over player in same direction
    const straightRow = fromRow + 2 * dr;
    const straightCol = fromCol + 2 * dc;
    if (straightRow === toRow && straightCol === toCol) {
      // Check if path to straight jump is blocked
      const straightEdge = edgeKey(nRow, nCol, straightRow, straightCol);
      if (!blockedEdges.has(straightEdge)) {
        // Check if straight landing cell is occupied
        const straightOccupied = players.some(
          (p) => p.row === straightRow && p.col === straightCol
        );
        if (!straightOccupied) {
          return { canJump: true };
        }
      }
    }

    // SIDE-STEP JUMP: Jump to the side if straight is blocked
    const straightRow2 = fromRow + 2 * dr;
    const straightCol2 = fromCol + 2 * dc;
    const straightEdge2 = edgeKey(nRow, nCol, straightRow2, straightCol2);

    // Only allow side-step if straight path is blocked OR straight cell is occupied
    const straightBlocked = blockedEdges.has(straightEdge2);
    const straightOccupied = players.some(
      (p) => p.row === straightRow2 && p.col === straightCol2
    );

    if (straightBlocked || straightOccupied) {
      // Check perpendicular directions from the jumped player
      const perpendiculars = neighbors.filter(
        (n) =>
          Math.abs(n.dr) !== Math.abs(dr) || Math.abs(n.dc) !== Math.abs(dc)
      );

      for (const { dr: pdr, dc: pdc } of perpendiculars) {
        const sideRow = nRow + pdr;
        const sideCol = nCol + pdc;

        if (sideRow === toRow && sideCol === toCol) {
          // Check if side-step path is blocked
          const sideEdge = edgeKey(nRow, nCol, sideRow, sideCol);
          if (!blockedEdges.has(sideEdge)) {
            return { canJump: true };
          }
        }
      }
    }
  }

  return { canJump: false, reason: "No valid jump path found" };
};

describe("Straight Jump Mechanics", () => {
  test("should allow jump over player UP", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const result = canJumpTo(5, 5, 3, 5, players, new Set());
    expect(result.canJump).toBe(true);
  });

  test("should allow jump over player DOWN", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 6,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const result = canJumpTo(5, 5, 7, 5, players, new Set());
    expect(result.canJump).toBe(true);
  });

  test("should allow jump over player LEFT", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "LEFT",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 5,
        col: 4,
        goalSide: "RIGHT",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const result = canJumpTo(5, 5, 5, 3, players, new Set());
    expect(result.canJump).toBe(true);
  });

  test("should allow jump over player RIGHT", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "LEFT",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 5,
        col: 6,
        goalSide: "RIGHT",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const result = canJumpTo(5, 5, 5, 7, players, new Set());
    expect(result.canJump).toBe(true);
  });

  test("should reject jump when no player to jump over", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
    ];

    const result = canJumpTo(5, 5, 3, 5, players, new Set());
    expect(result.canJump).toBe(false);
  });

  test("should reject jump when barrier blocks path to jumped player", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const barriers: Barrier[] = [{ row: 4, col: 5, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = canJumpTo(5, 5, 3, 5, players, blockedEdges);
    expect(result.canJump).toBe(false);
  });

  test("should reject jump when barrier blocks landing cell", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const barriers: Barrier[] = [{ row: 3, col: 5, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = canJumpTo(5, 5, 3, 5, players, blockedEdges);
    expect(result.canJump).toBe(false);
  });
});

describe("Side-Step Jump Mechanics", () => {
  test("should allow side-step LEFT when straight jump is blocked by barrier", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    // Barrier blocks straight jump (3,5)
    const barriers: Barrier[] = [{ row: 3, col: 5, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    // Should allow side-step to (4,4) - LEFT of jumped player
    const result = canJumpTo(5, 5, 4, 4, players, blockedEdges);
    expect(result.canJump).toBe(true);
  });

  test("should allow side-step RIGHT when straight jump is blocked by barrier", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const barriers: Barrier[] = [{ row: 3, col: 5, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    // Should allow side-step to (4,6) - RIGHT of jumped player
    const result = canJumpTo(5, 5, 4, 6, players, blockedEdges);
    expect(result.canJump).toBe(true);
  });

  test("should reject side-step when side path is blocked by barrier", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const barriers: Barrier[] = [
      { row: 3, col: 5, orientation: "H", id: "1" }, // Blocks straight
      { row: 4, col: 4, orientation: "V", id: "2" }, // Blocks left side-step
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = canJumpTo(5, 5, 4, 4, players, blockedEdges);
    expect(result.canJump).toBe(false);
  });

  test("should allow side-step when straight landing cell is occupied", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
      {
        id: 2,
        row: 3,
        col: 5,
        goalSide: "LEFT",
        wallsLeft: 6,
        color: "green",
        label: "P3",
        name: "Player 3",
      },
    ];

    // Straight jump blocked by player at (3,5), should allow side-step
    const result = canJumpTo(5, 5, 4, 4, players, new Set());
    expect(result.canJump).toBe(true);
  });

  test("should handle complex scenario with multiple barriers", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    const barriers: Barrier[] = [
      { row: 3, col: 5, orientation: "H", id: "1" }, // Blocks straight
      { row: 4, col: 4, orientation: "V", id: "2" }, // Blocks left side-step
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    // Left side-step blocked, but right should work
    const resultRight = canJumpTo(5, 5, 4, 6, players, blockedEdges);
    expect(resultRight.canJump).toBe(true);

    const resultLeft = canJumpTo(5, 5, 4, 4, players, blockedEdges);
    expect(resultLeft.canJump).toBe(false);
  });
});

describe("Edge Cases", () => {
  test("should reject jump to occupied cell", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 4,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
      {
        id: 2,
        row: 3,
        col: 5,
        goalSide: "LEFT",
        wallsLeft: 6,
        color: "green",
        label: "P3",
        name: "Player 3",
      },
    ];

    const result = canJumpTo(5, 5, 3, 5, players, new Set());
    expect(result.canJump).toBe(false);
  });

  test("should reject jump out of bounds", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 1,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
      {
        id: 1,
        row: 0,
        col: 5,
        goalSide: "BOTTOM",
        wallsLeft: 6,
        color: "blue",
        label: "P2",
        name: "Player 2",
      },
    ];

    // Would jump to row -1 (out of bounds)
    const result = canJumpTo(1, 5, -1, 5, players, new Set());
    expect(result.canJump).toBe(false);
  });

  test("should handle diagonal movement (manhattan=2) correctly", () => {
    const players: Player[] = [
      {
        id: 0,
        row: 5,
        col: 5,
        goalSide: "TOP",
        wallsLeft: 6,
        color: "red",
        label: "P1",
        name: "Player 1",
      },
    ];

    // Diagonal move (manhattan=2) without adjacent player should fail
    const result = canJumpTo(5, 5, 4, 4, players, new Set());
    expect(result.canJump).toBe(false);
  });
});
