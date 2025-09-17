/**
 * Structured Logging System
 * Enterprise-grade logging with structured data, performance tracking, and contextual information
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogContext {
  userId?: string;
  companyCode?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  timestamp: number;
  environment: string;
  version: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
  performance?: {
    duration: number;
    memory?: number;
    cpu?: number;
  };
  tags: string[];
  component: string;
  operation?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
  enablePerformanceTracking: boolean;
  enableErrorCapture: boolean;
  enableContextCapture: boolean;
  maskSensitiveData: boolean;
  sensitiveFields: string[];
  environment: string;
  version: string;
  component: string;
}

/**
 * Performance tracker for measuring operation duration
 */
export class PerformanceTracker {
  private startTime: number;
  private endTime?: number;
  private memoryStart?: number;

  constructor() {
    this.startTime = performance.now();
    
    // Track memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memoryStart = process.memoryUsage().heapUsed;
    }
  }

  finish(): { duration: number; memory?: number } {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    let memoryDelta: number | undefined;
    if (this.memoryStart && typeof process !== 'undefined' && process.memoryUsage) {
      const memoryEnd = process.memoryUsage().heapUsed;
      memoryDelta = memoryEnd - this.memoryStart;
    }

    return {
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      memory: memoryDelta
    };
  }

  getDuration(): number {
    const now = performance.now();
    return Math.round((now - this.startTime) * 100) / 100;
  }
}

/**
 * Structured Logger with enterprise features
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private contextStack: Partial<LogContext>[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      enablePerformanceTracking: true,
      enableErrorCapture: true,
      enableContextCapture: true,
      maskSensitiveData: true,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      component: 'api-client',
      ...config
    };

    this.startFlushTimer();
  }

  /**
   * Add context that will be included in all subsequent logs
   */
  pushContext(context: Partial<LogContext>): void {
    this.contextStack.push(context);
  }

  /**
   * Remove the most recent context
   */
  popContext(): void {
    this.contextStack.pop();
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.contextStack = [];
  }

  /**
   * Log with TRACE level
   */
  trace(message: string, context: Partial<LogContext> = {}, tags: string[] = []): void {
    this.log(LogLevel.TRACE, message, context, tags);
  }

  /**
   * Log with DEBUG level
   */
  debug(message: string, context: Partial<LogContext> = {}, tags: string[] = []): void {
    this.log(LogLevel.DEBUG, message, context, tags);
  }

  /**
   * Log with INFO level
   */
  info(message: string, context: Partial<LogContext> = {}, tags: string[] = []): void {
    this.log(LogLevel.INFO, message, context, tags);
  }

  /**
   * Log with WARN level
   */
  warn(message: string, context: Partial<LogContext> = {}, tags: string[] = []): void {
    this.log(LogLevel.WARN, message, context, tags);
  }

  /**
   * Log with ERROR level
   */
  error(message: string, error?: Error, context: Partial<LogContext> = {}, tags: string[] = []): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode
    } : undefined;

    this.log(LogLevel.ERROR, message, context, tags, errorInfo);
  }

  /**
   * Log with FATAL level
   */
  fatal(message: string, error?: Error, context: Partial<LogContext> = {}, tags: string[] = []): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode
    } : undefined;

    this.log(LogLevel.FATAL, message, context, tags, errorInfo);
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(operation: string, context: Partial<LogContext> = {}): PerformanceTracker {
    if (this.config.enablePerformanceTracking) {
      this.debug(`Starting operation: ${operation}`, { ...context, operation }, ['performance', 'start']);
    }
    
    return new PerformanceTracker();
  }

  /**
   * End performance tracking and log results
   */
  endPerformanceTracking(
    tracker: PerformanceTracker,
    operation: string,
    context: Partial<LogContext> = {},
    success: boolean = true
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    const performance = tracker.finish();
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `${success ? 'Completed' : 'Failed'} operation: ${operation} (${performance.duration}ms)`;

    this.log(
      level,
      message,
      { ...context, operation },
      ['performance', 'end', success ? 'success' : 'failure'],
      undefined,
      performance
    );
  }

  /**
   * Log API request start
   */
  logRequestStart(method: string, url: string, context: Partial<LogContext> = {}): PerformanceTracker {
    const tracker = this.startPerformanceTracking(`${method} ${url}`, {
      ...context,
      method,
      url,
      operation: 'api_request'
    });

    this.info(`API Request: ${method} ${url}`, {
      ...context,
      method,
      url
    }, ['api', 'request', 'start']);

    return tracker;
  }

  /**
   * Log API request completion
   */
  logRequestEnd(
    tracker: PerformanceTracker,
    method: string,
    url: string,
    statusCode: number,
    context: Partial<LogContext> = {}
  ): void {
    const performance = tracker.finish();
    const success = statusCode >= 200 && statusCode < 400;
    const level = success ? LogLevel.INFO : LogLevel.WARN;

    this.log(
      level,
      `API Response: ${method} ${url} - ${statusCode} (${performance.duration}ms)`,
      {
        ...context,
        method,
        url,
        statusCode,
        operation: 'api_request'
      },
      ['api', 'response', success ? 'success' : 'error'],
      undefined,
      performance
    );
  }

  /**
   * Log circuit breaker state change
   */
  logCircuitBreakerStateChange(
    serviceName: string,
    oldState: string,
    newState: string,
    reason: string,
    context: Partial<LogContext> = {}
  ): void {
    this.warn(`Circuit breaker [${serviceName}]: ${oldState} → ${newState} (${reason})`, {
      ...context,
      serviceName,
      oldState,
      newState,
      reason,
      operation: 'circuit_breaker'
    }, ['circuit-breaker', 'state-change']);
  }

  /**
   * Log retry attempt
   */
  logRetryAttempt(
    attempt: number,
    maxAttempts: number,
    error: Error,
    delay: number,
    context: Partial<LogContext> = {}
  ): void {
    this.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms: ${error.message}`, {
      ...context,
      attempt,
      maxAttempts,
      delay,
      errorMessage: error.message,
      operation: 'retry'
    }, ['retry', 'attempt']);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {},
    tags: string[] = [],
    error?: any,
    performance?: any
  ): void {
    // Check log level
    if (level < this.config.level) return;

    // Build full context
    const fullContext = this.buildContext(context);

    // Mask sensitive data
    const maskedContext = this.config.maskSensitiveData 
      ? this.maskSensitiveData(fullContext)
      : fullContext;

    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      context: maskedContext,
      error,
      performance,
      tags: [...tags, this.config.component],
      component: this.config.component,
      operation: context.operation
    };

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Buffer for remote logging
    if (this.config.enableRemote) {
      this.buffer.push(entry);
      
      if (this.buffer.length >= this.config.bufferSize) {
        this.flush();
      }
    }
  }

  /**
   * Build complete context from stack and current context
   */
  private buildContext(context: Partial<LogContext>): LogContext {
    const baseContext: LogContext = {
      timestamp: Date.now(),
      environment: this.config.environment,
      version: this.config.version
    };

    // Merge context stack
    for (const ctx of this.contextStack) {
      Object.assign(baseContext, ctx);
    }

    // Add current context
    Object.assign(baseContext, context);

    // Add browser/Node.js specific context
    if (typeof window !== 'undefined') {
      // Browser environment
      baseContext.userAgent = navigator.userAgent;
      baseContext.url = window.location.href;
    } else if (typeof process !== 'undefined') {
      // Node.js environment
      baseContext.nodeVersion = process.version;
      baseContext.platform = process.platform;
    }

    return baseContext;
  }

  /**
   * Mask sensitive data in context
   */
  private maskSensitiveData(context: LogContext): LogContext {
    const masked = { ...context };
    
    for (const field of this.config.sensitiveFields) {
      if (field in masked) {
        masked[field] = '***MASKED***';
      }
    }

    return masked;
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.context.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.component}]`;
    
    const logData = {
      message: entry.message,
      context: entry.context,
      tags: entry.tags,
      ...(entry.error && { error: entry.error }),
      ...(entry.performance && { performance: entry.performance })
    };

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(prefix, logData);
        break;
      case LogLevel.INFO:
        console.info(prefix, logData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, logData);
        break;
    }
  }

  /**
   * Start flush timer for remote logging
   */
  private startFlushTimer(): void {
    if (this.config.enableRemote && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  /**
   * Flush buffer to remote endpoint
   */
  private async flush(): Promise<void> {
    if (!this.config.enableRemote || this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    if (this.config.remoteEndpoint) {
      try {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logs: entries })
        });
      } catch (error) {
        // Fallback to console if remote logging fails
        console.error('Failed to send logs to remote endpoint:', error);
        entries.forEach(entry => this.outputToConsole(entry));
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flush();
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart flush timer if interval changed
    if (newConfig.flushInterval !== undefined) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      this.startFlushTimer();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Get buffered log count
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

// Global logger instance
export const logger = new StructuredLogger();

/**
 * Create a child logger with additional context
 */
export function createLogger(
  component: string,
  context: Partial<LogContext> = {},
  config: Partial<LoggerConfig> = {}
): StructuredLogger {
  const childLogger = new StructuredLogger({
    ...logger.getConfig(),
    component,
    ...config
  });

  if (Object.keys(context).length > 0) {
    childLogger.pushContext(context);
  }

  return childLogger;
}

/**
 * Performance tracking decorator
 */
export function LogPerformance(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracker = logger.startPerformanceTracking(operationName);
      
      try {
        const result = await originalMethod.apply(this, args);
        logger.endPerformanceTracking(tracker, operationName, {}, true);
        return result;
      } catch (error) {
        logger.endPerformanceTracking(tracker, operationName, {}, false);
        throw error;
      }
    };

    return descriptor;
  };
}