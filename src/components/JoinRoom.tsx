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

import { useState, useRef, ChangeEvent, KeyboardEvent } from "react";

interface JoinRoomProps {
  onRoomJoined: (roomCode: string) => void;
  onCancel: () => void;
}

export function JoinRoom({ onRoomJoined, onCancel }: JoinRoomProps) {
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
      // This will be filled in when we integrate with useGameRoom
      // For now, just simulate room lookup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock validation - will be replaced with real DB lookup
      if (roomCode === "INVALID") {
        throw new Error("Room not found");
      }

      onRoomJoined(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setJoining(false);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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

        <div className="space-y-6">
          <p className="text-center text-slate-300">
            Enter the 6-character room code
          </p>

          {/* Code Input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
                disabled={joining}
                className="w-12 h-16 text-center text-2xl font-mono font-bold bg-slate-800 border-2 border-slate-600 focus:border-blue-500 focus:outline-none rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleManualSubmit}
              disabled={!isCodeComplete || joining}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
            >
              {joining ? "Joining..." : "Join Room"}
            </button>

            <button
              onClick={onCancel}
              disabled={joining}
              className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-center text-slate-500">
            Tip: You can paste the full code
          </p>
        </div>
      </div>
    </div>
  );
}
