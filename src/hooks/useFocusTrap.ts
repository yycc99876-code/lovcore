import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within the given container element while `active` is true.
 * Focuses the first focusable element on activation and restores focus on cleanup.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus the first focusable element
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const currentFocusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (currentFocusable.length === 0) return;

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously focused element
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [containerRef, active]);
}
