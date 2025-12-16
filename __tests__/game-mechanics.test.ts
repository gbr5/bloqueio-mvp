/**
 * Comprehensive test suite for Bloqueio game mechanics
 * Tests barrier placement, movement rules, and edge cases
 */

import { describe, test, expect } from "@jest/globals";

// Mock game state types (matching src/types/game.ts)
// type PlayerId = 0 | 1 | 2 | 3;
// type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";
// type Mode = "move" | "wall";

// interface Player {
//   id: PlayerId;
//   row: number;
//   col: number;
//   goalSide: GoalSide;
//   wallsLeft: number;
//   color: string;
//   label: string;
//   name: string;
// }

interface Barrier {
  row: number;
  col: number;
  orientation: "H" | "V";
  id: string;
}

// Helper function to normalize edge keys (from game.tsx)
const edgeKey = (r1: number, c1: number, r2: number, c2: number): string => {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    [r1, r2] = [r2, r1];
    [c1, c2] = [c2, c1];
  }
  return `${r1},${c1}-${r2},${c2}`;
};

// Helper to compute blocked edges from barriers
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

// Helper to check barrier validity (matching server logic)
const isValidBarrierPlacement = (
  row: number,
  col: number,
  orientation: "H" | "V",
  existingBarriers: Barrier[]
): { valid: boolean; reason?: string } => {
  const GRID_SIZE = 11;

  // 1. Border check
  if (row === 0 || row >= GRID_SIZE - 2 || col === 0 || col >= GRID_SIZE - 2) {
    return { valid: false, reason: "Cannot place on border" };
  }

  // 2. Exact duplicate check
  const exactDuplicate = existingBarriers.some(
    (b) => b.row === row && b.col === col && b.orientation === orientation
  );
  if (exactDuplicate) {
    return { valid: false, reason: "Exact duplicate barrier" };
  }

  // 3. Crossing check (X pattern)
  const crossing = existingBarriers.some(
    (b) => b.row === row && b.col === col && b.orientation !== orientation
  );
  if (crossing) {
    return { valid: false, reason: "Barriers would cross" };
  }

  // 4. Edge overlap check
  const newEdges: string[] = [];
  if (orientation === "H") {
    newEdges.push(edgeKey(row, col, row + 1, col));
    newEdges.push(edgeKey(row, col + 1, row + 1, col + 1));
  } else {
    newEdges.push(edgeKey(row, col, row, col + 1));
    newEdges.push(edgeKey(row + 1, col, row + 1, col + 1));
  }

  const existingEdges = computeBlockedEdges(existingBarriers);
  const hasOverlap = newEdges.some((edge) => existingEdges.has(edge));
  if (hasOverlap) {
    return { valid: false, reason: "Edge overlap with existing barrier" };
  }

  return { valid: true };
};

// Helper to check if movement is blocked by barriers
const isMovementBlocked = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  blockedEdges: Set<string>
): boolean => {
  const edge = edgeKey(fromRow, fromCol, toRow, toCol);
  return blockedEdges.has(edge);
};

describe("Barrier Placement Validation", () => {
  describe("Border Restrictions", () => {
    test("should reject barrier on top border (row 0)", () => {
      const result = isValidBarrierPlacement(0, 5, "H", []);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("border");
    });

    test("should reject barrier on bottom border (row 9)", () => {
      const result = isValidBarrierPlacement(9, 5, "H", []);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("border");
    });

    test("should reject barrier on left border (col 0)", () => {
      const result = isValidBarrierPlacement(5, 0, "V", []);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("border");
    });

    test("should reject barrier on right border (col 9)", () => {
      const result = isValidBarrierPlacement(5, 9, "V", []);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("border");
    });

    test("should accept barrier in valid interior position", () => {
      const result = isValidBarrierPlacement(5, 5, "H", []);
      expect(result.valid).toBe(true);
    });
  });

  describe("Exact Duplicate Prevention", () => {
    test("should reject horizontal barrier at exact same position", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
      ];
      const result = isValidBarrierPlacement(5, 5, "H", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("duplicate");
    });

    test("should reject vertical barrier at exact same position", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "V", id: "1" },
      ];
      const result = isValidBarrierPlacement(5, 5, "V", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("duplicate");
    });
  });

  describe("Crossing Prevention (X Pattern)", () => {
    test("should reject vertical barrier crossing horizontal barrier", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
      ];
      const result = isValidBarrierPlacement(5, 5, "V", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cross");
    });

    test("should reject horizontal barrier crossing vertical barrier", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "V", id: "1" },
      ];
      const result = isValidBarrierPlacement(5, 5, "H", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cross");
    });
  });

  describe("Edge Overlap Prevention", () => {
    test("should reject horizontal barrier sharing left edge", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
      ];
      // This barrier at (5,4) would share the edge at (5,5)-(6,5)
      const result = isValidBarrierPlacement(5, 4, "H", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("overlap");
    });

    test("should reject horizontal barrier sharing right edge", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
      ];
      // This barrier at (5,6) would share the edge at (5,6)-(6,6)
      const result = isValidBarrierPlacement(5, 6, "H", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("overlap");
    });

    test("should reject vertical barrier sharing top edge", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "V", id: "1" },
      ];
      // This barrier at (4,5) would share the edge at (5,5)-(5,6)
      const result = isValidBarrierPlacement(4, 5, "V", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("overlap");
    });

    test("should reject vertical barrier sharing bottom edge", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "V", id: "1" },
      ];
      // This barrier at (6,5) would share the edge at (6,5)-(6,6)
      const result = isValidBarrierPlacement(6, 5, "V", existing);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("overlap");
    });

    test("should allow adjacent horizontal barriers without overlap", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
      ];
      // Barrier at (5,7) is adjacent but doesn't share edges
      const result = isValidBarrierPlacement(5, 7, "H", existing);
      expect(result.valid).toBe(true);
    });

    test("should allow adjacent vertical barriers without overlap", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "V", id: "1" },
      ];
      // Barrier at (7,5) is adjacent but doesn't share edges
      const result = isValidBarrierPlacement(7, 5, "V", existing);
      expect(result.valid).toBe(true);
    });
  });

  describe("Complex Barrier Scenarios", () => {
    test("should handle multiple barriers without conflicts", () => {
      const existing: Barrier[] = [
        { row: 3, col: 3, orientation: "H", id: "1" },
        { row: 5, col: 5, orientation: "V", id: "2" },
        { row: 7, col: 3, orientation: "H", id: "3" },
      ];
      const result = isValidBarrierPlacement(5, 3, "V", existing);
      expect(result.valid).toBe(true);
    });

    test("should reject when multiple overlap conditions exist", () => {
      const existing: Barrier[] = [
        { row: 5, col: 5, orientation: "H", id: "1" },
        { row: 5, col: 4, orientation: "H", id: "2" },
      ];
      // This would share edges with both existing barriers
      const result = isValidBarrierPlacement(5, 4, "H", existing);
      expect(result.valid).toBe(false);
    });
  });
});

describe("Barrier Movement Blocking", () => {
  test("horizontal barrier blocks vertical movement", () => {
    const barriers: Barrier[] = [{ row: 5, col: 5, orientation: "H", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    // Barrier at (5,5) H blocks movement from (5,5) to (6,5)
    expect(isMovementBlocked(5, 5, 6, 5, blockedEdges)).toBe(true);
    // Also blocks (5,6) to (6,6)
    expect(isMovementBlocked(5, 6, 6, 6, blockedEdges)).toBe(true);
    // Does NOT block horizontal movement
    expect(isMovementBlocked(5, 5, 5, 6, blockedEdges)).toBe(false);
  });

  test("vertical barrier blocks horizontal movement", () => {
    const barriers: Barrier[] = [{ row: 5, col: 5, orientation: "V", id: "1" }];
    const blockedEdges = computeBlockedEdges(barriers);

    // Barrier at (5,5) V blocks movement from (5,5) to (5,6)
    expect(isMovementBlocked(5, 5, 5, 6, blockedEdges)).toBe(true);
    // Also blocks (6,5) to (6,6)
    expect(isMovementBlocked(6, 5, 6, 6, blockedEdges)).toBe(true);
    // Does NOT block vertical movement
    expect(isMovementBlocked(5, 5, 6, 5, blockedEdges)).toBe(false);
  });

  test("multiple barriers create complex blocking patterns", () => {
    const barriers: Barrier[] = [
      { row: 5, col: 5, orientation: "H", id: "1" },
      { row: 5, col: 5, orientation: "V", id: "2" }, // This should be rejected by validation!
    ];
    const blockedEdges = computeBlockedEdges(barriers);

    // Both directions blocked at intersection
    expect(isMovementBlocked(5, 5, 6, 5, blockedEdges)).toBe(true);
    expect(isMovementBlocked(5, 5, 5, 6, blockedEdges)).toBe(true);
  });
});

describe("Edge Case Scenarios", () => {
  test("should handle barrier at minimum valid coordinates", () => {
    const result = isValidBarrierPlacement(1, 1, "H", []);
    expect(result.valid).toBe(true);
  });

  test("should handle barrier at maximum valid coordinates", () => {
    const result = isValidBarrierPlacement(8, 8, "H", []);
    expect(result.valid).toBe(true);
  });

  test("should handle empty barrier list", () => {
    const result = isValidBarrierPlacement(5, 5, "H", []);
    expect(result.valid).toBe(true);
  });

  test("should handle full board of barriers (stress test)", () => {
    const barriers: Barrier[] = [];
    let id = 0;

    // Create a grid of non-overlapping barriers
    for (let r = 1; r <= 7; r += 2) {
      for (let c = 1; c <= 7; c += 2) {
        barriers.push({ row: r, col: c, orientation: "H", id: String(id++) });
      }
    }

    // Try to place a barrier that would overlap
    const result = isValidBarrierPlacement(1, 1, "H", barriers);
    expect(result.valid).toBe(false);
  });
});

describe("Edge Key Normalization", () => {
  test("should normalize edge keys consistently", () => {
    const key1 = edgeKey(5, 5, 6, 5);
    const key2 = edgeKey(6, 5, 5, 5);
    expect(key1).toBe(key2);
  });

  test("should normalize horizontal edges", () => {
    const key1 = edgeKey(5, 5, 5, 6);
    const key2 = edgeKey(5, 6, 5, 5);
    expect(key1).toBe(key2);
  });

  test("should create unique keys for different edges", () => {
    const key1 = edgeKey(5, 5, 6, 5);
    const key2 = edgeKey(5, 5, 5, 6);
    expect(key1).not.toBe(key2);
  });
});
