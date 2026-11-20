import clsx from 'clsx';

/**
 * A one-line note under a table that scrolls sideways, shown only below the
 * md breakpoint, where key columns can start off screen.
 */
export default function ScrollHint({ children = 'Swipe the table sideways to see every column.', className }: { children?: string; className?: string }) {
  return <p className={clsx('text-[13px] text-ink-2 md:hidden', className)}>{children}</p>;
}
