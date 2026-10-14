import type { KeyboardEvent, RefObject } from 'react';
export function dialogKeyboard(
  container: RefObject<HTMLDivElement | null>,
  busy: boolean,
  onCancel: () => void,
  form?: RefObject<HTMLFormElement | null>,
) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onCancel();
    }
    if (form && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!busy && !event.repeat) form.current?.requestSubmit();
    }
    if (event.key === 'Tab') {
      const nodes = [
        ...(container.current?.querySelectorAll<HTMLElement>(
          'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), summary',
        ) ?? []),
      ].filter((node) => !node.closest('details:not([open])') || node.tagName === 'SUMMARY');
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };
}
