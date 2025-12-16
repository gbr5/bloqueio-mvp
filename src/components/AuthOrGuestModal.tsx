/**
 * AuthOrGuestModal Component
 *
 * Modal that prompts users to either:
 * 1. Sign in / Create account (opens AuthModal)
 * 2. Continue as guest (enter a display name)
 *
 * Used before creating or joining a game room.
 */

"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalTitle, ModalDescription } from "./Modal";
import { AuthModal } from "./AuthModal";

interface AuthOrGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void; // Called after successful auth or guest name entry
}

export function AuthOrGuestModal({
  isOpen,
  onClose,
  onComplete,
}: AuthOrGuestModalProps) {
  const [view, setView] = useState<"choice" | "guest">("choice");
  const [guestName, setGuestName] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = guestName.trim();
    if (!trimmedName) {
      setError("Por favor, insira seu nome");
      return;
    }

    if (trimmedName.length < 2) {
      setError("O nome deve ter pelo menos 2 caracteres");
      return;
    }

    if (trimmedName.length > 20) {
      setError("O nome deve ter no máximo 20 caracteres");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Set guest name in cookie via server action
      const { setGuestNameAction } = await import("@/lib/actions/guest-actions");
      await setGuestNameAction(trimmedName);

      // Also store in localStorage for immediate access
      localStorage.setItem("guest_name", trimmedName);

      onComplete();
      onClose();
    } catch {
      setError("Erro ao salvar nome. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onComplete();
    onClose();
  };

  const handleClose = () => {
    setView("choice");
    setGuestName("");
    setError(null);
    onClose();
  };

  // Auth modal
  if (showAuthModal) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      ariaLabel="Identificação do jogador"
    >
      {view === "choice" ? (
        <>
          <ModalHeader>
            <ModalTitle>Como deseja jogar?</ModalTitle>
            <ModalDescription>
              Crie uma conta para salvar suas estatísticas ou jogue como
              convidado.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 mt-6">
            {/* Sign In / Create Account Option */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Entrar / Criar Conta
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-800 text-slate-400">ou</span>
              </div>
            </div>

            {/* Guest Option */}
            <button
              onClick={() => setView("guest")}
              className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Jogar como Convidado
            </button>
          </div>

          {/* Info text */}
          <p className="mt-6 text-center text-slate-400 text-sm">
            Convidados podem jogar normalmente, mas suas estatísticas não serão
            salvas.
          </p>
        </>
      ) : (
        <>
          <ModalHeader>
            <ModalTitle>Digite seu nome</ModalTitle>
            <ModalDescription>
              Este nome será exibido para os outros jogadores.
            </ModalDescription>
          </ModalHeader>

          <form onSubmit={handleGuestSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Seu nome"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-slate-400">
                {guestName.length}/20 caracteres
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setView("choice");
                  setError(null);
                }}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !guestName.trim()}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {isSubmitting ? "Salvando..." : "Continuar"}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
