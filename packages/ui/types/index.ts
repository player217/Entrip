import React from 'react';

// CalendarMonth 관련 타입
export interface BookingEntry {
  id: string;
  teamName: string;
  destination: string;
  type: '골프' | '인센티브' | '허니문' | '기타';
  status: 'confirmed' | 'pending' | 'cancelled';
  nights: number;
  days: number;
  paxCount: number;
}

export interface CalendarMonthProps {
  month?: Date;
  bookings?: Record<string, BookingEntry[]>; // 'YYYY-MM-DD': BookingEntry[]
  onAddBooking?: (date: Date) => void;
  onBookingClick?: (booking: BookingEntry) => void;
  className?: string;
}

// DataGrid 관련 타입
export interface DataGridColumn<T = unknown> {
  key: string;
  header: string;
  width?: number;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// ChartCard 관련 타입
export interface ChartCardProps {
  title: string;
  data: ChartData[];
  className?: string;
  height?: number;
  color?: string;
  dataKey?: string;
  xAxisKey?: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Flow 관련 타입
export interface FlowNodeData {
  id: string;
  label: string;
  type?: 'input' | 'output' | 'process' | 'decision';
  position?: { x: number; y: number };
}

export interface FlowNodeProps {
  data: FlowNodeData;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

// CommandBar 관련 타입
export interface CommandBarProps {
  user?: {
    name: string;
    avatar?: string;
  };
  exchangeRates?: Record<string, number>;
}

// Input 관련 타입  
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

// Re-export TanStack Table types
export type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  HeaderGroup,
  Row,
  Cell,
  Header,
  Table,
  RowData,
  TableOptions,
  TableState,
} from './tanstack-table';

// TabContainer 관련 타입
export interface Tab {
  id: string;
  title: string;
  closable?: boolean;
  icon?: React.ReactNode;
}

export interface TabContainerProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  hideContent?: boolean;
}