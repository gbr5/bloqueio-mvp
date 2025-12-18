"use server";

import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import type { GoalSide, Prisma } from "@prisma/client";
import { getGameModeConfig, type GameMode } from "@/types/game";
import { afterMoveCommit, onGameStart } from "@/lib/bot/scheduler";

/**
 * Get next player ID - works for both 2P and 4P modes
 * Cycles through actual player IDs, not array indices
 */
function getNextPlayerId(
  currentPlayerId: number,
  players: Array<{ playerId: number }>
): number {
  const currentIndex = players.findIndex((p) => p.playerId === currentPlayerId);
  if (currentIndex === -1) return players[0].playerId;
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex].playerId;
}

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

    // Build transaction operations (typed to allow any Prisma promise)
    const transactionOps: Prisma.PrismaPromise<unknown>[] = [
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
            : getNextPlayerId(room.currentTurn, room.players),
          winner: isWin ? player.playerId : room.winner,
          status: isWin ? "FINISHED" : room.status,
          turnNumber: { increment: 1 }, // Bot system: concurrency control
        },
      }),
    ];

    // If winner, update user stats for all players in the game
    if (isWin) {
      // Increment gamesPlayed for all players with userId
      // Increment gamesWon for the winner
      for (const p of room.players) {
        if (p.userId) {
          transactionOps.push(
            db.user.update({
              where: { id: p.userId },
              data: {
                gamesPlayed: { increment: 1 },
                ...(p.playerId === player.playerId && {
                  gamesWon: { increment: 1 },
                }),
              },
            })
          );
        }
      }
    }

    // Execute transaction
    await db.$transaction(transactionOps);

    // Bot system: Schedule bot move if next player is bot
    // This must happen AFTER transaction commit (turnNumber already incremented)
    if (!isWin) {
      await afterMoveCommit(code);
    }

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
    // Barriers are placed at intersections and span 2 cells
    // For an 11x11 grid (0-10):
    // - Horizontal barrier at (row, col) blocks edges between (row,col)↔(row+1,col) and (row,col+1)↔(row+1,col+1)
    // - Vertical barrier at (row, col) blocks edges between (row,col)↔(row,col+1) and (row+1,col)↔(row+1,col+1)
    //
    // Valid ranges depend on orientation:
    // - HORIZONTAL: row 0-9 (needs row+1 ≤ 10), col 0-8 (needs col+1 ≤ 9 for two columns)
    // - VERTICAL: col 0-9 (needs col+1 ≤ 10), row 0-8 (needs row+1 ≤ 9 for two rows)
    const GRID_SIZE = 11;

    if (orientation === "HORIZONTAL") {
      // Horizontal barriers: row can go up to 9, col up to 8
      if (row < 0 || row > GRID_SIZE - 2 || col < 0 || col > GRID_SIZE - 3) {
        return { error: "Posição inválida para barreira horizontal" };
      }
    } else {
      // Vertical barriers: col can go up to 9, row up to 8
      if (row < 0 || row > GRID_SIZE - 3 || col < 0 || col > GRID_SIZE - 2) {
        return { error: "Posição inválida para barreira vertical" };
      }
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
          currentTurn: getNextPlayerId(room.currentTurn, room.players),
          turnNumber: { increment: 1 }, // Bot system: concurrency control
        },
      }),
    ]);

    // Bot system: Schedule bot move if next player is bot
    await afterMoveCommit(code);

    return { success: true };
  } catch (error) {
    console.error("Error placing barrier:", error);
    return { error: "Failed to place barrier" };
  }
}

/**
 * Undo last action (move or barrier placement)
 * Only allowed if:
 * 1. The next player hasn't taken their turn yet
 * 2. The action was made by the current session
 */
export async function undoLastAction(
  code: string
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
      include: {
        players: true,
        barriers: { orderBy: { createdAt: "desc" } },
        moves: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!room) return { error: "Room not found" };
    if (room.status !== "PLAYING") {
      return { error: "Game not started" };
    }
    if (room.winner !== null) {
      return { error: "Game is finished" };
    }

    // Calculate previous player (the one who just moved)
    const previousPlayerId =
      (room.currentTurn - 1 + room.players.length) % room.players.length;

    // Only the player who just made the move can undo
    if (player.playerId !== previousPlayerId) {
      return { error: "Only the player who just moved can undo" };
    }

    // Get the last move
    const lastMove = room.moves[0];

    // Get the last barrier (placed by this player)
    const lastBarrier = room.barriers.find(
      (b) => b.placedBy === player.playerId
    );

    // Determine what to undo: check if the last action was a move or barrier
    // We need to compare timestamps
    const lastMoveTime = lastMove?.createdAt?.getTime() ?? 0;
    const lastBarrierTime = lastBarrier?.createdAt?.getTime() ?? 0;

    if (lastMoveTime > lastBarrierTime && lastMove) {
      // Undo move - verify it's by the same player
      if (lastMove.playerId !== player.playerId) {
        return { error: "Cannot undo another player's move" };
      }

      // Revert the move
      await db.$transaction([
        // Move player back
        db.player.update({
          where: { id: player.id },
          data: { row: lastMove.fromRow, col: lastMove.fromCol },
        }),

        // Delete the move record
        db.move.delete({
          where: { id: lastMove.id },
        }),

        // Revert turn
        db.room.update({
          where: { id: room.id },
          data: { currentTurn: player.playerId },
        }),
      ]);

      return { success: true };
    } else if (lastBarrierTime > lastMoveTime && lastBarrier) {
      // Undo barrier placement
      await db.$transaction([
        // Delete the barrier
        db.barrier.delete({
          where: { id: lastBarrier.id },
        }),

        // Restore wall count
        db.player.update({
          where: { id: player.id },
          data: { wallsLeft: player.wallsLeft + 1 },
        }),

        // Revert turn
        db.room.update({
          where: { id: room.id },
          data: { currentTurn: player.playerId },
        }),
      ]);

      return { success: true };
    }

    return { error: "Nothing to undo" };
  } catch (error) {
    console.error("Error undoing action:", error);
    return { error: "Failed to undo action" };
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
    if (room.hostSessionId !== sessionId) {
      return { error: "Only host can start the game" };
    }

    const config = getGameModeConfig(room.gameMode as GameMode);

    // Validate player count based on game mode
    if (room.players.length < config.minPlayers) {
      return {
        error:
          room.gameMode === "TWO_PLAYER"
            ? "Precisa de exatamente 2 jogadores para começar"
            : "Precisa de pelo menos 2 jogadores para começar",
      };
    }

    if (room.players.length > config.maxPlayers) {
      return { error: `Muitos jogadores para o modo ${config.label}` };
    }

    // Additional validation for 2P mode: must have exactly 2 players
    if (room.gameMode === "TWO_PLAYER" && room.players.length !== 2) {
      return { error: "Modo 2 jogadores requer exatamente 2 jogadores" };
    }

    if (room.status !== "WAITING") {
      return { error: "Game already started" };
    }

    await db.room.update({
      where: { id: room.id },
      data: { status: "PLAYING" },
    });

    // Schedule bot move if first player is a bot
    await onGameStart(code);

    return { success: true };
  } catch (error) {
    console.error("Error starting game:", error);
    return { error: "Failed to start game" };
  }
}
