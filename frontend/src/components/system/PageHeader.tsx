import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  /** One or two sentences of context: what this page answers. */
  description?: ReactNode;
  /** Actions that apply to the whole page, right-aligned on wide screens. */
  actions?: ReactNode;
};

/** The title block every studio page opens with: the page's one h1, its context, and its actions. */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
