"use client";

import { JSX, useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import type {
  PlayerId,
  GoalSide,
  Player,
  Mode,
  Cell,
  Orientation,
  Barrier,
  GameSnapshot,
} from "@/types/game";
import { PLAYER_BASE_COLORS } from "@/types/game";

/**
 * Props for controlled BloqueioPage component
 *
 * For multiplayer: pass gameState and onGameStateChange
 * For local play: omit props to use internal state
 */
interface BloqueioPageProps {
  gameState?: GameSnapshot;
  onGameStateChange?: (newState: GameSnapshot) => void;
  myPlayerId?: number | null;
  disabled?: boolean;
}

// Tabuleiro original interno é 9x9, com uma borda extra em volta
const INNER_SIZE = 9;
const SIZE = INNER_SIZE + 2; // 11x11 com bordas

function edgeKey(r1: number, c1: number, r2: number, c2: number) {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    [r1, r2] = [r2, r1];
    [c1, c2] = [c2, c1];
  }
  return `${r1},${c1}-${r2},${c2}`;
}

function isInside(row: number, col: number) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

// Objetivo é alcançar a BORDA externa (0 ou SIZE-1)
function isGoal(row: number, col: number, goalSide: GoalSide) {
  switch (goalSide) {
    case "TOP":
      return row === 0;
    case "BOTTOM":
      return row === SIZE - 1;
    case "LEFT":
      return col === 0;
    case "RIGHT":
      return col === SIZE - 1;
  }
}

function createInitialPlayers(): Player[] {
  const mid = Math.floor(SIZE / 2); // centro do 11x11
  return [
    {
      id: 0,
      row: 1, // segunda linha a partir do topo
      col: mid,
      goalSide: "BOTTOM",
      wallsLeft: 6,
      color: "#ef4444",
      name: "Jogador 1",
      label: "Vermelho",
    },
    {
      id: 1,
      row: mid,
      col: SIZE - 2, // segunda coluna a partir da direita
      goalSide: "LEFT",
      wallsLeft: 6,
      color: "#3b82f6",
      name: "Jogador 2",
      label: "Azul",
    },
    {
      id: 2,
      row: SIZE - 2, // segunda linha a partir de baixo
      col: mid,
      goalSide: "TOP",
      wallsLeft: 6,
      color: "#22c55e",
      name: "Jogador 3",
      label: "Verde",
    },
    {
      id: 3,
      row: mid,
      col: 1, // segunda coluna a partir da esquerda
      goalSide: "RIGHT",
      wallsLeft: 6,
      color: "#f59e0b",
      name: "Jogador 4",
      label: "Amarelo",
    },
  ];
}

// BFS para checar se ainda existe algum caminho até o objetivo
function hasPathToGoal(player: Player, blockedEdges: Set<string>): boolean {
  console.log(
    `[BFS DEBUG] Starting for ${player.name} at (${player.row},${player.col}) goal=${player.goalSide}`
  );
  console.log(`[BFS DEBUG] INNER_SIZE=${INNER_SIZE}, SIZE=${SIZE}`);
  console.log(`[BFS DEBUG] Blocked edges:`, Array.from(blockedEdges));

  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const queue: Cell[] = [{ row: player.row, col: player.col }];
  visited[player.row][player.col] = true;

  let cellsExplored = 0;

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { row, col } = queue.shift() as Cell;
    cellsExplored++;

    // Check if this cell is ADJACENT to the goal border (one move away from winning)
    // We just check if player can REACH this position, not if they can make the final winning move
    if (player.goalSide === "TOP" && row === 1) {
      console.log(
        `[BFS DEBUG] SUCCESS! Reached row=1, can reach TOP goal. Explored ${cellsExplored} cells.`
      );
      return true;
    }
    if (player.goalSide === "BOTTOM" && row === INNER_SIZE) {
      console.log(
        `[BFS DEBUG] SUCCESS! Reached row=${INNER_SIZE}, can reach BOTTOM goal. Explored ${cellsExplored} cells.`
      );
      return true;
    }
    if (player.goalSide === "LEFT" && col === 1) {
      console.log(
        `[BFS DEBUG] SUCCESS! Reached col=1, can reach LEFT goal. Explored ${cellsExplored} cells.`
      );
      return true;
    }
    if (player.goalSide === "RIGHT" && col === INNER_SIZE) {
      console.log(
        `[BFS DEBUG] SUCCESS! Reached col=${INNER_SIZE}, can reach RIGHT goal. Explored ${cellsExplored} cells.`
      );
      return true;
    }

    for (const { dr, dc } of directions) {
      const nr = row + dr;
      const nc = col + dc;

      // CRITICAL: Only explore INTERNAL cells (1-9)
      // Players cannot walk through border cells!
      if (nr < 1 || nr > INNER_SIZE || nc < 1 || nc > INNER_SIZE) continue;

      if (visited[nr][nc]) continue;
      if (blockedEdges.has(edgeKey(row, col, nr, nc))) continue;

      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc });
    }
  }

  console.log(
    `[BFS DEBUG] FAILED! No path found after exploring ${cellsExplored} cells.`
  );
  return false;
}

// Versão genérica do movimento (com paredes arbitrárias e todos os peões)
function canPawnMoveTo(
  player: Player,
  destRow: number,
  destCol: number,
  blockedEdges: Set<string>,
  players: Player[]
): boolean {
  if (!isInside(destRow, destCol)) return false;
  if (destRow === player.row && destCol === player.col) return false;

  // Não pode entrar na borda externa, exceto no lado de objetivo
  const isBorder =
    destRow === 0 ||
    destRow === SIZE - 1 ||
    destCol === 0 ||
    destCol === SIZE - 1;
  if (isBorder && !isGoal(destRow, destCol, player.goalSide)) {
    return false;
  }

  // destino não pode estar ocupado
  const occupied = players.some(
    (p) => p.id !== player.id && p.row === destRow && p.col === destCol
  );
  if (occupied) return false;

  const dr = destRow - player.row;
  const dc = destCol - player.col;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  const manhattan = adr + adc;

  // 1) passo normal
  if (manhattan === 1) {
    if (blockedEdges.has(edgeKey(player.row, player.col, destRow, destCol))) {
      return false;
    }
    return true;
  }

  // 2) pulo em linha reta (2 casas na mesma direção)
  const isStraightTwo = (adr === 2 && adc === 0) || (adr === 0 && adc === 2);
  if (isStraightTwo) {
    const midRow = player.row + (dr === 0 ? 0 : dr > 0 ? 1 : -1);
    const midCol = player.col + (dc === 0 ? 0 : dc > 0 ? 1 : -1);

    if (!isInside(midRow, midCol)) return false;

    const middlePawn = players.find(
      (p) => p.row === midRow && p.col === midCol
    );
    if (!middlePawn) return false;

    // Check if path is clear
    if (
      blockedEdges.has(edgeKey(player.row, player.col, midRow, midCol)) ||
      blockedEdges.has(edgeKey(midRow, midCol, destRow, destCol))
    ) {
      return false;
    }

    return true;
  }

  // 3) Side-step jump (diagonal move when jumping over adjacent player)
  // Manhattan distance of 2, but diagonal (e.g., 1 up + 1 right)
  if (manhattan === 2 && adr === 1 && adc === 1) {
    // Check all 4 orthogonal neighbors for a player to jump over
    const neighbors = [
      { dr: -1, dc: 0 }, // up
      { dr: 1, dc: 0 }, // down
      { dr: 0, dc: -1 }, // left
      { dr: 0, dc: 1 }, // right
    ];

    for (const { dr: ndr, dc: ndc } of neighbors) {
      const neighborRow = player.row + ndr;
      const neighborCol = player.col + ndc;

      if (!isInside(neighborRow, neighborCol)) continue;

      // Is there a player at this neighbor position?
      const neighborPawn = players.find(
        (p) => p.row === neighborRow && p.col === neighborCol
      );
      if (!neighborPawn) continue;

      // CRITICAL: Can we reach this neighbor (no barrier blocking)?
      if (
        blockedEdges.has(
          edgeKey(player.row, player.col, neighborRow, neighborCol)
        )
      ) {
        continue;
      }

      // Calculate the straight-ahead position from neighbor
      const straightRow = neighborRow + ndr;
      const straightCol = neighborCol + ndc;

      // Check if straight jump is blocked (barrier or edge)
      const straightBlocked =
        !isInside(straightRow, straightCol) ||
        blockedEdges.has(
          edgeKey(neighborRow, neighborCol, straightRow, straightCol)
        ) ||
        // Also check if destination cell would be occupied
        players.some((p) => p.row === straightRow && p.col === straightCol);

      if (!straightBlocked) {
        // Straight jump is possible, side-step not allowed in this direction
        continue;
      }

      // Straight is blocked, check if we can side-step to destination
      // Destination must be perpendicular to the jump direction AND adjacent to neighbor
      const isPerpendicularJump =
        (ndr !== 0 &&
          destRow === neighborRow &&
          Math.abs(destCol - neighborCol) === 1) ||
        (ndc !== 0 &&
          destCol === neighborCol &&
          Math.abs(destRow - neighborRow) === 1);

      if (!isPerpendicularJump) continue;

      // CRITICAL: Verify destination is actually reachable from neighbor position
      // Must be exactly adjacent to the neighbor (already checked above)
      // AND verify no barrier blocks the side-step
      if (
        blockedEdges.has(edgeKey(neighborRow, neighborCol, destRow, destCol))
      ) {
        continue;
      }

      // Additional check: The destination must actually form a valid diagonal
      // from our current position (must go through the neighbor)
      const isDiagonalThroughNeighbor =
        Math.abs(destRow - player.row) === 1 &&
        Math.abs(destCol - player.col) === 1;

      if (!isDiagonalThroughNeighbor) continue;

      // Valid side-step jump!
      return true;
    }

    // No valid side-step jump found
    return false;
  }

  // Invalid move
  return false;
}

export default function BloqueioPage({
  gameState: externalGameState,
  onGameStateChange,
  myPlayerId,
  disabled = false,
}: BloqueioPageProps = {}) {
  // Internal state for local-only play (when no props provided)
  const [localPlayers, setLocalPlayers] = useState<Player[]>(() =>
    createInitialPlayers()
  );
  const [localBlockedEdges, setLocalBlockedEdges] = useState<Set<string>>(
    () => new Set()
  );
  const [localBarriers, setLocalBarriers] = useState<Barrier[]>([]);
  const [localCurrentPlayerId, setLocalCurrentPlayerId] = useState<PlayerId>(0);
  const [localWinner, setLocalWinner] = useState<PlayerId | null>(null);

  // Determine if we're in controlled mode (multiplayer) or uncontrolled (local)
  const isControlled =
    externalGameState !== undefined && onGameStateChange !== undefined;

  // Use external state if controlled, otherwise use local state
  const players = isControlled ? externalGameState.players : localPlayers;
  const blockedEdges = isControlled
    ? new Set(externalGameState.blockedEdges)
    : localBlockedEdges;
  const barriers = isControlled ? externalGameState.barriers : localBarriers;
  const currentPlayerId = isControlled
    ? externalGameState.currentPlayerId
    : localCurrentPlayerId;
  const winner = isControlled ? externalGameState.winner : localWinner;

  // UI-only state (not synced)
  const [mode, setMode] = useState<Mode>("move");
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [wallOrientation, setWallOrientation] = useState<Orientation>("H");
  const [hoveredCell, setHoveredCell] = useState<Cell | null>(null);

  const currentPlayer = players.find((p) => p.id === currentPlayerId)!;

  // Helper to update game state (works for both controlled and uncontrolled)
  function updateGameState(updates: Partial<GameSnapshot>) {
    const newState: GameSnapshot = {
      players: updates.players ?? players,
      blockedEdges: updates.blockedEdges ?? Array.from(blockedEdges),
      barriers: updates.barriers ?? barriers,
      currentPlayerId: updates.currentPlayerId ?? currentPlayerId,
      winner: updates.winner ?? winner,
    };

    if (isControlled) {
      // Multiplayer: call parent callback
      onGameStateChange!(newState);
    } else {
      // Local: update local state
      if (updates.players) setLocalPlayers(updates.players);
      if (updates.blockedEdges)
        setLocalBlockedEdges(new Set(updates.blockedEdges));
      if (updates.barriers) setLocalBarriers(updates.barriers);
      if (updates.currentPlayerId !== undefined)
        setLocalCurrentPlayerId(updates.currentPlayerId);
      if (updates.winner !== undefined) setLocalWinner(updates.winner);
    }
  }

  function nextPlayerId(id: PlayerId): PlayerId {
    return ((id + 1) % 4) as PlayerId;
  }

  function cellOccupied(row: number, col: number): Player | undefined {
    return players.find((p) => p.row === row && p.col === col);
  }

  function pushSnapshot() {
    setHistory((prev) => [
      ...prev,
      {
        players: players.map((p) => ({ ...p })),
        blockedEdges: Array.from(blockedEdges),
        barriers: barriers.map((b) => ({ ...b })),
        currentPlayerId,
        winner,
      },
    ]);
  }

  function handleUndo() {
    // Undo is only available in local (single-player) mode
    if (isControlled) return;

    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];

      setLocalPlayers(last.players.map((p) => ({ ...p })));
      setLocalBlockedEdges(new Set(last.blockedEdges));
      setLocalBarriers(last.barriers.map((b) => ({ ...b })));
      setLocalCurrentPlayerId(last.currentPlayerId);
      setLocalWinner(last.winner);
      setMode("move");
      setHoveredCell(null);

      return prev.slice(0, -1);
    });
  }

  function canMoveTo(row: number, col: number): boolean {
    if (winner !== null) return false;
    const cur = currentPlayer;
    return canPawnMoveTo(cur, row, col, blockedEdges, players);
  }

  type WallCheckResult = {
    ok: boolean;
    baseRow: number;
    baseCol: number;
    orientation: Orientation;
    edgesToAdd: string[];
  };

  function checkWallPlacement(
    clickRow: number,
    clickCol: number,
    opts?: { silent?: boolean }
  ): WallCheckResult {
    const silent = opts?.silent ?? false;

    if (winner !== null) {
      return {
        ok: false,
        baseRow: 0,
        baseCol: 0,
        orientation: wallOrientation,
        edgesToAdd: [],
      };
    }

    if (currentPlayer.wallsLeft <= 0) {
      if (!silent) toast.error("No barriers left!");
      return {
        ok: false,
        baseRow: 0,
        baseCol: 0,
        orientation: wallOrientation,
        edgesToAdd: [],
      };
    }

    // Barriers CANNOT be placed ON the colored border cells (row/col 0 or SIZE-1)
    // But barriers CAN block the edge between border and internal board
    // Click must be on internal cells (1 to SIZE-2), not on borders
    if (
      clickRow === 0 ||
      clickRow === SIZE - 1 ||
      clickCol === 0 ||
      clickCol === SIZE - 1
    ) {
      if (!silent) toast.error("Cannot place barriers on border cells");
      return {
        ok: false,
        baseRow: 0,
        baseCol: 0,
        orientation: wallOrientation,
        edgesToAdd: [],
      };
    }

    // baseRow/baseCol determine where the barrier is anchored
    // Horizontal barrier at baseRow blocks edges between rows baseRow and baseRow+1
    // Vertical barrier at baseCol blocks edges between cols baseCol and baseCol+1
    //
    // To allow blocking ALL border edges (top, left, bottom, right):
    // - Clicking row 1 with H barrier → baseRow=0 (blocks row 0↔1, top border)
    // - Clicking row 9 with H barrier → baseRow=9 (blocks row 9↔10, bottom border)
    // - Same logic for columns with V barriers
    //
    // Strategy: Use clickRow-1 as base, but when clicking on the last internal row/col,
    // use clickRow directly to allow placing barrier at the far edge.
    //
    // For HORIZONTAL barriers spanning 2 columns:
    //   - baseRow range: 0 to SIZE-2 (=9) to cover all horizontal edges
    //   - baseCol range: 0 to SIZE-3 (=8) since barrier needs baseCol and baseCol+1
    // For VERTICAL barriers spanning 2 rows:
    //   - baseCol range: 0 to SIZE-2 (=9) to cover all vertical edges
    //   - baseRow range: 0 to SIZE-3 (=8) since barrier needs baseRow and baseRow+1
    let baseRow: number;
    let baseCol: number;

    if (wallOrientation === "H") {
      // For horizontal barriers: allow baseRow up to SIZE-2 to block bottom border
      // Clicking last internal row (INNER_SIZE = 9) should give baseRow = 9
      if (clickRow === INNER_SIZE) {
        baseRow = clickRow; // Place at bottom edge
      } else {
        baseRow = Math.max(0, clickRow - 1);
      }
      baseCol = Math.max(0, Math.min(clickCol - 1, SIZE - 3));
    } else {
      // For vertical barriers: allow baseCol up to SIZE-2 to block right border
      // Clicking last internal col (INNER_SIZE = 9) should give baseCol = 9
      if (clickCol === INNER_SIZE) {
        baseCol = clickCol; // Place at right edge
      } else {
        baseCol = Math.max(0, clickCol - 1);
      }
      baseRow = Math.max(0, Math.min(clickRow - 1, SIZE - 3));
    }

    const edgesToAdd: string[] = [];
    const orientation = wallOrientation;

    if (orientation === "H") {
      // barreira horizontal entre baseRow e baseRow+1, cobrindo duas colunas
      if (baseRow + 1 >= SIZE || baseCol + 1 >= SIZE) {
        return {
          ok: false,
          baseRow,
          baseCol,
          orientation,
          edgesToAdd,
        };
      }
      edgesToAdd.push(edgeKey(baseRow, baseCol, baseRow + 1, baseCol));
      edgesToAdd.push(edgeKey(baseRow, baseCol + 1, baseRow + 1, baseCol + 1));
    } else {
      // barreira vertical entre baseCol e baseCol+1, cobrindo duas linhas
      if (baseRow + 1 >= SIZE || baseCol + 1 >= SIZE) {
        return {
          ok: false,
          baseRow,
          baseCol,
          orientation,
          edgesToAdd,
        };
      }
      edgesToAdd.push(edgeKey(baseRow, baseCol, baseRow, baseCol + 1));
      edgesToAdd.push(edgeKey(baseRow + 1, baseCol, baseRow + 1, baseCol + 1));
    }

    // 1) Cannot reuse blocked edges
    const anyAlreadyBlocked = edgesToAdd.some((e) => blockedEdges.has(e));
    if (anyAlreadyBlocked) {
      if (!silent) toast.error("A barrier already exists in this space");
      return {
        ok: false,
        baseRow,
        baseCol,
        orientation,
        edgesToAdd,
      };
    }

    // 2) Cannot cross another barrier in X pattern at the same 2x2 block
    const crossesExisting = barriers.some(
      (b) =>
        b.row === baseRow && b.col === baseCol && b.orientation !== orientation
    );
    if (crossesExisting) {
      if (!silent) toast.error("Cannot cross barriers in X pattern");
      return {
        ok: false,
        baseRow,
        baseCol,
        orientation,
        edgesToAdd,
      };
    }

    const newBlocked = new Set(blockedEdges);
    edgesToAdd.forEach((e) => newBlocked.add(e));

    console.log(
      `[CLIENT PATHFINDING] Checking barrier at (${baseRow},${baseCol}) ${orientation}`
    );
    console.log(`[CLIENT PATHFINDING] New edges:`, edgesToAdd);
    console.log(
      `[CLIENT PATHFINDING] Total blocked edges:`,
      Array.from(newBlocked)
    );

    // 3) ainda existe algum caminho até o lado objetivo (pode andar pra trás)
    const pathResults = players.map((player) => {
      const hasPath = hasPathToGoal(player, newBlocked);
      console.log(
        `[CLIENT PATHFINDING] Player ${player.name} at (${player.row},${
          player.col
        }) goal ${player.goalSide}: ${hasPath ? "✅ HAS PATH" : "❌ BLOCKED"}`
      );
      return hasPath;
    });

    const allHavePath = pathResults.every((hasPath) => hasPath);

    if (!allHavePath) {
      const blockedPlayers = players.filter((_, i) => !pathResults[i]);
      console.error(
        `[CLIENT PATHFINDING] BLOCKING! Players trapped:`,
        blockedPlayers.map((p) => p.name)
      );
      if (!silent)
        toast.error(
          `This barrier would block ${blockedPlayers[0]?.name ?? "a player"} from their goal`
        );
      return {
        ok: false,
        baseRow,
        baseCol,
        orientation,
        edgesToAdd,
      };
    }

    console.log(`[CLIENT PATHFINDING] All players can still reach goals ✅`);

    return {
      ok: true,
      baseRow,
      baseCol,
      orientation,
      edgesToAdd,
    };
  }

  function handleCellClick(row: number, col: number) {
    // Turn validation for multiplayer
    if (disabled) {
      console.log("🚫 Not your turn!");
      return;
    }

    if (winner !== null) return;
    if (mode === "move") {
      handleMove(row, col);
    } else {
      handleWallClick(row, col);
    }
  }

  function handleMove(row: number, col: number) {
    if (!canMoveTo(row, col)) return;

    const cur = currentPlayer;
    pushSnapshot();

    const newPlayers = players.map((p) =>
      p.id === cur.id ? { ...p, row, col } : p
    );

    const isWinningMove = isGoal(row, col, cur.goalSide);

    updateGameState({
      players: newPlayers,
      currentPlayerId: isWinningMove
        ? currentPlayerId
        : nextPlayerId(currentPlayerId),
      winner: isWinningMove ? cur.id : winner,
    });
  }

  function handleWallClick(row: number, col: number) {
    const result = checkWallPlacement(row, col, { silent: false });
    if (!result.ok) return;

    const { baseRow, baseCol, orientation, edgesToAdd } = result;

    pushSnapshot();

    const newBlocked = new Set(blockedEdges);
    edgesToAdd.forEach((e) => newBlocked.add(e));

    const newBarrier: Barrier = {
      row: baseRow,
      col: baseCol,
      orientation,
      id: `${baseRow}-${baseCol}-${orientation}-${Date.now()}-${Math.random()}`,
      placedBy: currentPlayer.id,
    };

    const newPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, wallsLeft: p.wallsLeft - 1 } : p
    );

    updateGameState({
      players: newPlayers,
      blockedEdges: Array.from(newBlocked),
      barriers: [...barriers, newBarrier],
      currentPlayerId: nextPlayerId(currentPlayerId),
    });
  }

  function handleRestart() {
    // For controlled mode, don't allow restart (handle in parent)
    if (isControlled) {
      console.log("⚠️ Restart not available in multiplayer mode");
      return;
    }

    setLocalPlayers(createInitialPlayers());
    setLocalBlockedEdges(new Set());
    setLocalBarriers([]);
    setLocalCurrentPlayerId(0);
    setMode("move");
    setLocalWinner(null);
    setHistory([]);
    setHoveredCell(null);
  }

  // ---------- Render do tabuleiro ----------

  const cells: JSX.Element[] = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const playerOnCell = cellOccupied(row, col);

      const isHovered =
        hoveredCell && hoveredCell.row === row && hoveredCell.col === col;

      let background = "#020617";
      const borderColor = "#1f2937";

      // Goal zones: show player color on OPPOSITE border (where they're trying to reach)
      // Player 0 (RED) starts at LEFT (col=0), goal is RIGHT (col=SIZE-1)
      // Player 1 (BLUE) starts at TOP (row=0), goal is BOTTOM (row=SIZE-1)
      // Player 2 (GREEN) starts at RIGHT (col=SIZE-1), goal is LEFT (col=0)
      // Player 3 (YELLOW) starts at BOTTOM (row=SIZE-1), goal is TOP (row=0)
      if (row === 0) {
        background = PLAYER_BASE_COLORS[3]; // Yellow's goal (starts at BOTTOM)
      }
      if (row === SIZE - 1) {
        background = PLAYER_BASE_COLORS[1]; // Blue's goal (starts at TOP)
      }
      if (col === 0) {
        background = PLAYER_BASE_COLORS[2]; // Green's goal (starts at RIGHT)
      }
      if (col === SIZE - 1) {
        background = PLAYER_BASE_COLORS[0]; // Red's goal (starts at LEFT)
      }

      // hover de jogada válida
      let isAllowedHover = false;
      if (isHovered) {
        if (mode === "move") {
          isAllowedHover = canMoveTo(row, col);
        } else {
          const result = checkWallPlacement(row, col, { silent: true });
          isAllowedHover = result.ok;
        }
      }

      const pawn = playerOnCell ? (
        <div
          style={{
            width: "70%",
            height: "70%",
            borderRadius: "999px",
            background: playerOnCell.color,
            border: "2px solid #f9fafb",
            boxShadow: "0 0 10px rgba(249,250,251,0.8)",
          }}
        />
      ) : null;

      cells.push(
        <button
          key={`${row}-${col}`}
          onClick={() => handleCellClick(row, col)}
          onMouseEnter={() => setHoveredCell({ row, col })}
          onMouseLeave={() => {
            setHoveredCell((prev) =>
              prev && prev.row === row && prev.col === col ? null : prev
            );
          }}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            background,
            border: `1px solid ${borderColor}`,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            cursor:
              winner !== null
                ? "default"
                : isAllowedHover
                ? "pointer"
                : "not-allowed",
            boxShadow: isAllowedHover
              ? `0 0 0 2px ${
                  mode === "move" ? currentPlayer.color : "#facc15"
                } inset`
              : "none",
            transition: "box-shadow 0.08s ease-out, background 0.08s ease-out",
          }}
        >
          {pawn}

          {/* Display row/column numbers on border cells */}
          {(row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                pointerEvents: "none",
              }}
            >
              {row === 0 || row === SIZE - 1 ? col : row}
            </div>
          )}
        </button>
      );
    }
  }

  // barreiras (reais + fantasma)
  const barrierOverlays: JSX.Element[] = [];
  const cellPercent = 100 / SIZE;

  function renderBarrier(b: Barrier, opts?: { ghost?: boolean }): JSX.Element {
    const ghost = opts?.ghost ?? false;

    // Get the color of the player who placed the barrier
    // For ghost barriers, use current player's color
    // For placed barriers, use the placedBy player's color (fallback to yellow for old barriers)
    let barrierColor: string;
    if (ghost) {
      barrierColor = currentPlayer.color;
    } else if (b.placedBy !== undefined) {
      const placer = players.find((p) => p.id === b.placedBy);
      barrierColor = placer?.color ?? "#facc15";
    } else {
      barrierColor = "#facc15"; // Default yellow for backwards compatibility
    }

    // Create rgba version for ghost barriers
    const ghostColor = barrierColor.startsWith("#")
      ? `${barrierColor}66` // Add 40% opacity
      : barrierColor.replace(")", ", 0.4)").replace("rgb", "rgba");

    if (b.orientation === "H") {
      const top = (b.row + 1) * cellPercent;
      const left = (b.col + 1) * cellPercent;
      return (
        <div
          key={b.id + (ghost ? "-ghost" : "")}
          style={{
            position: "absolute",
            top: `${top}%`,
            left: `${left}%`,
            transform: "translate(-50%, -50%)",
            width: `${cellPercent * 2 * 0.9}%`,
            height: 4,
            background: ghost ? ghostColor : barrierColor,
            boxShadow: ghost
              ? `0 0 6px ${ghostColor}`
              : `0 0 10px ${barrierColor}`,
            borderRadius: 999,
            pointerEvents: "none",
          }}
        />
      );
    } else {
      const top = (b.row + 1) * cellPercent;
      const left = (b.col + 1) * cellPercent;
      return (
        <div
          key={b.id + (ghost ? "-ghost" : "")}
          style={{
            position: "absolute",
            top: `${top}%`,
            left: `${left}%`,
            transform: "translate(-50%, -50%)",
            width: 4,
            height: `${cellPercent * 2 * 0.9}%`,
            background: ghost ? ghostColor : barrierColor,
            boxShadow: ghost
              ? `0 0 6px ${ghostColor}`
              : `0 0 10px ${barrierColor}`,
            borderRadius: 999,
            pointerEvents: "none",
          }}
        />
      );
    }
  }

  // barreiras reais
  for (const b of barriers) {
    barrierOverlays.push(renderBarrier(b));
  }

  // barreira fantasma (hover)
  let ghostBarrier: JSX.Element | null = null;
  if (mode === "wall" && hoveredCell) {
    const res = checkWallPlacement(hoveredCell.row, hoveredCell.col, {
      silent: true,
    });
    if (res.ok) {
      const ghost: Barrier = {
        row: res.baseRow,
        col: res.baseCol,
        orientation: res.orientation,
        id: "ghost",
      };
      ghostBarrier = renderBarrier(ghost, { ghost: true });
    }
  }

  const statusText = (() => {
    if (winner !== null) {
      const p = players.find((pl) => pl.id === winner)!;
      return `${p.name} venceu!`;
    }
    return `Vez de ${currentPlayer.label} (${
      mode === "move" ? "mover peão" : "colocar barreira"
    })`;
  })();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
        background: "radial-gradient(circle at top, #020617, #000000)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            Bloqueio – 4 jogadores (9x9 interno + borda)
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Objetivo: atravessar o tabuleiro interno e alcançar a borda oposta.
            Cada jogador tem 6 barreiras (2 casas em linha reta). Os peões andam
            1 casa ortogonal ou podem pular em linha reta por cima de outro
            peão.
          </p>
          <p
            style={{
              fontSize: "0.95rem",
              padding: "0.3rem 0.8rem",
              borderRadius: 999,
              background: currentPlayer.color,
              border: "1px solid #1f2937",
            }}
          >
            {statusText}
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          {/* Tabuleiro + coordenadas */}
          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
              maxWidth: 600,
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              background: "transparent",
              padding: "1.8rem",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "0.75rem",
                overflow: "hidden",
                border: "1px solid #1f2937",
                background: "#020617",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
                  width: "100%",
                  height: "100%",
                }}
              >
                {cells}
              </div>

              {barrierOverlays}
              {ghostBarrier}
            </div>
          </div>

          {/* Painel lateral */}
          <aside
            style={{
              flex: "1 1 200px",
              minWidth: 220,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #1f2937",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Ações
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode("move")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: 999,
                    border:
                      mode === "move"
                        ? "2px solid #22c55e"
                        : "1px solid #1f2937",
                    background:
                      mode === "move"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Mover peão
                </button>
                <button
                  type="button"
                  onClick={() => setMode("wall")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: 999,
                    border:
                      mode === "wall"
                        ? "2px solid #facc15"
                        : "1px solid #1f2937",
                    background:
                      mode === "wall"
                        ? "rgba(250,204,21,0.15)"
                        : "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Colocar barreira
                </button>
                {!isControlled && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: 999,
                      border: "1px solid #1f2937",
                      background:
                        history.length === 0
                          ? "rgba(15,23,42,0.5)"
                          : "rgba(15,23,42,0.9)",
                      color: history.length === 0 ? "#4b5563" : "#e5e7eb",
                      fontSize: "0.85rem",
                      cursor: history.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Desfazer
                  </button>
                )}
                {!isControlled && (
                  <button
                    type="button"
                    onClick={handleRestart}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: 999,
                      border: "1px solid #1f2937",
                      background: "rgba(15,23,42,0.9)",
                      color: "#e5e7eb",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Reiniciar
                  </button>
                )}
              </div>

              {mode === "wall" && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginBottom: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setWallOrientation("H")}
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: 999,
                      border:
                        wallOrientation === "H"
                          ? "2px solid #facc15"
                          : "1px solid #1f2937",
                      background:
                        wallOrientation === "H"
                          ? "rgba(250,204,21,0.15)"
                          : "rgba(15,23,42,1)",
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Barreira horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallOrientation("V")}
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: 999,
                      border:
                        wallOrientation === "V"
                          ? "2px solid #facc15"
                          : "1px solid #1f2937",
                      background:
                        wallOrientation === "V"
                          ? "rgba(250,204,21,0.15)"
                          : "rgba(15,23,42,1)",
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Barreira vertical
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #1f2937",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Jogadores
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {players.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: p.color,
                        border: "1px solid #f9fafb",
                      }}
                    />
                    <span
                      style={{
                        fontWeight:
                          currentPlayerId === p.id && winner === null
                            ? 700
                            : 500,
                      }}
                    >
                      {p.name}
                    </span>
                    <span style={{ color: "#9ca3af", marginLeft: "auto" }}>
                      Barreiras: {p.wallsLeft}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
