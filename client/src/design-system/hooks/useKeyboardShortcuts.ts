import { useEffect, useRef } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean; // CMD on Mac, Ctrl on Windows
  shiftKey?: boolean;
  altKey?: boolean;
  action: (event: KeyboardEvent) => void;
  description: string;
  preventDefault?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeShortcuts = shortcutsRef.current.filter(
        (shortcut) => shortcut.enabled !== false,
      );

      for (const shortcut of activeShortcuts) {
        const isMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.metaKey === !!shortcut.metaKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey;

        if (isMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action(event);
          break; // Only trigger the first matching shortcut
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

// Common shortcut patterns
export const createShortcut = {
  // CMD/Ctrl + Key shortcuts
  command: (
    key: string,
    action: (e: KeyboardEvent) => void,
    description: string,
  ): KeyboardShortcut => ({
    key,
    metaKey: true, // CMD on Mac, Ctrl on Windows (browser handles this)
    action,
    description: `⌘${key.toUpperCase()} - ${description}`,
  }),

  // CMD/Ctrl + Shift + Key shortcuts
  commandShift: (
    key: string,
    action: (e: KeyboardEvent) => void,
    description: string,
  ): KeyboardShortcut => ({
    key,
    metaKey: true,
    shiftKey: true,
    action,
    description: `⌘⇧${key.toUpperCase()} - ${description}`,
  }),

  // Simple key shortcuts
  simple: (
    key: string,
    action: (e: KeyboardEvent) => void,
    description: string,
  ): KeyboardShortcut => ({
    key,
    action,
    description: `${key.toUpperCase()} - ${description}`,
  }),

  // Escape shortcut
  escape: (
    action: (e: KeyboardEvent) => void,
    description: string = "Close dialog",
  ): KeyboardShortcut => ({
    key: "Escape",
    action,
    description: `ESC - ${description}`,
  }),

  // Enter shortcuts
  enter: (
    action: (e: KeyboardEvent) => void,
    description: string = "Submit",
  ): KeyboardShortcut => ({
    key: "Enter",
    action,
    description: `ENTER - ${description}`,
  }),

  // CMD + Enter for approval actions
  commandEnter: (
    action: (e: KeyboardEvent) => void,
    description: string = "Approve/Submit",
  ): KeyboardShortcut => ({
    key: "Enter",
    metaKey: true,
    action,
    description: `⌘ENTER - ${description}`,
  }),

  // CMD + Escape for delete/destructive actions
  commandEscape: (
    action: (e: KeyboardEvent) => void,
    description: string = "Delete/Remove",
  ): KeyboardShortcut => ({
    key: "Escape",
    metaKey: true,
    action,
    description: `⌘ESC - ${description}`,
  }),
};

// Hook for managing modal/dialog keyboard shortcuts
export function useModalShortcuts(
  isOpen: boolean,
  onClose: () => void,
  onSubmit?: () => void,
  additionalShortcuts: KeyboardShortcut[] = [],
) {
  const shortcuts: KeyboardShortcut[] = [
    createShortcut.escape(onClose, "Close dialog"),
    ...(onSubmit ? [createShortcut.commandEnter(onSubmit, "Submit")] : []),
    ...additionalShortcuts,
  ];

  // Only enable shortcuts when modal is open
  const enabledShortcuts = shortcuts.map((shortcut) => ({
    ...shortcut,
    enabled: isOpen,
  }));

  useKeyboardShortcuts(enabledShortcuts);
}

// Global application shortcuts hook
export function useGlobalShortcuts() {
  // We'll implement global shortcuts that work across the app
  return {
    // Placeholder for global shortcuts registry
    registerGlobalShortcut: (shortcut: KeyboardShortcut) => {
      // Implementation for registering global shortcuts
    },
  };
}
