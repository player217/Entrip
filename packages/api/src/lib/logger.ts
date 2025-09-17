import { appConfig } from '../config';

// Log levels with numeric values for comparison
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Map string log levels to enum values
const logLevelMap: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  service: string;
  environment: string;
}

class Logger {
  private readonly currentLevel: LogLevel;
  private readonly service = 'entrip-api-v2';

  constructor() {
    this.currentLevel = logLevelMap[appConfig.logging.level] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private formatLogEntry(level: string, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context,
      service: this.service,
      environment: appConfig.server.nodeEnv,
    };
  }

  private writeLog(logEntry: LogEntry): void {
    if (appConfig.server.isProduction) {
      // In production, output structured JSON logs
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, output human-readable logs
      const { timestamp, level, message, context } = logEntry;
      const timeStr = new Date(timestamp).toLocaleTimeString();
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      const colorCode = this.getColorCode(level);
      const resetCode = '\x1b[0m';

      console.log(`${colorCode}[${timeStr}] ${level}${resetCode} ${message}${contextStr}`);
    }
  }

  private getColorCode(level: string): string {
    switch (level.toUpperCase()) {
      case 'ERROR': return '\x1b[31m'; // Red
      case 'WARN': return '\x1b[33m';  // Yellow
      case 'INFO': return '\x1b[36m';  // Cyan
      case 'DEBUG': return '\x1b[37m'; // White
      default: return '\x1b[0m';       // Reset
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.formatLogEntry('error', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.formatLogEntry('warn', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.formatLogEntry('info', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.formatLogEntry('debug', message, context));
    }
  }

  // HTTP request logging
  http(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    const logContext = { method, url, statusCode, duration, ...context };

    if (statusCode >= 500) {
      this.error(message, logContext);
    } else if (statusCode >= 400) {
      this.warn(message, logContext);
    } else {
      this.info(message, logContext);
    }
  }

  // Database operation logging
  db(operation: string, table: string, duration: number, context?: LogContext): void {
    const message = `DB ${operation} ${table} - ${duration}ms`;
    const logContext = { operation, table, duration, ...context };

    if (duration > 1000) {
      this.warn(message, logContext);
    } else {
      this.debug(message, logContext);
    }
  }

  // Authentication logging
  auth(event: string, userId?: string, companyCode?: string, context?: LogContext): void {
    const message = `Auth ${event}`;
    const logContext = { event, userId, companyCode, ...context };
    this.info(message, logContext);
  }

  // WebSocket logging
  ws(event: string, socketId: string, context?: LogContext): void {
    const message = `WS ${event}`;
    const logContext = { event, socketId, ...context };
    this.debug(message, logContext);
  }

  // Business logic logging
  business(action: string, entityType: string, entityId: string, context?: LogContext): void {
    const message = `Business ${action} ${entityType}`;
    const logContext = { action, entityType, entityId, ...context };
    this.info(message, logContext);
  }
}

// Create and export singleton logger instance
export const logger = new Logger();

// Export types for external use
export type { LogContext, LogEntry };