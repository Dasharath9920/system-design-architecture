import { useEffect, type RefObject } from 'react';
export function useDialogFocus(ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.querySelector<HTMLElement>('input,button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      if (e.key === 'Tab') {
        const items = [
          ...(root?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,a[href],[tabindex="0"]',
          ) || []),
        ].filter((el) => el.getClientRects().length);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && index <= 0) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && (index === items.length - 1 || index < 0)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    root?.addEventListener('keydown', key);
    return () => {
      root?.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus();
    };
    // Dialog lifetime owns focus; the store actions used by close are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
