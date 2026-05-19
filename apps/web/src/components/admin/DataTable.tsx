import type { ReactNode } from "react";
import { Pagination } from "@/components/admin/Pagination";

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
  emptyMessage?: string;
  keyExtractor: (row: T) => string | number;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  actions?: (row: T) => ReactNode;
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
  emptyMessage = "No data.",
  keyExtractor,
  page,
  totalPages,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  actions,
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

  const colCount = columns.length + (actions ? 1 : 0);

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

  return (
    <div className={cn.wrapper}>
      <table className={cn.table}>
        <thead className={cn.thead}>
          <tr>
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
            {actions && <th className={`${cn.th} text-right`}>Actions</th>}
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
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-t border-[var(--oat-border)] hover:bg-[var(--oat-light)]/50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.id} className={`${cn.td} ${col.size ?? ""}`}>
                    {renderCell(row, col)}
                  </td>
                ))}
                {actions && (
                  <td className={`${cn.td} text-right`}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      )}
    </div>
  );
}

export { DataTableInner as DataTable };
export type { ColumnDef, DataTableProps };
