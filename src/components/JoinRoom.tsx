/**
 * JoinRoom Component
 *
 * Handles room joining flow:
 * 1. Input 6-character room code
 * 2. Validate code format
 * 3. Look up room in database
 * 4. Navigate to waiting lobby
 */

"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { joinRoom } from "@/lib/actions/room-actions";

interface JoinRoomProps {
  onCancel: () => void;
}

export function JoinRoom({ onCancel }: JoinRoomProps) {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (sanitized.length > 1) return;

    const newCode = [...code];
    newCode[index] = sanitized;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 characters entered
    if (index === 5 && sanitized) {
      const fullCode = [...newCode.slice(0, 5), sanitized].join("");
      if (fullCode.length === 6) {
        handleJoin(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      setError(null);
      inputRefs.current[5]?.focus();
      handleJoin(pasted);
    }
  };

  const handleJoin = async (roomCode: string) => {
    setJoining(true);
    setError(null);

    try {
      const result = await joinRoom(roomCode);

      if ("error" in result) {
        setError(result.error);
        setJoining(false);
        return;
      }

      // Store player ID in sessionStorage
      sessionStorage.setItem(`room_${roomCode}_playerId`, String(result.playerId));

      // Navigate to lobby
      router.push(`/room/${roomCode}/lobby`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setJoining(false);
    }
  };

  const handleManualSubmit = () => {
    const fullCode = code.join("");
    if (fullCode.length === 6) {
      handleJoin(fullCode);
    } else {
      setError("Please enter a 6-character room code");
    }
  };

  const isCodeComplete = code.every((char) => char !== "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="w-full max-w-md px-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Join Game
        </h1>

        {/* Room Code Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-4 text-center">
            Enter Room Code
          </label>
          <div className="flex justify-center gap-2 mb-2">
            {code.map((char, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                value={char}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-mono font-bold bg-slate-800 border-2 border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white uppercase transition-colors"
                disabled={joining}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-2">
            Paste or type the 6-character code
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleManualSubmit}
            disabled={!isCodeComplete || joining}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Joining...</span>
              </>
            ) : (
              "Join Room"
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={joining}
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400 text-center">
            Ask the host for the room code to join their game
          </p>
        </div>
      </div>
    </div>
  );
}
