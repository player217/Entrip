/**
 * Type definitions for the unified useBookings hook system
 */

import type { 
  Booking, 
  BookingFilters,
  CreateBookingDto,
  UpdateBookingDto 
} from '../../types/booking';

/**
 * Configuration options for the useBookings hook
 */
export interface BookingHookConfig {
  // Data Fetching
  filters?: BookingFilters | { month?: string; take?: number };
  
  // Real-time
  enableWebSocket?: boolean;
  socketInstance?: any; // Socket.io instance
  
  // Performance
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshInterval?: number;
  
  // Features
  enableOptimisticUpdates?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  
  // API Client
  apiClient?: any; // Will be injected or use default
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Return type for the useBookings hook
 */
export interface BookingHookReturn<T = Booking> {
  // Data
  bookings: T[];
  pagination?: PaginationInfo;
  
  // Status
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  
  // Actions
  refresh: () => Promise<void>;
  create: (data: CreateBookingDto) => Promise<T>;
  update: (id: string, data: UpdateBookingDto) => Promise<T>;
  delete: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkRestore: (bookings: any[]) => Promise<void>;
  
  // Utilities
  findById: (id: string) => T | undefined;
  filter: (predicate: (booking: T) => boolean) => T[];
  sort: (compareFn: (a: T, b: T) => number) => T[];
  
  // SWR compatibility
  mutate: () => Promise<void>;
  rawData?: any;
  requestUrl?: string;
}

/**
 * Data provider interface for abstraction
 */
export interface DataProvider<T> {
  fetch: (url: string, options?: any) => Promise<T>;
  mutate: (key: string | ((key: any) => boolean)) => Promise<void>;
  subscribe?: (key: string, callback: () => void) => () => void;
}

/**
 * WebSocket event data types
 */
export interface BookingEventData {
  id: string;
  bookingId?: string;
  [key: string]: unknown;
}

export interface BulkEventData {
  ids: string[];
  count: number;
}

/**
 * WebSocket event callbacks
 */
export interface BookingEventCallbacks {
  onCreate?: (data: BookingEventData) => void;
  onUpdate?: (data: BookingEventData) => void;
  onDelete?: (data: BookingEventData) => void;
  onBulkCreate?: (data: BulkEventData) => void;
  onBulkDelete?: (data: BulkEventData) => void;
}