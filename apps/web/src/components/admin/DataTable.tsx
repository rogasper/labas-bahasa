import type { ReactNode } from "react";

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  accessorFn?: (row: T) => ReactNode;
  cell?: (props: { row: T; value: ReactNode }) => ReactNode;
  className?: string;
  sortable?: boolean;
  size?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string | number;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  actions?: (row: T) => ReactNode;
  actionsHeader?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  classNames?: {
    wrapper?: string;
    table?: string;
    thead?: string;
    th?: string;
    tbody?: string;
    td?: string;
  };
}

function DataTableInner<T>({
  data,
  columns,
  isLoading,
  isFetching,
  emptyMessage = "No data.",
  keyExtractor,
  page,
  totalPages,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  actions,
  actionsHeader = "Actions",
  onRowClick,
  selectable,
  selectedIds,
  onSelectionChange,
  classNames = {},
}: DataTableProps<T>) {
  const cn = {
    wrapper: classNames.wrapper ?? "bg-[var(--pure-white)] rounded-[var(--radius-xl)] border border-[var(--oat-border)] overflow-hidden",
    table: classNames.table ?? "w-full text-sm",
    thead: classNames.thead ?? "bg-[var(--oat-light)] text-[var(--warm-charcoal)]",
    th: classNames.th ?? "text-left px-4 py-3 font-medium",
    tbody: classNames.tbody ?? "",
    td: classNames.td ?? "px-4 py-3",
  };

  const colCount = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);

  function renderCell(row: T, col: ColumnDef<T>): ReactNode {
    let value: ReactNode;
    if (col.accessorKey !== undefined) {
      value = row[col.accessorKey] as ReactNode;
    } else if (col.accessorFn) {
      value = col.accessorFn(row);
    } else {
      value = null;
    }
    if (col.cell) {
      return col.cell({ row, value });
    }
    return value;
  }

  const allSelected =
    selectable && data.length > 0 && data.every((row) => selectedIds?.has(String(keyExtractor(row))));

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => String(keyExtractor(row)))));
    }
  }

  function toggleOne(key: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  return (
    <div className={cn.wrapper}>
      {isFetching && (
        <div className="h-0.5 bg-[var(--matcha-500)] animate-pulse" />
      )}
      <table className={cn.table}>
        <thead className={cn.thead}>
          <tr>
            {selectable && (
              <th className={`${cn.th} w-10`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.id}
                className={`${cn.th} ${col.size ?? ""} ${col.className ?? ""} ${col.sortable ? "cursor-pointer select-none hover:text-[var(--clay-black)]" : ""}`}
                onClick={col.sortable ? () => onSort?.(col.id) : undefined}
                aria-sort={
                  sortColumn === col.id
                    ? sortDirection === "asc" ? "ascending" : "descending"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortColumn === col.id && (
                    <span className="text-xs">{sortDirection === "asc" ? "\u25B2" : "\u25BC"}</span>
                  )}
                </span>
              </th>
            ))}
            {actions && <th className={`${cn.th} text-center ${actionsHeader === "" ? "w-12" : ""}`}>{actionsHeader}</th>}
          </tr>
        </thead>
        <tbody className={cn.tbody}>
          {isLoading ? (
            <tr>
              <td colSpan={colCount} className={`${cn.td} text-center py-16 text-[var(--warm-charcoal)]`}>
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className={`${cn.td} text-center py-16 text-[var(--warm-charcoal)]`}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const key = String(keyExtractor(row));
              return (
                <tr
                  key={key}
                  className={`border-t border-[var(--oat-border)] transition-colors ${onRowClick ? "cursor-pointer" : ""} ${selectedIds?.has(key) ? "bg-[var(--matcha-300)]/10" : "hover:bg-[var(--oat-light)]/50"}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className={`${cn.td} w-10`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(key) ?? false}
                        onChange={() => toggleOne(key)}
                        aria-label={`Select row ${key}`}
                        className="cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className={`${cn.td} ${col.size ?? ""}`}>
                      {renderCell(row, col)}
                    </td>
                  ))}
                  {actions && (
                    <td className={`${cn.td} text-center`} onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export { DataTableInner as DataTable };
export type { ColumnDef, DataTableProps };
