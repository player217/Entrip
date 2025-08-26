'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { flexRender } from '@tanstack/react-table';
import type { ColumnDef, HeaderGroup, Row, Cell, Header } from '@tanstack/react-table';
import { useDataGridCore, getSortingIcon, getPaginationText } from '../../hooks/useDataGridCore';

export interface DataGridProps<T extends object> {
  columns: Array<ColumnDef<T, unknown>>;
  data: T[];
  className?: string;
  height?: number | string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

export function DataGrid<T extends object>({
  columns,
  data,
  className,
  height = 'auto',
  enableSorting = true,
  enableFiltering = false,
  enablePagination = false,
  pageSize = 10,
}: DataGridProps<T>) {
  const {
    table,
    globalFilter,
    setGlobalFilter,
  } = useDataGridCore({
    data,
    columns,
    enableSorting,
    enableFiltering,
    enablePagination,
    pageSize,
  });

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm', className)}>
      {/* Global Filter */}
      {enableFiltering && (
        <div className="p-4 border-b border-gray-200">
          <Input
            type="text"
            placeholder="검색..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-auto"
        style={{ height }}
      >
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<T>) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<T, unknown>) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      'px-4 py-3 font-medium text-left text-gray-700 border-b border-gray-200',
                      enableSorting && header.column.getCanSort() && 'cursor-pointer hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {enableSorting && (
                        <span className="text-gray-400">
                          {getSortingIcon(header.column.getIsSorted())}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white">
            {table.getRowModel().rows.map((row: Row<T>) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                {row.getVisibleCells().map((cell: Cell<T, unknown>) => (
                  <td key={cell.id} className="px-4 py-3 text-gray-900">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              이전
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {getPaginationText(table.getState().pagination.pageIndex, table.getPageCount())}
          </div>
        </div>
      )}
    </div>
  );
}