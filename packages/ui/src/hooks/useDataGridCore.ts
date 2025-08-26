import { useState } from 'react'
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  getPaginationRowModel,
  type SortDirection
} from '@tanstack/react-table'
import type { DataGridColumn, DataGridRow } from '../types/tanstack-table'

export interface UseDataGridCoreProps<T = DataGridRow> {
  data: T[]
  columns: DataGridColumn<T>[]
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  pageSize?: number
}

export function useDataGridCore<T = DataGridRow>({ data, columns }: UseDataGridCoreProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')
  
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const getSortingIcon = (direction: SortDirection | false) => {
    if (direction === 'asc') return '↑'
    if (direction === 'desc') return '↓'
    return '↕'
  }

  const getPaginationText = (pageIndex: number, pageCount: number) => {
    return `Page ${pageIndex + 1} of ${pageCount}`
  }

  return {
    table,
    globalFilter,
    setGlobalFilter,
    getSortingIcon,
    getPaginationText
  }
}

// Legacy exports for backward compatibility
export const getSortingIcon = (direction?: SortDirection | false) => {
  if (direction === 'asc') return '↑'
  if (direction === 'desc') return '↓'
  return '↕'
}

export const getPaginationText = (pageIndex: number = 0, pageCount: number = 1) => {
  return `Page ${pageIndex + 1} of ${pageCount}`
}