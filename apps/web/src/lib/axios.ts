/**
 * @deprecated This file is deprecated. Please use api-client.ts instead.
 * Migration guide:
 * - import apiClient from './api-client' instead of axiosInstance
 * - All functionality has been preserved in the new unified client
 */

// Re-export everything from api-client for backward compatibility
export { default } from './api-client';
export * from './api-client';