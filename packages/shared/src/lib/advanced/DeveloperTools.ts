/**
 * Developer Tools and Debugging Aids
 * Comprehensive debugging utilities for enhanced development experience
 */

import { logger, LogLevel } from '../monitoring/StructuredLogger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { apiCache } from '../monitoring/CacheStrategy';
import { circuitBreakerManager } from '../error-handling/CircuitBreaker';
import { requestManager } from '../error-handling/RequestManager';

// =====================================
// Debug Configuration
// =====================================

export interface DebugConfig {
  enabled: boolean;
  logLevel: LogLevel;
  showStackTrace: boolean;
  enableRequestLogging: boolean;
  enablePerformanceLogging: boolean;
  enableStateLogging: boolean;
  maxLogEntries: number;
  namespace?: string;
}

export interface DebugEntry {
  timestamp: number;
  level: LogLevel;
  namespace: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

/**
 * Global Debug Manager
 */
export class DebugManager {
  private static instance: DebugManager;
  private config: DebugConfig;
  private entries: DebugEntry[] = [];
  private namespaces = new Set<string>();

  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      logLevel: LogLevel.DEBUG,
      showStackTrace: true,
      enableRequestLogging: true,
      enablePerformanceLogging: true,
      enableStateLogging: true,
      maxLogEntries: 1000
    };
  }

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  static enableGlobal(): void {
    const instance = DebugManager.getInstance();
    instance.updateConfig({ enabled: true });
  }

  static updateConfig(newConfig: Partial<DebugConfig>): void {
    const instance = DebugManager.getInstance();
    instance.updateConfig(newConfig);
  }

  updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DebugConfig {
    return { ...this.config };
  }

  log(level: LogLevel, namespace: string, message: string, data?: any): void {
    if (!this.config.enabled || level < this.config.logLevel) {
      return;
    }

    const entry: DebugEntry = {
      timestamp: Date.now(),
      level,
      namespace,
      message,
      data,
      stackTrace: this.config.showStackTrace ? new Error().stack : undefined
    };

    this.entries.push(entry);
    this.namespaces.add(namespace);

    // Maintain max entries limit
    if (this.entries.length > this.config.maxLogEntries) {
      this.entries.shift();
    }

    // Output to console with formatting
    this.outputToConsole(entry);
  }

  getEntries(namespace?: string, level?: LogLevel): DebugEntry[] {
    let filtered = this.entries;

    if (namespace) {
      filtered = filtered.filter(e => e.namespace === namespace);
    }

    if (level !== undefined) {
      filtered = filtered.filter(e => e.level >= level);
    }

    return filtered;
  }

  getNamespaces(): string[] {
    return Array.from(this.namespaces);
  }

  clear(namespace?: string): void {
    if (namespace) {
      this.entries = this.entries.filter(e => e.namespace !== namespace);
    } else {
      this.entries = [];
      this.namespaces.clear();
    }
  }

  export(): string {
    return JSON.stringify({
      config: this.config,
      entries: this.entries,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  private outputToConsole(entry: DebugEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `🐛 [${timestamp}] [${levelName}] [${entry.namespace}]`;

    const style = this.getConsoleStyle(entry.level);
    
    if (entry.data) {
      console.groupCollapsed(`${prefix} ${entry.message}`);
      console.log('%c' + 'Data:', style, entry.data);
      if (entry.stackTrace && this.config.showStackTrace) {
        console.log('%c' + 'Stack:', 'color: #666', entry.stackTrace);
      }
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${entry.message}`, style);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE: return 'color: #999';
      case LogLevel.DEBUG: return 'color: #007acc';
      case LogLevel.INFO: return 'color: #28a745';
      case LogLevel.WARN: return 'color: #ffc107';
      case LogLevel.ERROR: return 'color: #dc3545';
      case LogLevel.FATAL: return 'color: #fff; background: #dc3545';
      default: return 'color: #333';
    }
  }
}

/**
 * Create namespace-specific debugger
 */
export function createDebugger(namespace: string) {
  const debug = DebugManager.getInstance();

  return {
    trace: (message: string, data?: any) => debug.log(LogLevel.TRACE, namespace, message, data),
    debug: (message: string, data?: any) => debug.log(LogLevel.DEBUG, namespace, message, data),
    info: (message: string, data?: any) => debug.log(LogLevel.INFO, namespace, message, data),
    warn: (message: string, data?: any) => debug.log(LogLevel.WARN, namespace, message, data),
    error: (message: string, data?: any) => debug.log(LogLevel.ERROR, namespace, message, data),
    fatal: (message: string, data?: any) => debug.log(LogLevel.FATAL, namespace, message, data),
    
    // Convenience methods
    group: (title: string) => console.group(`🐛 [${namespace}] ${title}`),
    groupEnd: () => console.groupEnd(),
    time: (label: string) => console.time(`🐛 [${namespace}] ${label}`),
    timeEnd: (label: string) => console.timeEnd(`🐛 [${namespace}] ${label}`),
    table: (data: any) => console.table(data),
    
    // State inspection
    inspect: (obj: any, label?: string) => {
      debug.log(LogLevel.DEBUG, namespace, `Inspect${label ? ` ${label}` : ''}`, {
        type: typeof obj,
        constructor: obj?.constructor?.name,
        value: obj,
        keys: obj && typeof obj === 'object' ? Object.keys(obj) : undefined
      });
    }
  };
}

// =====================================
// Performance Profiler
// =====================================

export interface ProfilerResult {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryDelta?: number;
  children: ProfilerResult[];
}

export class Profiler {
  private static stack: Array<{
    name: string;
    startTime: number;
    startMemory?: number;
    children: ProfilerResult[];
  }> = [];

  static start(name: string): void {
    const startTime = performance.now();
    let startMemory: number | undefined;

    if (typeof process !== 'undefined' && process.memoryUsage) {
      startMemory = process.memoryUsage().heapUsed;
    }

    this.stack.push({
      name,
      startTime,
      startMemory,
      children: []
    });
  }

  static end(): ProfilerResult | null {
    const current = this.stack.pop();
    if (!current) return null;

    const endTime = performance.now();
    let memoryDelta: number | undefined;

    if (current.startMemory && typeof process !== 'undefined' && process.memoryUsage) {
      const endMemory = process.memoryUsage().heapUsed;
      memoryDelta = endMemory - current.startMemory;
    }

    const result: ProfilerResult = {
      name: current.name,
      duration: endTime - current.startTime,
      startTime: current.startTime,
      endTime,
      memoryDelta,
      children: current.children
    };

    // Add to parent if exists
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1];
      if (parent) {
        parent.children.push(result);
      }
    }

    return result;
  }

  static profile<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => this.end()) as unknown as T;
      } else {
        this.end();
        return result;
      }
    } catch (error) {
      this.end();
      throw error;
    }
  }

  static async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end();
      return result;
    } catch (error) {
      this.end();
      throw error;
    }
  }

  static formatResults(results: ProfilerResult[], indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let output = '';

    for (const result of results) {
      const duration = result.duration.toFixed(2);
      const memory = result.memoryDelta ? ` (${this.formatBytes(result.memoryDelta)})` : '';
      output += `${spaces}${result.name}: ${duration}ms${memory}\n`;
      
      if (result.children.length > 0) {
        output += this.formatResults(result.children, indent + 1);
      }
    }

    return output;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    const sign = bytes < 0 ? '-' : '+';
    return `${sign}${value.toFixed(1)} ${sizes[i]}`;
  }
}

// =====================================
// API Inspector
// =====================================

export interface ApiInspectorData {
  requests: Array<{
    id: string;
    method: string;
    url: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    status?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: any;
    responseBody?: any;
    error?: any;
  }>;
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    keys: string[];
  };
  circuitBreakers: Record<string, any>;
  performance: {
    averageResponseTime: number;
    slowestRequests: Array<{ url: string; duration: number }>;
    errorRate: number;
  };
}

export class ApiInspector {
  private static requests: ApiInspectorData['requests'] = [];
  private static requestCounter = 0;

  static trackRequest(
    method: string,
    url: string,
    options?: {
      requestHeaders?: Record<string, string>;
      requestBody?: any;
    }
  ): string {
    const id = `req_${++this.requestCounter}`;
    
    this.requests.push({
      id,
      method,
      url,
      startTime: Date.now(),
      requestHeaders: options?.requestHeaders,
      requestBody: options?.requestBody
    });

    // Keep only last 100 requests
    if (this.requests.length > 100) {
      this.requests.shift();
    }

    return id;
  }

  static completeRequest(
    id: string,
    options: {
      status?: number;
      responseHeaders?: Record<string, string>;
      responseBody?: any;
      error?: any;
    }
  ): void {
    const request = this.requests.find(r => r.id === id);
    if (request) {
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.status = options.status;
      request.responseHeaders = options.responseHeaders;
      request.responseBody = options.responseBody;
      request.error = options.error;
    }
  }

  static getData(): ApiInspectorData {
    const cacheStats = apiCache.getStats();
    const completedRequests = this.requests.filter(r => r.endTime);
    
    const averageResponseTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / completedRequests.length
      : 0;

    const slowestRequests = completedRequests
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(r => ({ url: r.url, duration: r.duration || 0 }));

    const errorRequests = completedRequests.filter(r => r.error || (r.status && r.status >= 400));
    const errorRate = completedRequests.length > 0 
      ? (errorRequests.length / completedRequests.length) * 100 
      : 0;

    return {
      requests: [...this.requests],
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        keys: apiCache.keys()
      },
      circuitBreakers: circuitBreakerManager.getAllMetrics(),
      performance: {
        averageResponseTime,
        slowestRequests,
        errorRate
      }
    };
  }

  static clear(): void {
    this.requests = [];
    this.requestCounter = 0;
  }

  static exportData(): string {
    return JSON.stringify(this.getData(), null, 2);
  }
}

// =====================================
// State Inspector
// =====================================

export class StateInspector {
  private static states = new Map<string, any>();
  private static subscribers = new Map<string, Set<(state: any) => void>>();

  static register<T>(name: string, getState: () => T): void {
    this.states.set(name, getState);
  }

  static unregister(name: string): void {
    this.states.delete(name);
    this.subscribers.delete(name);
  }

  static getState(name: string): any {
    const getter = this.states.get(name);
    return getter ? getter() : undefined;
  }

  static getAllStates(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name, getter] of this.states.entries()) {
      try {
        result[name] = getter();
      } catch (error) {
        result[name] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return result;
  }

  static subscribe(name: string, callback: (state: any) => void): () => void {
    if (!this.subscribers.has(name)) {
      this.subscribers.set(name, new Set());
    }
    
    this.subscribers.get(name)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(name)?.delete(callback);
    };
  }

  static notify(name: string, state: any): void {
    const callbacks = this.subscribers.get(name);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error(`State subscriber error for ${name}:`, error);
        }
      });
    }
  }

  static diff(name: string, oldState: any, newState: any): any {
    // Simple object diff - could be enhanced with deep comparison
    if (typeof oldState !== 'object' || typeof newState !== 'object') {
      return oldState !== newState ? { old: oldState, new: newState } : null;
    }

    const changes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(oldState || {}), ...Object.keys(newState || {})]);

    for (const key of allKeys) {
      if (oldState[key] !== newState[key]) {
        changes[key] = { old: oldState[key], new: newState[key] };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  static exportStates(): string {
    return JSON.stringify({
      states: this.getAllStates(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// =====================================
// Development Console
// =====================================

export interface DevConsoleData {
  debug: {
    entries: DebugEntry[];
    namespaces: string[];
    config: DebugConfig;
  };
  api: ApiInspectorData;
  states: Record<string, any>;
  performance: any;
  cache: any;
}

export class DevConsole {
  static getData(): DevConsoleData {
    const debugManager = DebugManager.getInstance();
    
    return {
      debug: {
        entries: debugManager.getEntries(),
        namespaces: debugManager.getNamespaces(),
        config: debugManager.getConfig()
      },
      api: ApiInspector.getData(),
      states: StateInspector.getAllStates(),
      performance: performanceMonitor.getMetrics(),
      cache: apiCache.getStats()
    };
  }

  static export(): string {
    return JSON.stringify(this.getData(), null, 2);
  }

  static clear(): void {
    DebugManager.getInstance().clear();
    ApiInspector.clear();
    apiCache.clear();
  }

  static enableGlobalConsoleAccess(): void {
    if (typeof window !== 'undefined') {
      (window as any).__ENTRIP_DEV__ = {
        debug: DebugManager.getInstance(),
        api: ApiInspector,
        state: StateInspector,
        performance: performanceMonitor,
        cache: apiCache,
        console: DevConsole,
        profiler: Profiler
      };

      console.log('🚀 Entrip Developer Tools available at window.__ENTRIP_DEV__');
    }
  }
}

// =====================================
// Debugging Decorators
// =====================================

/**
 * Method decorator for automatic debugging
 */
export function DebugMethod(namespace?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const debugNamespace = namespace || `${target.constructor.name}`;
    const debug = createDebugger(debugNamespace);

    descriptor.value = async function (...args: any[]) {
      debug.debug(`→ ${propertyKey}`, { args });
      
      const startTime = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        
        debug.debug(`← ${propertyKey} (${duration.toFixed(2)}ms)`, { result });
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        debug.error(`✗ ${propertyKey} (${duration.toFixed(2)}ms)`, { error, args });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Profile method performance
 */
export function ProfileMethod(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const profileName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return Profiler.profile(profileName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// =====================================
// Global Debug Interface
// =====================================

export const debug = {
  // Main debugger factory
  create: createDebugger,
  
  // Global debug manager
  manager: DebugManager.getInstance(),
  
  // Profiler
  profiler: Profiler,
  
  // Inspectors
  api: ApiInspector,
  state: StateInspector,
  
  // Console
  console: DevConsole,
  
  // Enable global access (development only)
  enableGlobal: DevConsole.enableGlobalConsoleAccess,
  
  // Quick access to common debuggers
  client: createDebugger('api-client'),
  hooks: createDebugger('hooks'),
  cache: createDebugger('cache'),
  errors: createDebugger('errors')
};

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  DevConsole.enableGlobalConsoleAccess();
}

// Types are already exported above with their interface definitions