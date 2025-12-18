/**
 * Seeded PRNG (Pseudo-Random Number Generator)
 * Ensures deterministic, reproducible bot moves
 * NO Math.random() - all randomness is seeded
 */

/**
 * Linear Congruential Generator (simple, fast, deterministic)
 * Good enough for game AI (not cryptographic)
 */
export class SeededRNG {
  private state: number;

  /**
   * Initialize with seed string
   * Hash the string to a number for consistent initialization
   */
  constructor(seed: string) {
    this.state = this.hashSeed(seed);
  }

  /**
   * Generate next random number in [0, 1)
   * Uses LCG formula: x_{n+1} = (a*x_n + c) mod m
   */
  next(): number {
    // Standard LCG parameters (Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = 2147483647; // 2^31 - 1

    this.state = (a * this.state + c) % m;
    return this.state / m;
  }

  /**
   * Generate next integer in [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array in-place using Fisher-Yates
   * Deterministic because uses this.next()
   */
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Hash string to seed number
   * Simple FNV-1a hash adapted to return number
   */
  private hashSeed(str: string): number {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime
    }
    // Ensure positive integer
    return Math.abs(hash) || 1;
  }
}

/**
 * Global RNG instances by room code
 * Ensures same bot makes same decisions on replay
 */
const rngCache = new Map<string, SeededRNG>();

/**
 * Get or create RNG for room
 * Seed: `${room.botSeed}:${turnNumber}:${playerId}`
 */
export function getRNG(seed: string): SeededRNG {
  if (!rngCache.has(seed)) {
    rngCache.set(seed, new SeededRNG(seed));
  }
  return rngCache.get(seed)!;
}

/**
 * Clear RNG cache (for testing)
 */
export function clearRNGCache(): void {
  rngCache.clear();
}
