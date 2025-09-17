/**
 * TypeScript Auto-completion Helpers
 * Advanced type utilities for enhanced developer experience and IDE support
 */

// =====================================
// URL and Endpoint Type Utilities
// =====================================

/**
 * Extract path parameters from URL string literal types
 */
export type ExtractPathParams<T extends string> = 
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractPathParams<Rest>
    : T extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : {};

/**
 * API endpoint definitions with type safety
 */
export interface ApiEndpointDefinition<
  TPath extends string = string,
  TMethod extends HttpMethod = HttpMethod,
  TRequest = unknown,
  TResponse = unknown
> {
  path: TPath;
  method: TMethod;
  request?: TRequest;
  response?: TResponse;
  params?: ExtractPathParams<TPath>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Type-safe API endpoint builder
 */
export function defineEndpoint<
  TPath extends string,
  TMethod extends HttpMethod,
  TRequest = unknown,
  TResponse = unknown
>(definition: {
  path: TPath;
  method: TMethod;
  request?: TRequest;
  response?: TResponse;
}): ApiEndpointDefinition<TPath, TMethod, TRequest, TResponse> {
  return definition as ApiEndpointDefinition<TPath, TMethod, TRequest, TResponse>;
}

/**
 * Build URL with type-safe parameters
 */
export function buildUrl<T extends string>(
  path: T,
  params: ExtractPathParams<T>,
  query?: Record<string, string | number | boolean>
): string {
  let url = path as string;
  
  // Replace path parameters
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  
  // Add query parameters
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      searchParams.append(key, String(value));
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
}

// =====================================
// Response Type Utilities
// =====================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: number;
    requestId: string;
    version: string;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Type guard for API responses
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as any).success === 'boolean'
  );
}

/**
 * Type guard for successful API responses
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

/**
 * Type guard for error API responses
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { 
  error: NonNullable<ApiResponse<T>['error']> 
} {
  return !response.success && response.error !== undefined;
}

// =====================================
// Request Configuration Types
// =====================================

/**
 * Enhanced request configuration with type safety
 */
export interface TypedRequestConfig<TRequest = unknown> {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: TRequest;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  tags?: string[];
  priority?: number;
  signal?: AbortSignal;
}

/**
 * Request factory with type inference
 */
export function createTypedRequest<TRequest, TResponse>(
  config: TypedRequestConfig<TRequest>
) {
  return {
    config,
    // Type helpers
    withBody: <U>(body: U) => createTypedRequest<U, TResponse>({ ...config, body }),
    withHeaders: (headers: Record<string, string>) => 
      createTypedRequest<TRequest, TResponse>({ ...config, headers: { ...config.headers, ...headers } }),
    withTimeout: (timeout: number) => 
      createTypedRequest<TRequest, TResponse>({ ...config, timeout }),
    // Response type is inferred
    execute: async (): Promise<TResponse> => {
      throw new Error('Execute method should be implemented by API client');
    }
  };
}

// =====================================
// Hook Type Utilities
// =====================================

/**
 * Query options for data fetching hooks
 */
export interface QueryOptions<TData = unknown, TError = Error> {
  enabled?: boolean;
  retry?: boolean | number;
  retryDelay?: number | ((attempt: number) => number);
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  onSettled?: (data: TData | undefined, error: TError | null) => void;
}

/**
 * Query result type
 */
export interface QueryResult<TData = unknown, TError = Error> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  refetch: () => void;
  invalidate: () => void;
}

/**
 * Mutation options
 */
export interface MutationOptions<TData = unknown, TError = Error, TVariables = unknown> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
  retry?: boolean | number;
}

/**
 * Mutation result type
 */
export interface MutationResult<TData = unknown, TError = Error, TVariables = unknown> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

// =====================================
// Entity Type Utilities
// =====================================

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

/**
 * Utility type to make all properties optional except ID
 */
export type PartialEntity<T extends BaseEntity> = Partial<Omit<T, 'id'>> & Pick<T, 'id'>;

/**
 * Utility type for entity creation (without system fields)
 */
export type CreateEntity<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

/**
 * Utility type for entity updates (optional fields except ID)
 */
export type UpdateEntity<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> & Pick<T, 'id'>;

/**
 * Utility type for filtering entities
 */
export type EntityFilter<T> = {
  [K in keyof T]?: T[K] extends string 
    ? string | string[] | { contains?: string; startsWith?: string; endsWith?: string }
    : T[K] extends number
    ? number | { gt?: number; gte?: number; lt?: number; lte?: number }
    : T[K] extends boolean
    ? boolean
    : T[K] extends Date | string
    ? string | { before?: string; after?: string }
    : T[K];
};

/**
 * Sorting options
 */
export interface SortOption<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Complete query parameters for entity lists
 */
export interface EntityQueryParams<T> extends PaginationOptions {
  filter?: EntityFilter<T>;
  sort?: SortOption<T>[];
  include?: string[];
  search?: string;
}

// =====================================
// Form Type Utilities
// =====================================

/**
 * Form field validation result
 */
export interface FieldValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Form validation result
 */
export interface FormValidation<T> {
  isValid: boolean;
  fields: { [K in keyof T]?: FieldValidation };
  errors: string[];
  warnings: string[];
}

/**
 * Form field configuration
 */
export interface FieldConfig<T = unknown> {
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  validation?: (value: T) => FieldValidation | Promise<FieldValidation>;
  transform?: (value: unknown) => T;
  defaultValue?: T;
  options?: Array<{ label: string; value: T }>;
}

/**
 * Form configuration
 */
export type FormConfig<T> = {
  [K in keyof T]: FieldConfig<T[K]>;
};

/**
 * Form state
 */
export interface FormState<T> {
  values: T;
  errors: { [K in keyof T]?: string };
  touched: { [K in keyof T]?: boolean };
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// =====================================
// Component Prop Utilities
// =====================================

/**
 * Extract component props from component type
 */
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

/**
 * Make some props optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make some props required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Props with children
 */
export interface WithChildren {
  children?: React.ReactNode;
}

/**
 * Props with className
 */
export interface WithClassName {
  className?: string;
}

/**
 * Common component props
 */
export interface CommonProps extends WithChildren, WithClassName {
  id?: string;
  testId?: string;
}

// =====================================
// API Client Type Helpers
// =====================================

/**
 * Type-safe API client interface
 */
export interface TypedApiClient {
  get<T>(url: string, config?: TypedRequestConfig): Promise<T>;
  post<T, U = unknown>(url: string, data?: U, config?: TypedRequestConfig<U>): Promise<T>;
  put<T, U = unknown>(url: string, data?: U, config?: TypedRequestConfig<U>): Promise<T>;
  patch<T, U = unknown>(url: string, data?: U, config?: TypedRequestConfig<U>): Promise<T>;
  delete<T>(url: string, config?: TypedRequestConfig): Promise<T>;
}

/**
 * API method builder with type inference
 */
export function createApiMethod<TRequest, TResponse>(
  client: TypedApiClient,
  endpoint: ApiEndpointDefinition<string, HttpMethod, TRequest, TResponse>
) {
  return async (
    params: ExtractPathParams<typeof endpoint.path>,
    data?: TRequest,
    config?: TypedRequestConfig<TRequest>
  ): Promise<TResponse> => {
    const url = buildUrl(endpoint.path, params);
    
    switch (endpoint.method) {
      case 'GET':
        return client.get<TResponse>(url, config);
      case 'POST':
        return client.post<TResponse, TRequest>(url, data, config);
      case 'PUT':
        return client.put<TResponse, TRequest>(url, data, config);
      case 'PATCH':
        return client.patch<TResponse, TRequest>(url, data, config);
      case 'DELETE':
        return client.delete<TResponse>(url, config);
      default:
        throw new Error(`Unsupported method: ${endpoint.method}`);
    }
  };
}

// =====================================
// Utility Type Helpers
// =====================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extract type from Promise
 */
export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

/**
 * Extract type from array
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Create union type from object values
 */
export type ValueOf<T> = T[keyof T];

/**
 * Create union type from object keys
 */
export type KeyOf<T> = keyof T;

/**
 * Conditional type based on boolean
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Get function parameters as tuple
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Get function return type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// =====================================
// Example Usage and Exports
// =====================================

/**
 * Example API endpoint definitions
 */
export const exampleEndpoints = {
  getUser: defineEndpoint({
    path: '/api/users/:id',
    method: 'GET',
    response: {} as { id: string; name: string; email: string }
  }),
  
  createBooking: defineEndpoint({
    path: '/api/bookings',
    method: 'POST',
    request: {} as { customerName: string; destination: string; startDate: string },
    response: {} as { id: string; bookingNumber: string; status: string }
  }),
  
  updateBooking: defineEndpoint({
    path: '/api/bookings/:id',
    method: 'PUT',
    request: {} as Partial<{ customerName: string; destination: string; startDate: string }>,
    response: {} as { id: string; bookingNumber: string; status: string }
  })
};

/**
 * Type inference examples
 */
export type ExampleUserParams = ExtractPathParams<'/api/users/:id'>; // { id: string }
export type ExampleBookingRequest = typeof exampleEndpoints.createBooking.request;
export type ExampleBookingResponse = typeof exampleEndpoints.createBooking.response;

// Export all utilities for easy consumption
export const TypeScriptHelpers = {
  defineEndpoint,
  buildUrl,
  createTypedRequest,
  createApiMethod,
  isApiResponse,
  isSuccessResponse,
  isErrorResponse
};

// Types are already exported above with their definitions