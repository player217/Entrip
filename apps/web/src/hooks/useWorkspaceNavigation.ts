'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspaceStore } from '@entrip/shared/client';
import { ContentType, getContentFromUrl, setContentInUrl } from '@/lib/navigation';

export function useWorkspaceNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateActiveTabContent } = useWorkspaceStore();
  
  const currentContent = getContentFromUrl(searchParams);
  
  // URL → 내부 상태 동기화
  useEffect(() => {
    if (currentContent && currentContent !== 'empty') {
      updateActiveTabContent(currentContent);
    }
  }, [currentContent, updateActiveTabContent]);
  
  // 내부 상태 → URL 동기화
  const navigateToContent = (content: ContentType) => {
    if (content !== currentContent) {
      updateActiveTabContent(content);
      setContentInUrl(content, router, searchParams);
    }
  };
  
  return {
    currentContent,
    navigateToContent,
    isWorkspacePage: true
  };
}