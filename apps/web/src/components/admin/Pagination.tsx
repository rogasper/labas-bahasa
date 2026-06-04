interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const baseBtn = "px-4 py-2 rounded-[12px] border border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--clay-black)] font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:border-matcha-600 enabled:hover:shadow-[0_-1px_1px_rgba(0,0,0,0.04)_inset,0_1px_1px_rgba(0,0,0,0.1),-7px_7px_0_rgb(0,0,0)] enabled:hover:-translate-y-1";
  const activeBtn = "bg-matcha-600 text-[var(--pure-white)] border-matcha-600 shadow-[0_-1px_1px_rgba(0,0,0,0.04)_inset,0_1px_1px_rgba(0,0,0,0.1),-7px_7px_0_rgb(0,0,0)] -translate-y-1";

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={baseBtn}
      >
        Previous
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-2 text-[var(--warm-charcoal)]">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`${baseBtn} ${p === page ? activeBtn : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={baseBtn}
      >
        Next
      </button>
    </div>
  );
}
