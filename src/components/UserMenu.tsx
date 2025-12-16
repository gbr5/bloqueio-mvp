/**
 * UserMenu Component
 *
 * Displays logged-in user info and provides:
 * - User name/avatar display
 * - Sign out button
 * - Game stats (optional)
 */

"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      onSignOut?.();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    setSigningOut(false);
    setIsOpen(false);
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full transition-colors"
      >
        {/* Avatar */}
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {initials}
          </div>
        )}

        {/* Name */}
        <span className="text-white font-medium hidden sm:block">
          {user.name}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-slate-400 text-sm truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
