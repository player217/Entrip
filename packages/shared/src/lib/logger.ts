/* eslint-disable no-console */
/**
 * 중앙 집중식 로깅 시스템
 * 모든 에러와 중요 이벤트를 추적하여 디버깅을 쉽게 합니다.
 */

import type { LogLevel, LogEntry } from '../types/log';

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: '2-digit',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  private getLogColor(level: LogLevel): string {
    if (typeof window === 'undefined') return ''; // Node.js 환경
    
    switch (level) {
      case 'debug': return 'color: #6B7280; font-weight: normal;'; // Gray
      case 'info': return 'color: #3B82F6; font-weight: bold;';   // Blue
      case 'warn': return 'color: #F59E0B; font-weight: bold;';   // Amber
      case 'error': return 'color: #EF4444; font-weight: bold;';  // Red
      default: return '';
    }
  }

  private formatLog(entry: LogEntry): { message: string; style?: string } {
    const { timestamp, level, component, message, data, error, stack } = entry;
    const formattedTime = this.formatTimestamp(timestamp);
    let logMessage = `[${formattedTime}] [${level.toUpperCase()}] [${component}] ${message}`;
    
    if (data && this.isDevelopment) {
      logMessage += `\n📊 Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    if (error) {
      logMessage += `\n❌ Error: ${error.message}`;
    }
    
    if (stack && this.isDevelopment && level === 'error') {
      logMessage += `\n📍 Stack: ${stack}`;
    }
    
    return {
      message: logMessage,
      style: this.getLogColor(level)
    };
  }

  private log(level: LogLevel, component: string, message: string, data?: unknown, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      error,
      stack: error?.stack || new Error().stack
    };

    // 메모리에 저장 (최근 1000개만 유지)
    this.logs.push(entry);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    const formattedLog = this.formatLog(entry);

    // 콘솔 출력 (개선된 색상 지원)
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          if (formattedLog.style) {
            console.debug(`%c${formattedLog.message}`, formattedLog.style);
          } else {
            console.debug(formattedLog.message);
          }
        }
        break;
      case 'info':
        if (formattedLog.style) {
          console.info(`%c${formattedLog.message}`, formattedLog.style);
        } else {
          console.info(formattedLog.message);
        }
        break;
      case 'warn':
        if (formattedLog.style) {
          console.warn(`%c${formattedLog.message}`, formattedLog.style);
        } else {
          console.warn(formattedLog.message);
        }
        break;
      case 'error':
        if (formattedLog.style) {
          console.error(`%c${formattedLog.message}`, formattedLog.style);
        } else {
          console.error(formattedLog.message);
        }
        break;
    }

    // 에러인 경우 localStorage에도 저장 (브라우저 환경)
    if (typeof window !== 'undefined' && level === 'error') {
      try {
        const errorLogs = JSON.parse(localStorage.getItem('entrip_error_logs') || '[]');
        errorLogs.push(entry);
        // 최근 50개 에러만 유지
        if (errorLogs.length > 50) {
          errorLogs.shift();
        }
        localStorage.setItem('entrip_error_logs', JSON.stringify(errorLogs));
      } catch (e) {
        console.error('Failed to save error log to localStorage', e);
      }
    }
  }

  debug(component: string, message: string, data?: unknown) {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: unknown) {
    this.log('info', component, message, data);
  }

  warn(component: string, message: string, data?: unknown) {
    this.log('warn', component, message, data);
  }

  error(component: string, message: string, error?: Error | unknown, data?: unknown) {
    // Error 객체가 아닌 경우 변환
    if (error && !(error instanceof Error)) {
      error = new Error(String(error));
    }
    this.log('error', component, message, data, error as Error | undefined);
  }

  // 최근 로그 조회
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // 특정 컴포넌트의 로그만 조회
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  // 에러 로그만 조회
  getErrorLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  // localStorage에서 에러 로그 조회
  getStoredErrorLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem('entrip_error_logs') || '[]');
    } catch (e) {
      return [];
    }
  }

  // 로그 초기화
  clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('entrip_error_logs');
    }
  }

  // 성능 메트릭 로깅
  performance(component: string, operation: string, duration: number, metadata?: Record<string, unknown>) {
    const performanceData = {
      operation,
      duration,
      timestamp: Date.now(),
      ...metadata
    };

    if (duration > 1000) {
      this.warn(component, `Slow operation detected: ${operation} (${duration}ms)`, performanceData);
    } else if (this.isDevelopment) {
      this.debug(component, `⚡ ${operation} completed in ${duration}ms`, performanceData);
    }
  }

  // API 호출 메트릭 로깅
  apiCall(component: string, method: string, url: string, duration: number, status?: number, error?: Error) {
    const apiData = {
      method,
      url,
      duration,
      status,
      timestamp: Date.now()
    };

    if (error) {
      this.error(component, `API call failed: ${method} ${url} (${duration}ms)`, error, apiData);
    } else if (status && status >= 400) {
      this.warn(component, `API call warning: ${method} ${url} - ${status} (${duration}ms)`, apiData);
    } else if (duration > 2000) {
      this.warn(component, `Slow API call: ${method} ${url} (${duration}ms)`, apiData);
    } else if (this.isDevelopment) {
      this.debug(component, `🌐 API: ${method} ${url} - ${status} (${duration}ms)`, apiData);
    }
  }

  // 사용자 행동 추적
  userAction(component: string, action: string, metadata?: Record<string, unknown>) {
    this.info(component, `👤 User Action: ${action}`, {
      action,
      timestamp: Date.now(),
      ...metadata
    });
  }

  // 로그를 파일로 다운로드 (브라우저 환경)
  downloadLogs() {
    if (typeof window === 'undefined') return;

    const allLogs = {
      memoryLogs: this.logs,
      storedErrors: this.getStoredErrorLogs(),
      exportedAt: new Date().toISOString(),
      environment: this.isDevelopment ? 'development' : 'production'
    };

    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrip-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logger = Logger.getInstance();

// 전역 에러 핸들러 설정 (브라우저 환경)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('GlobalErrorHandler', 'Uncaught error', event.error, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('GlobalErrorHandler', 'Unhandled promise rejection', new Error(String(event.reason)), {
      reason: event.reason
    });
  });
}