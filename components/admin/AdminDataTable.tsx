'use client';

import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';

export type AdminColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type AdminDataTableProps<T> = {
  columns: AdminColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  footer?: React.ReactNode;
  className?: string;
};

export function AdminDataTable<T>({
  columns,
  rows,
  isLoading = false,
  emptyMessage = 'Aucune donnee disponible',
  footer,
  className
}: AdminDataTableProps<T>) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((column) => (
                <th key={column.key} className={cn('px-3 py-2', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Spinner size="sm" />
                    Chargement...
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="text-slate-800 hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-3 py-2', column.className)}>
                      {column.render ? column.render(row) : (row as Record<string, React.ReactNode>)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="flex flex-wrap items-center justify-between gap-3">{footer}</div> : null}
    </div>
  );
}
