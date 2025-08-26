import type { Table, ColumnDef } from '@tanstack/react-table'

export interface DataGridRow {
  [key: string]: any
}

// ColumnDef를 직접 확장하지 않고 타입 교차로 처리
export type DataGridColumn<T = DataGridRow> = ColumnDef<T> & {
  // Custom properties if needed
}

export interface DataGridCoreProps<T = DataGridRow> {
  data: T[]
  columns: DataGridColumn<T>[]
  className?: string
}

export interface DataGridState {
  table: Table<any>
  globalFilter: string
  setGlobalFilter: (value: string) => void
}