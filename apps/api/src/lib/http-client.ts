import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export type RetryPolicy = {
  retries: number;          // e.g., 3
  baseDelayMs: number;      // 200
  maxDelayMs: number;       // 2000
  retryOn: (status?: number, err?: any) => boolean; // 5xx|429|timeout
};

/**
 * Exponential backoff with jitter calculation
 */
export function expBackoff(attempt: number, base: number, max: number): number {
  const jitter = Math.random() * 100;
  return Math.min(max, Math.pow(2, attempt) * base + jitter);
}

/**
 * Create HTTP client with timeout and common configuration
 */
export function createHttpClient(baseURL: string, timeoutMs = 3000): AxiosInstance {
  const inst = axios.create({ 
    baseURL, 
    timeout: timeoutMs,
    headers: {
      'User-Agent': 'Entrip-Integration-Client/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor for logging
  inst.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for logging
  inst.interceptors.response.use(
    (response) => {
      const duration = Date.now() - response.config.metadata?.startTime;
      response.duration = duration;
      return response;
    },
    (error) => {
      if (error.config?.metadata?.startTime) {
        error.duration = Date.now() - error.config.metadata.startTime;
      }
      return Promise.reject(error);
    }
  );

  return inst;
}

/**
 * Execute function with retry logic using exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  policy: RetryPolicy
): Promise<T> {
  let lastErr: any;
  
  for (let attempt = 0; attempt <= policy.retries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      
      // Don't retry on the last attempt
      if (attempt === policy.retries) {
        throw e;
      }
      
      // Check if we should retry based on policy
      if (!policy.retryOn(status, e)) {
        throw e;
      }
      
      // Calculate delay and wait
      const delay = expBackoff(attempt + 1, policy.baseDelayMs, policy.maxDelayMs);
      console.log(`Retry attempt ${attempt + 1}/${policy.retries} after ${delay}ms delay. Error:`, {
        status,
        message: e.message,
        code: e.code
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastErr;
}

/**
 * Default retry policy for external API calls
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  retries: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  retryOn: (status?: number, err?: any) => {
    // Retry on network errors
    if (!status && (err?.code === 'ECONNABORTED' || err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED')) {
      return true;
    }
    
    // Retry on 5xx server errors and 429 too many requests
    if (status && (status >= 500 || status === 429)) {
      return true;
    }
    
    // Don't retry on 4xx client errors (except 429)
    return false;
  }
};

/**
 * Conservative retry policy for critical operations
 */
export const CONSERVATIVE_RETRY_POLICY: RetryPolicy = {
  retries: 2,
  baseDelayMs: 500,
  maxDelayMs: 3000,
  retryOn: (status?: number, err?: any) => {
    // Only retry on clear server errors
    return status ? status >= 500 : false;
  }
};

/**
 * Aggressive retry policy for non-critical operations
 */
export const AGGRESSIVE_RETRY_POLICY: RetryPolicy = {
  retries: 5,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryOn: (status?: number, err?: any) => {
    // Retry on most transient errors
    if (!status) return true;
    return status >= 500 || status === 429 || status === 408; // Include request timeout
  }
};

// Type augmentation for axios to include metadata and duration
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
  
  interface AxiosResponse {
    duration?: number;
  }
  
  interface AxiosError {
    duration?: number;
  }
}