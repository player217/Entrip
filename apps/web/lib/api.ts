/**
 * @deprecated This file is deprecated. Please use apps/web/src/lib/api-client.ts instead.
 * Migration guide:
 * - import { api } from '@/lib/api-client' instead
 * - All functionality has been preserved in the new unified client
 */

// Re-export everything from api-client for backward compatibility
export * from '../src/lib/api-client';
export { default } from '../src/lib/api-client';