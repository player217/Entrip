/**
 * @deprecated This file is deprecated. Please use api-client.ts instead.
 * Migration guide:
 * - import { fetcher, api, ApiError } from './api-client' instead
 * - FetchError is now ApiError
 * - All functionality has been preserved in the new unified client
 */

export class FetchError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(status: number, statusText: string, data?: unknown) {
    super(`API Error: ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.name = 'FetchError';
  }
}

export const fetcher = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  // HttpOnly cookies are sent automatically with credentials: 'include'
  // No need to manually handle tokens - SSOT for authentication

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Determine the full URL
  let fullUrl = url;
  if (!url.startsWith('http')) {
    // For relative URLs, prepend the API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    fullUrl = `${apiUrl}/api${url}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with requests
  });

  // Handle response
  let data;
  try {
    data = await response.json();
  } catch {
    // Response might not be JSON
    data = null;
  }

  if (!response.ok) {
    throw new FetchError(response.status, response.statusText, data);
  }

  return data as T;
};

// Convenience methods
export const api = {
  get: <T>(url: string, options?: RequestInit) => 
    fetcher<T>(url, { ...options, method: 'GET' }),
  
  post: <T>(url: string, body?: unknown, options?: RequestInit) => 
    fetcher<T>(url, { 
      ...options, 
      method: 'POST', 
      body: body ? JSON.stringify(body) : null 
    }),
  
  put: <T>(url: string, body?: unknown, options?: RequestInit) => 
    fetcher<T>(url, { 
      ...options, 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : null 
    }),
  
  patch: <T>(url: string, body?: unknown, options?: RequestInit) => 
    fetcher<T>(url, { 
      ...options, 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : null 
    }),
  
  delete: <T>(url: string, options?: RequestInit) => 
    fetcher<T>(url, { ...options, method: 'DELETE' }),
};