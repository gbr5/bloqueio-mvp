# Bloqueio Online - Game Rules Reference

> Official game rules for Bloqueio Online, a 4-player strategy board game similar to Quoridor.

---

## Overview

Bloqueio is a strategic board game where 4 players compete to cross the board and reach their goal zone on the opposite side. Players take turns either moving their pawn or placing barriers to block opponents.

---

## Board Setup

### Grid Configuration

- **Total Grid**: 11x11 cells (including borders)
- **Playable Area**: 9x9 inner cells
- **Border Cells**: Colored goal zones on each edge

### Visual Layout

```
     A   B   C   D   E   F   G   H   I
   ┌───────────────────────────────────┐
   │  RED GOAL ZONE (Player 0 target)  │  ← Row 0
   ├───┬───┬───┬───┬───┬───┬───┬───┬───┤
 1 │   │   │   │   │ R │   │   │   │   │  ← Player 0 starts
   ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 2 │   │   │   │   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 3 │   │   │   │   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 4 │   │   │   │   │   │   │   │   │   │
 Y ├───┼───┼───┼───┼───┼───┼───┼───┼───┤        B
 E │ Y │   │   │   │   │   │   │   │ B │ ← P3   L
 L ├───┼───┼───┼───┼───┼───┼───┼───┼───┤   P1 → U
 L │   │   │   │   │   │   │   │   │   │        E
 O ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 W │   │   │   │   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 8 │   │   │   │   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┼───┼───┼───┼───┤
 9 │   │   │   │   │ G │   │   │   │   │  ← Player 2 starts
   ├───┴───┴───┴───┴───┴───┴───┴───┴───┤
   │ GREEN GOAL ZONE (Player 2 target) │  ← Row 10
   └───────────────────────────────────┘

   Col 0 = Yellow Goal    Col 10 = Blue Goal
   (Player 3 target)      (Player 1 target)
```

---

## Players

### Starting Positions

| Player    | ID  | Color   | Hex Code  | Start Position | Goal Side |
| --------- | --- | ------- | --------- | -------------- | --------- |
| Jogador 1 | 0   | Red     | `#ef4444` | Row 1, Col 5   | BOTTOM    |
| Jogador 2 | 1   | Blue    | `#3b82f6` | Row 5, Col 9   | LEFT      |
| Jogador 3 | 2   | Green   | `#22c55e` | Row 9, Col 5   | TOP       |
| Jogador 4 | 3   | Yellow  | `#f59e0b` | Row 5, Col 1   | RIGHT     |

### Resources

- **Barriers per player**: 6
- **Turn order**: Player 0 → Player 1 → Player 2 → Player 3 → (repeat)

---

## Turn Actions

On each turn, a player MUST do exactly ONE of the following:

### Option 1: Move Pawn

Move your pawn to an adjacent cell following the movement rules.

### Option 2: Place Barrier

Place one of your barriers on the board (if you have any remaining).

---

## Movement Rules

### Basic Movement

- Move **1 cell orthogonally** (up, down, left, or right)
- **Cannot** move diagonally
- **Cannot** move through barriers
- **Cannot** occupy a cell with another pawn

### Jump Movement

When an opponent's pawn is directly adjacent to yours:

1. **Straight Jump**: Jump 2 cells in a straight line over the opponent
   - Only valid if no barrier blocks the path
   - The landing cell must be empty

2. **Diagonal Jump**: If a straight jump is blocked by a barrier or board edge
   - Jump one cell straight (over the opponent)
   - Then one cell to either side (left or right of the jump direction)
   - The landing cell must be empty

```
Example - Straight Jump:
  Before:        After:
  ┌───┬───┬───┐  ┌───┬───┬───┐
  │   │ B │   │  │   │ B │ R │
  ├───┼───┼───┤  ├───┼───┼───┤
  │ R │   │   │  │   │   │   │
  └───┴───┴───┘  └───┴───┴───┘
  R jumps over B

Example - Diagonal Jump (wall blocking straight):
  Before:          After (two options):
  ┌───┬───┬───┐    ┌───┬───┬───┐
  │   │ B │ ║ │    │ R │ B │ ║ │  ← R can land here
  ├───┼───┼─║─┤    ├───┼───┼─║─┤
  │ R │   │   │    │   │   │   │
  └───┴───┴───┘    └───┴───┴───┘
                   OR land below B
```

### Border Cell Restrictions

- Players **cannot** enter border cells (Row 0, Row 10, Col 0, Col 10)
- **Exception**: A player CAN enter their own goal zone border

---

## Barrier Rules

### Barrier Properties

- **Size**: Spans 2 cells (blocks the edge between 2 pairs of adjacent cells)
- **Orientations**:
  - **Horizontal (H)**: Blocks vertical movement between two rows
  - **Vertical (V)**: Blocks horizontal movement between two columns

### Barrier Placement

```
Horizontal Barrier:          Vertical Barrier:
┌───┬───┬───┬───┐            ┌───┬───┬───┬───┐
│   │   │   │   │            │   │   ║   │   │
├───┼═══╪═══┼───┤            ├───┼───║───┼───┤
│   │   │   │   │            │   │   ║   │   │
└───┴───┴───┴───┘            └───┴───┴───┴───┘
    ═══════ H barrier            ║ V barrier
```

### Placement Restrictions

1. **No Overlapping**: Cannot place a barrier where edges are already blocked
2. **No Crossing**: Cannot cross an existing barrier in an X pattern at the same intersection
3. **Path Requirement**: Every player must still have at least one valid path to their goal
4. **No Border Placement**: Barriers cannot be placed on border cells (goal zones)

### Valid vs Invalid Placement

```
VALID - Adjacent barriers:     INVALID - Crossing barriers:
┌───┬───┬───┬───┐              ┌───┬───┬───┬───┐
│   │   │   │   │              │   │   ║   │   │
├───┼═══╪═══┼───┤              ├───┼═══╬═══┼───┤  ← X crossing
│   │   │   │   │              │   │   ║   │   │
├───┼───┼═══╪═══┤              └───┴───┴───┴───┘
│   │   │   │   │
└───┴───┴───┴───┘

INVALID - Blocking all paths:
If a barrier would make it impossible for ANY player
to reach their goal, it cannot be placed.
```

---

## Winning the Game

### Victory Condition

A player wins immediately when their pawn enters **any cell** in their goal zone (the opposite border row/column from their starting position).

| Player    | Wins by reaching |
| --------- | ---------------- |
| Jogador 1 | Row 10 (Bottom)  |
| Jogador 2 | Col 0 (Left)     |
| Jogador 3 | Row 0 (Top)      |
| Jogador 4 | Col 10 (Right)   |

### Game End

- The game ends immediately when a player wins
- No additional turns are played
- Other players do not get a "final turn"

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│                  BLOQUEIO QUICK REF                 │
├─────────────────────────────────────────────────────┤
│  EACH TURN: Move pawn OR Place barrier (not both)  │
├─────────────────────────────────────────────────────┤
│  MOVEMENT:                                          │
│  • 1 cell orthogonally (up/down/left/right)        │
│  • Jump over adjacent pawn (2 cells straight)      │
│  • Diagonal jump if straight blocked               │
│  • Cannot pass through barriers                    │
│  • Cannot enter other players' goal zones          │
├─────────────────────────────────────────────────────┤
│  BARRIERS:                                          │
│  • 6 per player                                    │
│  • Spans 2 cells                                   │
│  • Horizontal or Vertical                          │
│  • Cannot overlap or cross existing barriers       │
│  • Must leave path to goal for ALL players         │
│  • Cannot be placed on border cells                │
├─────────────────────────────────────────────────────┤
│  WIN: Reach your goal zone (opposite border)       │
└─────────────────────────────────────────────────────┘
```

---

## Glossary

| Term | Definition |
| ---- | ---------- |
| **Pawn** | The player's piece that moves on the board |
| **Barrier/Wall** | A 2-cell blocker that prevents movement |
| **Goal Zone** | The border row/column a player must reach to win |
| **Orthogonal** | Movement in cardinal directions (not diagonal) |
| **Jump** | Moving over an adjacent opponent's pawn |
| **Edge** | The boundary between two adjacent cells |
| **BFS** | Breadth-First Search - algorithm to verify paths exist |

---

## Technical Notes

### Coordinate System

- **Rows**: 0-10 (top to bottom)
- **Columns**: 0-10 (left to right)
- **Display Labels**: Columns A-I, Rows 1-9 (for inner grid only)

### Edge Key Format

Edges between cells are stored as strings: `"r1,c1-r2,c2"` where (r1,c1) < (r2,c2) lexicographically.

### Barrier Storage

```typescript
type Barrier = {
  row: number;           // Top row of 2x2 block
  col: number;           // Left column of 2x2 block
  orientation: 'H' | 'V';
  id: string;            // Unique identifier
};
```

---

*Last updated: December 13, 2025*
