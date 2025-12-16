/**
 * Toast Utility with Sound Effects
 *
 * Wrapper around sonner's toast that plays sounds
 */

import { toast as sonnerToast } from "sonner";
import { playSound } from "./sounds";

type ToastOptions = Parameters<typeof sonnerToast>[1];

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    playSound("success");
    return sonnerToast.success(message, options);
  },

  error: (message: string, options?: ToastOptions) => {
    playSound("error");
    return sonnerToast.error(message, options);
  },

  warning: (message: string, options?: ToastOptions) => {
    playSound("warning");
    return sonnerToast.warning(message, options);
  },

  info: (message: string, options?: ToastOptions) => {
    playSound("info");
    return sonnerToast.info(message, options);
  },

  // Default toast (no sound)
  message: (message: string, options?: ToastOptions) => {
    return sonnerToast(message, options);
  },
};
