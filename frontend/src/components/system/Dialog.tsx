import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** The id of the heading that names this dialog. */
  labelledBy: string;
  /** modal: centred, for comparing. drawer: full height on the right, for one item's detail. */
  variant?: 'modal' | 'drawer';
  children: ReactNode;
};

/**
 * A modal dialog on the native <dialog> element. The browser provides the focus
 * trap, makes the page behind inert, closes on Escape and returns focus to the
 * control that opened it. Clicking the backdrop closes it too.
 */
export default function Dialog({ open, onClose, labelledBy, variant = 'modal', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return undefined;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={clsx(
        'cm-dialog open:flex open:flex-col',
        variant === 'drawer'
          ? 'my-0 ml-auto mr-0 h-dvh w-[min(34rem,100vw)] border-l border-line'
          : 'm-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(72rem,calc(100vw-2rem))] rounded-panel border border-line'
      )}
      onCancel={(event) => {
        // Escape: let the owner close it, so open/closed has one source of truth.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // The backdrop belongs to the dialog element itself; content clicks land on children.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
