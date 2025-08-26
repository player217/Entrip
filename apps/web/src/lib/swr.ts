'use client';

import React from 'react';
import { SWRConfig } from 'swr';
import apiClient from './api-client';

// Global fetcher function
export const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

// SWR default configuration
export const swrConfig = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 3000,
  refreshInterval: 0,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
};

// Provider component
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(SWRConfig, { value: swrConfig }, children);
}