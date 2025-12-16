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
