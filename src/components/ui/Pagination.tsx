import { Button } from './Button';

/** "‹ Prev · Page 2 of 5 · Next ›" for paged tables. Renders nothing for a single page. */
export function Pagination({
  page,
  pageCount,
  onChange,
  label = 'Pages',
}: {
  /** 1-based. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4" aria-label={label}>
      <Button
        size="sm"
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ‹ Prev
      </Button>
      <span className="text-xs text-slate-500" aria-live="polite">
        Page <strong className="font-semibold text-slate-700">{page}</strong> of {pageCount}
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        Next ›
      </Button>
    </nav>
  );
}
