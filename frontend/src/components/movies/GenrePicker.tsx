import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { GenreMode } from '../../lib/explorerParams';
import { buttonClass } from '../system/buttonClass';

type GenrePickerProps = {
  /** Every genre the API lists, or null while loading or after a failure. */
  options: string[] | null;
  /** Set when the genre list could not be loaded. */
  failed: boolean;
  onRetry: () => void;
  selected: string[];
  mode: GenreMode;
  onToggle: (genre: string) => void;
  onModeChange: (mode: GenreMode) => void;
  onClear: () => void;
};

/**
 * Multi-select for genres, with the any/all switch. Each change applies at once.
 * The panel opens from a button, closes on Escape or a click outside, and every
 * option is a native checkbox or radio, so it works from the keyboard.
 */
export default function GenrePicker({
  options,
  failed,
  onRetry,
  selected,
  mode,
  onToggle,
  onModeChange,
  onClear
}: GenrePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const summary =
    selected.length === 0 ? 'Any genre' : selected.length === 1 ? selected[0] : `${selected.length} genres`;

  return (
    <div ref={rootRef} className="relative">
      <span id={labelId} className="mb-1.5 block text-[13px] font-medium text-ink-2">
        Genres
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={labelId}
        aria-describedby={`${panelId}-summary`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-control border border-line-strong bg-canvas px-3 text-left text-sm text-ink transition-colors duration-150 hover:border-ink-2"
      >
        <span id={`${panelId}-summary`} className="truncate">
          {summary}
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-2" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-panel border border-line-strong bg-surface-2 p-4 shadow-xl shadow-black/50"
        >
          {options ? (
            <fieldset>
              <legend className="sr-only">Genres</legend>
              <div className="grid max-h-64 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto pr-1">
                {options.map((genre) => (
                  <label
                    key={genre}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 text-sm text-ink hover:bg-canvas/60"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(genre)}
                      onChange={() => onToggle(genre)}
                      className="cm-check"
                    />
                    <span className="truncate">{genre}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : failed ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-ink">The genre list couldn’t be loaded.</p>
              <button type="button" onClick={onRetry} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                Retry
              </button>
            </div>
          ) : (
            <p role="status" className="text-sm text-ink-2">
              Loading genres…
            </p>
          )}

          <fieldset className="mt-4 border-t border-line pt-3">
            <legend className="float-left mr-4 text-[13px] text-ink-2">With several selected, match</legend>
            <div className="flex gap-4">
              {(['or', 'and'] as const).map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={`${panelId}-mode`}
                    checked={mode === value}
                    onChange={() => onModeChange(value)}
                    className="cm-check"
                  />
                  {value === 'or' ? 'any' : 'all'}
                </label>
              ))}
            </div>
          </fieldset>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className={buttonClass({ variant: 'quiet', size: 'sm', className: 'mt-3 -ml-3' })}
            >
              Clear genres
            </button>
          )}
        </div>
      )}
    </div>
  );
}
