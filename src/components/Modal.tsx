"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;

  /**
   * Variant for different modal behaviors:
   * - "modal": slides from bottom on mobile, centered on desktop (default)
   * - "drawer": slides from bottom on mobile, right-side sheet on desktop
   */
  variant?: "modal" | "drawer";

  /** Prevent closing by Esc/backdrop when true (e.g., while pending) */
  disabled?: boolean;

  /** Close when pressing Escape (default: true) */
  closeOnEsc?: boolean;

  /** Close when clicking the backdrop (default: true) */
  closeOnBackdrop?: boolean;

  /** Lock page scroll while open (default: true) */
  lockScroll?: boolean;

  /** Trap focus within the dialog (default: true) */
  trapFocus?: boolean;

  /** Restore focus to the element that opened the modal (default: true) */
  restoreFocus?: boolean;

  /** If provided, focus this element on open instead of the first focusable element */
  initialFocusRef?: RefObject<HTMLElement | null>;

  /** ARIA label for the dialog if there is no visible heading tied with aria-labelledby */
  ariaLabel?: string;

  /** Container className (dialog panel) – you control all the design here */
  containerClassName?: string;

  /** Backdrop className for theme customization */
  backdropClassName?: string;

  /** Optional id to connect an external title via aria-labelledby */
  labelledById?: string;
}

/**
 * Mobile-first modal component:
 * - Renders in a portal to <body>
 * - Backdrop click to close (optional)
 * - Esc to close (optional)
 * - Focus trap + focus restore (optional)
 * - Scroll lock (optional)
 * - Mobile-first: slides from bottom on mobile, centered / right-drawer on desktop
 * - Design/layout is fully controlled by the caller via children + containerClassName
 */
export function Modal({
  open,
  onOpenChange,
  children,
  variant = "modal",
  disabled = false,
  closeOnEsc = true,
  closeOnBackdrop = true,
  lockScroll = true,
  trapFocus = true,
  restoreFocus = true,
  initialFocusRef,
  ariaLabel,
  containerClassName,
  backdropClassName,
  labelledById,
}: ModalProps) {
  const portalEl = useMemo(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-modal-portal", "true");
    return el;
  }, []);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  // Mount portal node
  useEffect(() => {
    if (!portalEl || typeof document === "undefined") return;
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // Track & restore focus to the trigger element
  useEffect(() => {
    if (!open) return;
    if (restoreFocus) {
      lastActiveElRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open, restoreFocus]);

  useEffect(() => {
    if (!open && restoreFocus && lastActiveElRef.current) {
      // Defer to allow unmount to finish
      const el = lastActiveElRef.current;
      queueMicrotask(() => {
        try {
          el.focus?.();
        } catch {
          // ignore
        }
      });
    }
  }, [open, restoreFocus]);

  // Scroll lock
  useLayoutEffect(() => {
    if (!open || !lockScroll || typeof document === "undefined") return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  // Close on Esc
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onOpenChange, disabled]);

  // Focus management (trap + initial focus)
  useEffect(() => {
    if (!open || !trapFocus) return;
    const root = dialogRef.current;
    if (!root) return;

    // Helper to collect focusable elements
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "area[href]",
            "button:not([disabled])",
            'input:not([disabled]):not([type="hidden"])',
            "select:not([disabled])",
            "textarea:not([disabled])",
            "iframe",
            "object",
            "embed",
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]',
          ].join(",")
        )
      ).filter(
        (el) =>
          el.offsetWidth > 0 ||
          el.offsetHeight > 0 ||
          el === document.activeElement
      );

    // Initial focus
    const firstFocusable = initialFocusRef?.current ?? focusables()[0] ?? root;
    firstFocusable?.focus?.();

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const currentIndex = els.indexOf(document.activeElement as HTMLElement);
      let nextIndex = currentIndex;
      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? els.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === els.length - 1 ? 0 : currentIndex + 1;
      }
      e.preventDefault();
      els[nextIndex]?.focus?.();
    };

    root.addEventListener("keydown", onKeydown);
    return () => root.removeEventListener("keydown", onKeydown);
  }, [open, trapFocus, initialFocusRef]);

  const onBackdropClick = useCallback(() => {
    if (!open || disabled) return;
    if (closeOnBackdrop) onOpenChange(false);
  }, [open, disabled, closeOnBackdrop, onOpenChange]);

  if (!open || !portalEl) return null;

  const backdrop = (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
        "animate-in fade-in duration-200",
        backdropClassName
      )}
      onClick={onBackdropClick}
      aria-hidden="true"
      data-interactive="true"
    />
  );

  const dialog = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex p-0",
        variant === "drawer"
          ? // Drawer: bottom sheet on mobile, RIGHT side sheet on desktop
            "items-end sm:items-stretch sm:justify-end"
          : // Modal: centered with padding on desktop
            "items-end sm:items-center justify-center sm:px-4"
      )}
      // Clicking the empty space around the panel behaves like the backdrop
      onClick={closeOnBackdrop && !disabled ? onBackdropClick : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledById}
        tabIndex={-1}
        // Stop bubbling so clicks inside content don't trigger backdrop close
        onClick={(e) => e.stopPropagation()}
        className={cn(
          variant === "drawer"
            ? // Drawer: bottom sheet on mobile, RIGHT-side sheet on desktop
              "w-full sm:w-[380px] sm:h-full rounded-t-3xl sm:rounded-r-none sm:rounded-l-3xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
            : // Modal: slide from bottom on mobile, scale in center on desktop
              "w-full rounded-t-3xl sm:rounded-3xl sm:max-w-lg animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:duration-200",
          // Ensure content is visible and within viewport
          "max-h-[90vh] sm:max-h-[85vh]",
          variant === "drawer" && "sm:max-h-full",
          // Default styling - dark theme for game
          "border border-slate-700 bg-slate-800 p-5 shadow-2xl overflow-y-auto",
          containerClassName
        )}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(
    <>
      {backdrop}
      {dialog}
    </>,
    portalEl
  );
}

// Helper components for consistent modal structure
interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

interface ModalTitleProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function ModalTitle({ children, className, id }: ModalTitleProps) {
  return (
    <h2
      id={id}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-white",
        className
      )}
    >
      {children}
    </h2>
  );
}

interface ModalDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function ModalDescription({
  children,
  className,
}: ModalDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-400 mt-1.5", className)}>{children}</p>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ModalCloseProps {
  children: ReactNode;
  className?: string;
  onClose: () => void;
}

export function ModalClose({ children, className, onClose }: ModalCloseProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70",
        "transition-opacity hover:opacity-100",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800",
        "disabled:pointer-events-none",
        className
      )}
    >
      {children}
      <span className="sr-only">Close</span>
    </button>
  );
}

export default Modal;
