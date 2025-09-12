/**
 * Logging system types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  error?: Error;
  stack?: string;
}

export interface LoggerConfig {
  maxLogs?: number;
  isDevelopment?: boolean;
  enableConsole?: boolean;
  enableStorage?: boolean;
}

export interface LogFilter {
  level?: LogLevel | 'all';
  component?: string;
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}