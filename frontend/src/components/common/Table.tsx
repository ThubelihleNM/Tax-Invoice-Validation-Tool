import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

export interface TableColumn {
  key: string;
  title: string;
  render?: (val: any, row: any) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Pagination
  totalItems?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  // Sorting
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found.",
  totalItems = 0,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onSort
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!onSort) return;
    
    let nextDir: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setSortKey(key);
    setSortDirection(nextDir);
    onSort(key, nextDir);
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="flex flex-col w-full h-full bg-transparent overflow-hidden">
      {/* Table Frame Wrapper */}
      <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-800/80 rounded-xl bg-white/40 dark:bg-slate-900/30 backdrop-blur-md">
        <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left text-sm">
          <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 select-none ${col.sortable && onSort ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.title}</span>
                    {col.sortable && onSort && sortKey === col.key && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
            {isLoading ? (
              // Loader Rows
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={row.id || row.key || rIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {onPageChange && totalItems > pageSize && (
        <div className="flex items-center justify-between px-2 py-4 mt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            of <span className="font-semibold">{totalItems}</span> entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50 text-slate-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary border-primary text-white'
                      : 'border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50 text-slate-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Table;
