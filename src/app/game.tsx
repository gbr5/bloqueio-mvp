"use client";

import { JSX, useState, useEffect } from "react";
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

const COL_LABELS = "ABCDEFGHI".split("");
const ROW_LABELS = Array.from({ length: INNER_SIZE }, (_, i) => String(i + 1));

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
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const queue: Cell[] = [{ row: player.row, col: player.col }];
  visited[player.row][player.col] = true;

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { row, col } = queue.shift() as Cell;
    if (isGoal(row, col, player.goalSide)) return true;

    for (const { dr, dc } of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (!isInside(nr, nc)) continue;
      if (visited[nr][nc]) continue;
      if (blockedEdges.has(edgeKey(row, col, nr, nc))) continue;

      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc });
    }
  }
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

  // 2) pulo em linha reta (2 casas)
  const isStraightTwo = (adr === 2 && adc === 0) || (adr === 0 && adc === 2);
  if (!isStraightTwo) return false;

  const midRow = player.row + (dr === 0 ? 0 : dr > 0 ? 1 : -1);
  const midCol = player.col + (dc === 0 ? 0 : dc > 0 ? 1 : -1);

  if (!isInside(midRow, midCol)) return false;

  const middlePawn = players.find((p) => p.row === midRow && p.col === midCol);
  if (!middlePawn) return false;

  if (
    blockedEdges.has(edgeKey(player.row, player.col, midRow, midCol)) ||
    blockedEdges.has(edgeKey(midRow, midCol, destRow, destCol))
  ) {
    return false;
  }

  return true;
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
  const isControlled = externalGameState !== undefined && onGameStateChange !== undefined;

  // Use external state if controlled, otherwise use local state
  const players = isControlled ? externalGameState.players : localPlayers;
  const blockedEdges = isControlled 
    ? new Set(externalGameState.blockedEdges) 
    : localBlockedEdges;
  const barriers = isControlled ? externalGameState.barriers : localBarriers;
  const currentPlayerId = isControlled ? externalGameState.currentPlayerId : localCurrentPlayerId;
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
      if (updates.blockedEdges) setLocalBlockedEdges(new Set(updates.blockedEdges));
      if (updates.barriers) setLocalBarriers(updates.barriers);
      if (updates.currentPlayerId !== undefined) setLocalCurrentPlayerId(updates.currentPlayerId);
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
      if (!silent) alert("Você não tem mais barreiras disponíveis.");
      return {
        ok: false,
        baseRow: 0,
        baseCol: 0,
        orientation: wallOrientation,
        edgesToAdd: [],
      };
    }

    // Barreiras podem encostar na faixa colorida,
    // então baseRow/baseCol vão de 0 até SIZE-2.
    const baseRow = Math.max(0, Math.min(clickRow, SIZE - 2));
    const baseCol = Math.max(0, Math.min(clickCol, SIZE - 2));

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

    // 1) não pode reutilizar arestas
    const anyAlreadyBlocked = edgesToAdd.some((e) => blockedEdges.has(e));
    if (anyAlreadyBlocked) {
      if (!silent) alert("Já existe uma barreira ocupando esse espaço.");
      return {
        ok: false,
        baseRow,
        baseCol,
        orientation,
        edgesToAdd,
      };
    }

    // 2) não pode cruzar outra barreira em X no mesmo bloco 2x2
    const crossesExisting = barriers.some(
      (b) =>
        b.row === baseRow && b.col === baseCol && b.orientation !== orientation
    );
    if (crossesExisting) {
      if (!silent)
        alert("Não é permitido cruzar barreiras em X no mesmo espaço.");
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

    // 3) ainda existe algum caminho até o lado objetivo (pode andar pra trás)
    const allHavePath = players.every((player) =>
      hasPathToGoal(player, newBlocked)
    );
    if (!allHavePath) {
      if (!silent)
        alert(
          "Essa barreira cortaria completamente o caminho de pelo menos um jogador."
        );
      return {
        ok: false,
        baseRow,
        baseCol,
        orientation,
        edgesToAdd,
      };
    }

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
      currentPlayerId: isWinningMove ? currentPlayerId : nextPlayerId(currentPlayerId),
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

      // bases nas bordas externas (como você ajustou)
      if (row === 0) {
        background = PLAYER_BASE_COLORS[0];
      }
      if (row === SIZE - 1) {
        background = PLAYER_BASE_COLORS[2];
      }
      if (col === 0) {
        background = PLAYER_BASE_COLORS[3];
      }
      if (col === SIZE - 1) {
        background = PLAYER_BASE_COLORS[1];
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
        </button>
      );
    }
  }

  // barreiras (reais + fantasma)
  const barrierOverlays: JSX.Element[] = [];
  const cellPercent = 100 / SIZE;

  function renderBarrier(b: Barrier, opts?: { ghost?: boolean }): JSX.Element {
    const ghost = opts?.ghost ?? false;

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
            background: ghost ? "rgba(250,204,21,0.4)" : "#facc15",
            boxShadow: ghost
              ? "0 0 6px rgba(250,204,21,0.5)"
              : "0 0 10px rgba(250,204,21,0.9)",
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
            background: ghost ? "rgba(250,204,21,0.4)" : "#facc15",
            boxShadow: ghost
              ? "0 0 6px rgba(250,204,21,0.5)"
              : "0 0 10px rgba(250,204,21,0.9)",
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

              {/* Turn validation overlay - show when it's not the player's turn in multiplayer */}
              {disabled && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.5rem",
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "2px solid #1f2937",
                      borderRadius: "0.75rem",
                      color: "#e5e7eb",
                      fontSize: "1rem",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    Aguardando {currentPlayer.name}...
                  </div>
                </div>
              )}

              {/* Colunas A–I (cima/baixo) mapeadas para colunas internas 1..SIZE-2 */}
              {COL_LABELS.map((label, idx) => {
                const colIndex = idx + 1; // interno
                const left = ((colIndex + 0.5) * 100) / SIZE;
                return (
                  <span
                    key={`top-${label}`}
                    style={{
                      position: "absolute",
                      top: "-1.4rem",
                      left: `${left}%`,
                      transform: "translateX(-50%)",
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
              {COL_LABELS.map((label, idx) => {
                const colIndex = idx + 1;
                const left = ((colIndex + 0.5) * 100) / SIZE;
                return (
                  <span
                    key={`bottom-${label}`}
                    style={{
                      position: "absolute",
                      bottom: "-1.4rem",
                      left: `${left}%`,
                      transform: "translateX(-50%)",
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    {label}
                  </span>
                );
              })}

              {/* Linhas 1–9 (esquerda/direita) mapeadas para linhas internas 1..SIZE-2 */}
              {ROW_LABELS.map((label, idx) => {
                const rowIndex = idx + 1;
                const top = ((rowIndex + 0.5) * 100) / SIZE;
                return (
                  <span
                    key={`left-${label}`}
                    style={{
                      position: "absolute",
                      left: "-1.4rem",
                      top: `${top}%`,
                      transform: "translateY(-50%)",
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
              {ROW_LABELS.map((label, idx) => {
                const rowIndex = idx + 1;
                const top = ((rowIndex + 0.5) * 100) / SIZE;
                return (
                  <span
                    key={`right-${label}`}
                    style={{
                      position: "absolute",
                      right: "-1.4rem",
                      top: `${top}%`,
                      transform: "translateY(-50%)",
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
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
                      opacity: winner !== null && winner !== p.id ? 0.5 : 1,
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
