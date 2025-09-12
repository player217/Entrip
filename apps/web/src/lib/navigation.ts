// Navigation helper for consistent routing
import { ReadonlyURLSearchParams } from 'next/navigation';
export const routes = {
  workspace: (content: 'monthlyCalendar' | 'calendar' | 'monthlyList' | 'list' | 'flow') =>
    `/workspace?content=${content}`,
  
  // Direct reservations page (no workspace redirect)
  reservations: (view?: string) => {
    // Now returns direct URL to reservations page
    return '/reservations';
  }
};

export type ContentType = 'monthlyCalendar' | 'calendar' | 'monthlyList' | 'list' | 'flow' | 'empty';

// URL parameter utilities
export const getContentFromUrl = (searchParams: URLSearchParams | ReadonlyURLSearchParams): ContentType => {
  const content = searchParams.get('content') as ContentType;
  return content || 'empty';
};

export const setContentInUrl = (content: ContentType, router: { push: (url: string, options?: { scroll: boolean }) => void }, searchParams: URLSearchParams | ReadonlyURLSearchParams) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('content', content);
  router.push(`/workspace?${params.toString()}`, { scroll: false });
};