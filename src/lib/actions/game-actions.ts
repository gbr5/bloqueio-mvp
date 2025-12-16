"use server";

import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import type { GoalSide } from "@prisma/client";

/**
 * Check if a player has reached their goal
 */
function checkWin(goalSide: GoalSide, row: number, col: number): boolean {
  switch (goalSide) {
    case "TOP":
      return row === 0;
    case "RIGHT":
      return col === 10;
    case "BOTTOM":
      return row === 10;
    case "LEFT":
      return col === 0;
    default:
      return false;
  }
}

/**
 * Make a move (pawn movement)
 * Server validates turn order, move legality, and win conditions
 */
export async function makeMove(
  code: string,
  toRow: number,
  toCol: number
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get player
    const player = await db.player.findFirst({
      where: { sessionId, room: { code } },
    });

    if (!player) return { error: "Not in this room" };

    // Get room with all data
    const room = await db.room.findUnique({
      where: { code },
      include: { players: true, barriers: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.status !== "PLAYING") {
      return { error: "Game not started" };
    }
    if (room.currentTurn !== player.playerId) {
      return { error: "Not your turn" };
    }

    // TODO: Add move validation logic here
    // For now, we'll allow any move (will add proper validation later)

    // Check win condition
    const isWin = checkWin(player.goalSide, toRow, toCol);

    // Update in transaction
    await db.$transaction([
      // Update player position
      db.player.update({
        where: { id: player.id },
        data: { row: toRow, col: toCol },
      }),

      // Record move in history
      db.move.create({
        data: {
          roomId: room.id,
          playerId: player.playerId,
          fromRow: player.row,
          fromCol: player.col,
          toRow,
          toCol,
        },
      }),

      // Update room state
      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: isWin
            ? room.currentTurn
            : (room.currentTurn + 1) % room.players.length,
          winner: isWin ? player.playerId : room.winner,
          status: isWin ? "FINISHED" : room.status,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error making move:", error);
    return { error: "Failed to make move" };
  }
}

/**
 * Place a barrier on the board
 */
export async function placeBarrier(
  code: string,
  row: number,
  col: number,
  orientation: "HORIZONTAL" | "VERTICAL"
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get player
    const player = await db.player.findFirst({
      where: { sessionId, room: { code } },
    });

    if (!player) return { error: "Not in this room" };
    if (player.wallsLeft === 0) return { error: "No walls left" };

    // Get room
    const room = await db.room.findUnique({
      where: { code },
      include: { players: true, barriers: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.status !== "PLAYING") {
      return { error: "Game not started" };
    }
    if (room.currentTurn !== player.playerId) {
      return { error: "Not your turn" };
    }

    // Validate barrier placement
    // 1. Cannot place on border cells (row/col 0 or 10 for 11x11 grid)
    const GRID_SIZE = 11;
    if (
      row === 0 ||
      row >= GRID_SIZE - 2 ||
      col === 0 ||
      col >= GRID_SIZE - 2
    ) {
      return { error: "Cannot place barriers on border cells" };
    }

    // 2. Check if EXACT same barrier already exists (same position + orientation)
    const exactDuplicate = room.barriers.some(
      (b) => b.row === row && b.col === col && b.orientation === orientation
    );
    if (exactDuplicate) {
      return { error: "Barrier already exists at this exact position" };
    }

    // 3. Check if barrier would cross another barrier (X pattern)
    // Same position but different orientation = crossing
    const crossesBarrier = room.barriers.some(
      (b) => b.row === row && b.col === col && b.orientation !== orientation
    );
    if (crossesBarrier) {
      return { error: "Cannot place barriers crossing each other" };
    }

    // 4. Check if barrier shares edges with existing barriers (overlapping)
    // Compute which edges this new barrier would block
    const edgeKey = (r1: number, c1: number, r2: number, c2: number) => {
      if (r1 > r2 || (r1 === r2 && c1 > c2)) {
        [r1, r2] = [r2, r1];
        [c1, c2] = [c2, c1];
      }
      return `${r1},${c1}-${r2},${c2}`;
    };

    const newEdges: string[] = [];
    if (orientation === "HORIZONTAL") {
      newEdges.push(edgeKey(row, col, row + 1, col));
      newEdges.push(edgeKey(row, col + 1, row + 1, col + 1));
    } else {
      newEdges.push(edgeKey(row, col, row, col + 1));
      newEdges.push(edgeKey(row + 1, col, row + 1, col + 1));
    }

    // Compute all existing blocked edges
    const existingEdges = new Set<string>();
    for (const b of room.barriers) {
      if (b.orientation === "HORIZONTAL") {
        existingEdges.add(edgeKey(b.row, b.col, b.row + 1, b.col));
        existingEdges.add(edgeKey(b.row, b.col + 1, b.row + 1, b.col + 1));
      } else {
        existingEdges.add(edgeKey(b.row, b.col, b.row, b.col + 1));
        existingEdges.add(edgeKey(b.row + 1, b.col, b.row + 1, b.col + 1));
      }
    }

    // Check if any new edge is already blocked
    const hasOverlap = newEdges.some((edge) => existingEdges.has(edge));
    if (hasOverlap) {
      return { error: "Barrier would overlap with existing barrier" };
    }

    // 5. Pathfinding validation: Ensure ALL players can still reach their goals
    // Create a set with the hypothetical new barrier's edges
    const hypotheticalEdges = new Set(existingEdges);
    newEdges.forEach((edge) => hypotheticalEdges.add(edge));

    console.log(
      `[BARRIER VALIDATION] New barrier at (${row},${col}) orientation: ${orientation}`
    );
    console.log(`[BARRIER VALIDATION] New edges blocked:`, newEdges);
    console.log(
      `[BARRIER VALIDATION] Total blocked edges:`,
      Array.from(hypotheticalEdges)
    );

    // BFS pathfinding: Check if player can reach any cell ADJACENT to their goal border
    const hasPathToGoal = (
      playerRow: number,
      playerCol: number,
      goalSide: string,
      blockedEdges: Set<string>
    ): boolean => {
      const visited = new Set<string>();
      const queue: Array<[number, number]> = [[playerRow, playerCol]];
      visited.add(`${playerRow},${playerCol}`);

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;

        // Check if this cell is ADJACENT to the goal border (one move away from winning)
        // We just check if player can REACH this position, not if they can make the final winning move
        if (goalSide === "TOP" && r === 1) return true; // Can reach row 0 from here
        if (goalSide === "BOTTOM" && r === 9) return true; // Can reach row 10 from here
        if (goalSide === "LEFT" && c === 1) return true; // Can reach col 0 from here
        if (goalSide === "RIGHT" && c === 9) return true; // Can reach col 10 from here

        // Explore 4 neighbors (UP, DOWN, LEFT, RIGHT)
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];

        for (const [nr, nc] of neighbors) {
          // CRITICAL: Only explore INTERNAL cells (1-9)
          // Players cannot walk through border cells!
          if (nr < 1 || nr > 9 || nc < 1 || nc > 9) {
            continue;
          }

          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;

          // Check if edge is blocked by barrier
          const edge = edgeKey(r, c, nr, nc);
          if (blockedEdges.has(edge)) continue;

          visited.add(key);
          queue.push([nr, nc]);
        }
      }

      return false;
    };

    // Check if ALL players still have a path to their goal
    for (const player of room.players) {
      console.log(
        `[PATHFINDING] Checking player ${player.name} at (${player.row},${player.col}) goal: ${player.goalSide}`
      );

      const canReach = hasPathToGoal(
        player.row,
        player.col,
        player.goalSide,
        hypotheticalEdges
      );

      console.log(
        `[PATHFINDING] Player ${player.name} can reach goal: ${canReach}`
      );

      if (!canReach) {
        console.error(
          `[PATHFINDING] BLOCKING BARRIER! Player ${player.name} would be trapped!`
        );
        return {
          error: `Cannot place barrier: would block ${player.name} from reaching their goal`,
        };
      }
    }

    console.log(`[PATHFINDING] All players can still reach their goals ✅`);

    // All validations passed!

    // Place barrier in transaction
    await db.$transaction([
      db.barrier.create({
        data: {
          roomId: room.id,
          row,
          col,
          orientation,
          placedBy: player.playerId,
        },
      }),

      db.player.update({
        where: { id: player.id },
        data: { wallsLeft: player.wallsLeft - 1 },
      }),

      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: (room.currentTurn + 1) % room.players.length,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error placing barrier:", error);
    return { error: "Failed to place barrier" };
  }
}

/**
 * Start the game (change status from WAITING to PLAYING)
 */
export async function startGame(
  code: string
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    const room = await db.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.hostId !== sessionId) {
      return { error: "Only host can start the game" };
    }
    if (room.players.length < 2) {
      return { error: "Need at least 2 players to start" };
    }
    if (room.status !== "WAITING") {
      return { error: "Game already started" };
    }

    await db.room.update({
      where: { id: room.id },
      data: { status: "PLAYING" },
    });

    return { success: true };
  } catch (error) {
    console.error("Error starting game:", error);
    return { error: "Failed to start game" };
  }
}
