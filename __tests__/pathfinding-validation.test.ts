/**
 * Test suite for pathfinding validation
 * Ensures no player can be completely blocked from reaching their goal
 */

import { describe, test, expect } from "@jest/globals";

type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

interface Player {
  id: number;
  row: number;
  col: number;
  goalSide: GoalSide;
  name: string;
}

interface Barrier {
  row: number;
  col: number;
  orientation: "H" | "V";
  id: string;
}

const GRID_SIZE = 11;

const edgeKey = (r1: number, c1: number, r2: number, c2: number): string => {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    [r1, r2] = [r2, r1];
    [c1, c2] = [c2, c1];
  }
  return `${r1},${c1}-${r2},${c2}`;
};

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

// BFS pathfinding - matches server implementation
const hasPathToGoal = (
  playerRow: number,
  playerCol: number,
  goalSide: GoalSide,
  blockedEdges: Set<string>
): boolean => {
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[playerRow, playerCol]];
  visited.add(`${playerRow},${playerCol}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;

    // Check if reached goal BORDER (row/col 0 or 10)
    if (goalSide === "TOP" && r === 0) return true;
    if (goalSide === "BOTTOM" && r === GRID_SIZE - 1) return true;
    if (goalSide === "LEFT" && c === 0) return true;
    if (goalSide === "RIGHT" && c === GRID_SIZE - 1) return true;

    // Explore 4 neighbors
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];

    for (const [nr, nc] of neighbors) {
      // Check bounds (all cells: 0 to GRID_SIZE-1)
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) {
        continue;
      }

      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;

      // Check if edge is blocked
      const edge = edgeKey(r, c, nr, nc);
      if (blockedEdges.has(edge)) continue;

      visited.add(key);
      queue.push([nr, nc]);
    }
  }

  return false;
};

describe("Pathfinding Validation - Basic Cases", () => {
  test("should find path when no barriers exist", () => {
    const player: Player = {
      id: 0,
      row: 5,
      col: 5,
      goalSide: "TOP",
      name: "Player 1",
    };

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      new Set()
    );
    expect(result).toBe(true);
  });

  test("should find path with single barrier not blocking", () => {
    const player: Player = {
      id: 0,
      row: 5,
      col: 5,
      goalSide: "TOP",
      name: "Player 1",
    };

    const barriers: Barrier[] = [{ row: 3, col: 7, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(true);
  });

  test("should detect when player is completely blocked - TOP goal", () => {
    const player: Player = {
      id: 0,
      row: 5,
      col: 5,
      goalSide: "TOP",
      name: "Player 1",
    };

    // Create a box around player
    const barriers: Barrier[] = [
      { row: 4, col: 4, orientation: "H", id: "1" }, // Top wall
      { row: 4, col: 6, orientation: "H", id: "2" }, // Top wall continuation
      { row: 5, col: 4, orientation: "V", id: "3" }, // Left wall
      { row: 5, col: 6, orientation: "V", id: "4" }, // Right wall
      { row: 6, col: 4, orientation: "H", id: "5" }, // Bottom wall
      { row: 6, col: 6, orientation: "H", id: "6" }, // Bottom wall continuation
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(false);
  });
});

describe("Pathfinding Validation - RIGHT Goal (Blue Player Scenario)", () => {
  test("should find path to RIGHT border when barriers dont block", () => {
    const player: Player = {
      id: 1,
      row: 6,
      col: 8,
      goalSide: "RIGHT",
      name: "Blue",
    };

    const barriers: Barrier[] = [{ row: 5, col: 7, orientation: "V", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(true);
  });

  test("should detect complete blocking to RIGHT border", () => {
    const player: Player = {
      id: 1,
      row: 6,
      col: 7,
      goalSide: "RIGHT",
      name: "Blue",
    };

    // Create barriers blocking all paths to right border
    const barriers: Barrier[] = [
      // Vertical wall from top to bottom at col 7-8
      { row: 1, col: 7, orientation: "V", id: "1" },
      { row: 2, col: 7, orientation: "V", id: "2" },
      { row: 3, col: 7, orientation: "V", id: "3" },
      { row: 4, col: 7, orientation: "V", id: "4" },
      { row: 5, col: 7, orientation: "V", id: "5" },
      { row: 6, col: 7, orientation: "V", id: "6" },
      { row: 7, col: 7, orientation: "V", id: "7" },
      { row: 8, col: 7, orientation: "V", id: "8" },
      { row: 9, col: 7, orientation: "V", id: "9" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(false);
  });

  test("should find alternative path when direct route is blocked", () => {
    const player: Player = {
      id: 1,
      row: 5,
      col: 5,
      goalSide: "RIGHT",
      name: "Blue",
    };

    // Block direct path but leave route via top or bottom
    const barriers: Barrier[] = [
      { row: 4, col: 6, orientation: "V", id: "1" },
      { row: 5, col: 6, orientation: "V", id: "2" },
      { row: 6, col: 6, orientation: "V", id: "3" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(true); // Can go around via top or bottom
  });
});

describe("Pathfinding Validation - All Goal Sides", () => {
  test("should validate path to BOTTOM border", () => {
    const player: Player = {
      id: 0,
      row: 5,
      col: 5,
      goalSide: "BOTTOM",
      name: "Player",
    };

    const barriers: Barrier[] = [
      // Horizontal wall blocking bottom
      { row: 8, col: 1, orientation: "H", id: "1" },
      { row: 8, col: 3, orientation: "H", id: "2" },
      { row: 8, col: 5, orientation: "H", id: "3" },
      { row: 8, col: 7, orientation: "H", id: "4" },
      { row: 8, col: 9, orientation: "H", id: "5" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(false);
  });

  test("should validate path to LEFT border", () => {
    const player: Player = {
      id: 2,
      row: 5,
      col: 5,
      goalSide: "LEFT",
      name: "Player",
    };

    const barriers: Barrier[] = [
      // Vertical wall blocking left
      { row: 1, col: 2, orientation: "V", id: "1" },
      { row: 2, col: 2, orientation: "V", id: "2" },
      { row: 3, col: 2, orientation: "V", id: "3" },
      { row: 4, col: 2, orientation: "V", id: "4" },
      { row: 5, col: 2, orientation: "V", id: "5" },
      { row: 6, col: 2, orientation: "V", id: "6" },
      { row: 7, col: 2, orientation: "V", id: "7" },
      { row: 8, col: 2, orientation: "V", id: "8" },
      { row: 9, col: 2, orientation: "V", id: "9" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(false);
  });
});

describe("Pathfinding Validation - Multi-Player Scenarios", () => {
  test("should validate all players can reach their goals", () => {
    const players: Player[] = [
      { id: 0, row: 2, col: 5, goalSide: "TOP", name: "Red" },
      { id: 1, row: 5, col: 8, goalSide: "RIGHT", name: "Blue" },
      { id: 2, row: 8, col: 5, goalSide: "BOTTOM", name: "Green" },
      { id: 3, row: 5, col: 2, goalSide: "LEFT", name: "Yellow" },
    ];

    // Barriers that don't block anyone
    const barriers: Barrier[] = [
      { row: 4, col: 4, orientation: "H", id: "1" },
      { row: 6, col: 6, orientation: "V", id: "2" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    for (const player of players) {
      const result = hasPathToGoal(
        player.row,
        player.col,
        player.goalSide,
        blockedEdges
      );
      expect(result).toBe(true);
    }
  });

  test("should detect when one player is blocked among many", () => {
    const players: Player[] = [
      { id: 0, row: 2, col: 5, goalSide: "TOP", name: "Red" },
      { id: 1, row: 5, col: 8, goalSide: "RIGHT", name: "Blue" }, // Will be blocked
      { id: 2, row: 8, col: 5, goalSide: "BOTTOM", name: "Green" },
      { id: 3, row: 5, col: 2, goalSide: "LEFT", name: "Yellow" },
    ];

    // Block only Blue player (RIGHT goal)
    const barriers: Barrier[] = [
      { row: 1, col: 8, orientation: "V", id: "1" },
      { row: 2, col: 8, orientation: "V", id: "2" },
      { row: 3, col: 8, orientation: "V", id: "3" },
      { row: 4, col: 8, orientation: "V", id: "4" },
      { row: 5, col: 8, orientation: "V", id: "5" },
      { row: 6, col: 8, orientation: "V", id: "6" },
      { row: 7, col: 8, orientation: "V", id: "7" },
      { row: 8, col: 8, orientation: "V", id: "8" },
      { row: 9, col: 8, orientation: "V", id: "9" },
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const bluePlayer = players[1];
    const result = hasPathToGoal(
      bluePlayer.row,
      bluePlayer.col,
      bluePlayer.goalSide,
      blockedEdges
    );
    expect(result).toBe(false);

    // Others should still have paths
    expect(
      hasPathToGoal(
        players[0].row,
        players[0].col,
        players[0].goalSide,
        blockedEdges
      )
    ).toBe(true);
    expect(
      hasPathToGoal(
        players[2].row,
        players[2].col,
        players[2].goalSide,
        blockedEdges
      )
    ).toBe(true);
    expect(
      hasPathToGoal(
        players[3].row,
        players[3].col,
        players[3].goalSide,
        blockedEdges
      )
    ).toBe(true);
  });
});

describe("Edge Cases", () => {
  test("should handle player already at goal border", () => {
    const player: Player = {
      id: 0,
      row: 0,
      col: 5,
      goalSide: "TOP",
      name: "Winner",
    };

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      new Set()
    );
    expect(result).toBe(true);
  });

  test("should handle player one step from goal", () => {
    const player: Player = {
      id: 0,
      row: 1,
      col: 5,
      goalSide: "TOP",
      name: "Almost There",
    };

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      new Set()
    );
    expect(result).toBe(true);
  });

  test("should handle complex maze with valid path", () => {
    const player: Player = {
      id: 0,
      row: 5,
      col: 5,
      goalSide: "TOP",
      name: "Maze Runner",
    };

    // Create a maze but with path to top
    const barriers: Barrier[] = [
      { row: 3, col: 4, orientation: "V", id: "1" },
      { row: 3, col: 6, orientation: "V", id: "2" },
      { row: 4, col: 3, orientation: "H", id: "3" },
      { row: 4, col: 7, orientation: "H", id: "4" },
      // Leave gap at col 5 for path to top
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    const result = hasPathToGoal(
      player.row,
      player.col,
      player.goalSide,
      blockedEdges
    );
    expect(result).toBe(true);
  });
});
