/**
 * SWR Data Provider implementation
 */

import { mutate as globalMutate } from 'swr';
import type { DataProvider } from '../types';

export class SWRProvider implements DataProvider<any> {
  private apiClient: any;
  private fetcher: (url: string) => Promise<any>;
  
  constructor(apiClient: any) {
    this.apiClient = apiClient;
    this.fetcher = (url: string) => apiClient.get(url).then((res: any) => res.data);
  }
  
  /**
   * Fetch data using the configured fetcher
   */
  async fetch(url: string, options?: any): Promise<any> {
    try {
      return await this.fetcher(url);
    } catch (error) {
      console.error('[SWRProvider] Fetch error:', error);
      throw error;
    }
  }
  
  /**
   * Mutate SWR cache
   */
  async mutate(key: string | ((key: any) => boolean)): Promise<void> {
    await globalMutate(key);
  }
  
  /**
   * Subscribe to cache changes (not directly supported by SWR)
   * This is more for compatibility with other providers
   */
  subscribe(key: string, callback: () => void): () => void {
    // SWR doesn't have direct subscription API
    // This would need to be implemented differently
    console.warn('[SWRProvider] Direct subscription not supported, use SWR hooks instead');
    return () => {};
  }
}