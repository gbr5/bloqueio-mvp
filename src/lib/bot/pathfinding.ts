/**
 * Pathfinding for bot decision-making
 * BFS (Breadth-First Search) to find shortest paths and reachability
 */

import type { PathResult, GoalSide } from "./types";

const BOARD_SIZE = 11; // 0-10

/**
 * Check if a cell is a goal cell for given side
 */
export function isGoalCell(
  row: number,
  col: number,
  goalSide: GoalSide
): boolean {
  switch (goalSide) {
    case "TOP":
      return row === 0;
    case "BOTTOM":
      return row === BOARD_SIZE - 1;
    case "LEFT":
      return col === 0;
    case "RIGHT":
      return col === BOARD_SIZE - 1;
  }
}

/**
 * Find shortest path to goal using BFS
 * Returns path if exists, else returns distance: Infinity
 */
export function findShortestPath(
  startRow: number,
  startCol: number,
  goalSide: GoalSide,
  blockedEdges: Set<string>
): PathResult {
  const queue: Array<{
    row: number;
    col: number;
    path: Array<{ row: number; col: number }>;
  }> = [];
  const visited = new Set<string>();

  queue.push({ row: startRow, col: startCol, path: [] });
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { row, col, path } = current;

    // Check if reached goal
    if (isGoalCell(row, col, goalSide)) {
      return {
        distance: path.length,
        path: [...path, { row, col }],
        exists: true,
      };
    }

    // Explore neighbors (4 directions)
    for (const neighbor of getValidNeighbors(row, col, blockedEdges)) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          row: neighbor.row,
          col: neighbor.col,
          path: [...path, { row, col }],
        });
      }
    }
  }

  // No path found
  return {
    distance: Infinity,
    path: [],
    exists: false,
  };
}

/**
 * Get valid neighbors for a cell
 * Respects board boundaries and blocked edges
 */
function getValidNeighbors(
  row: number,
  col: number,
  blockedEdges: Set<string>
): Array<{ row: number; col: number }> {
  const neighbors: Array<{ row: number; col: number }> = [];
  const directions = [
    { dr: -1, dc: 0 }, // Up
    { dr: 1, dc: 0 }, // Down
    { dr: 0, dc: -1 }, // Left
    { dr: 0, dc: 1 }, // Right
  ];

  for (const { dr, dc } of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    // CRITICAL: Only allow movement within internal cells (1-9)
    // Border cells (0 and 10) can only be reached as final winning move
    const INNER_SIZE = 9;
    if (
      newRow < 1 ||
      newRow > INNER_SIZE ||
      newCol < 1 ||
      newCol > INNER_SIZE
    ) {
      continue;
    }

    // Check if edge is blocked
    const edgeKey = normalizeEdgeKey(row, col, newRow, newCol);
    if (blockedEdges.has(edgeKey)) {
      continue;
    }

    neighbors.push({ row: newRow, col: newCol });
  }

  return neighbors;
}

/**
 * Normalize edge key for consistent lookup
 * Both (r1,c1)→(r2,c2) and (r2,c2)→(r1,c1) map to same key
 */
function normalizeEdgeKey(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): string {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    return `${r2},${c2}:${r1},${c1}`;
  }
  return `${r1},${c1}:${r2},${c2}`;
}

/**
 * Check if a player has any path to their goal
 * Used for validating barrier placement (no complete isolation)
 */
export function hasPathToGoal(
  startRow: number,
  startCol: number,
  goalSide: GoalSide,
  blockedEdges: Set<string>
): boolean {
  const result = findShortestPath(startRow, startCol, goalSide, blockedEdges);
  return result.exists;
}

/**
 * Calculate manhattan distance to goal
 * Useful heuristic for move evaluation
 */
export function distanceToGoal(
  row: number,
  col: number,
  goalSide: GoalSide
): number {
  switch (goalSide) {
    case "TOP":
      return row;
    case "BOTTOM":
      return BOARD_SIZE - 1 - row;
    case "LEFT":
      return col;
    case "RIGHT":
      return BOARD_SIZE - 1 - col;
  }
}
