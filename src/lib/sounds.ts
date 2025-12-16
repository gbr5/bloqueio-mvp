/**
 * Sound Effects Utility
 *
 * Uses Web Audio API to play simple synthesized sounds
 * No external audio files needed
 */

type SoundType = "error" | "success" | "info" | "warning";

// Cache the AudioContext for reuse
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a synthesized sound effect
 */
export function playSound(type: SoundType): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case "error":
      // Low descending tone for errors
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case "success":
      // Rising pleasant tone for success
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
      break;

    case "warning":
      // Two-tone alert for warnings
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(500, now);
      oscillator.frequency.setValueAtTime(400, now + 0.1);
      oscillator.frequency.setValueAtTime(500, now + 0.2);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case "info":
    default:
      // Soft notification ping
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
  }
}

/**
 * Play a "your turn" notification sound
 * A pleasant ascending chime to alert the player it's their turn
 */
export function playTurnSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Play a pleasant two-note chime
  // First note
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(523.25, now); // C5
  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Second note (higher, slightly delayed)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.25, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.45);

  // Third note (even higher, completing the chord)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(783.99, now + 0.3); // G5
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.setValueAtTime(0.2, now + 0.3);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  osc3.start(now + 0.3);
  osc3.stop(now + 0.6);
}
