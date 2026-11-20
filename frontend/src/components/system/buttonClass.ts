import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonStyle = {
  /** primary: the one main action in view. secondary: other actions. quiet: low-emphasis actions in toolbars. */
  variant?: ButtonVariant;
  /** icon: a square button holding only an icon. Give it an aria-label. */
  size?: ButtonSize;
  /** Extra classes that don't compete with the size or variant, such as width or margin. */
  className?: string;
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'size-9'
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border border-line bg-surface-2 text-ink hover:border-line-strong',
  quiet: 'text-ink-2 hover:bg-surface-2 hover:text-ink'
};

/**
 * Classes for anything that looks like a button: a <button>, a router <Link> or an <a>.
 * Disabled controls dim and stop responding; pair `disabled` with text that says why.
 */
export function buttonClass({ variant = 'secondary', size = 'md', className }: ButtonStyle = {}): string {
  return clsx(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,transform] duration-150 ease-out',
    'active:scale-[0.98] motion-reduce:active:scale-100',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    SIZES[size],
    VARIANTS[variant],
    className
  );
}
