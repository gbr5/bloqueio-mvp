/**
 * Test suite for two-player game mode
 * Ensures 2P mode initializes correctly with 12 barriers per player
 */

import { describe, test, expect } from "@jest/globals";
import { getGameModeConfig } from "../src/types/game";

describe("Two-Player Mode Configuration", () => {
  test("should have correct configuration for TWO_PLAYER mode", () => {
    const config = getGameModeConfig("TWO_PLAYER");

    expect(config.maxPlayers).toBe(2);
    expect(config.minPlayers).toBe(2);
    expect(config.wallsPerPlayer).toBe(12);
    expect(config.playerSlots).toEqual([0, 2]); // Top and Bottom positions
  });

  test("should have correct configuration for FOUR_PLAYER mode", () => {
    const config = getGameModeConfig("FOUR_PLAYER");

    expect(config.maxPlayers).toBe(4);
    expect(config.minPlayers).toBe(2);
    expect(config.wallsPerPlayer).toBe(6);
    expect(config.playerSlots).toEqual([0, 1, 2, 3]); // All positions
  });

  test("should return only top and bottom players for 2P mode", () => {
    const config = getGameModeConfig("TWO_PLAYER");
    
    // In a real implementation, createInitialPlayers would use this config
    const playerSlots = config.playerSlots;
    
    expect(playerSlots.length).toBe(2);
    expect(playerSlots).toContain(0); // Top player
    expect(playerSlots).toContain(2); // Bottom player
    expect(playerSlots).not.toContain(1); // No right player
    expect(playerSlots).not.toContain(3); // No left player
  });
});
