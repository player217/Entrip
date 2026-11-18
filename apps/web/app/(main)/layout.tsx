'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import AppFrame from '@/components/layout/AppFrame';
import { LogViewer } from '@/components/debug/LogViewer';
import { ToastProvider } from '@/providers/ToastProvider';
import { MessengerContainer } from '@/components/messenger/MessengerContainer';
import { useAuthStore } from '@/lib/auth-store';

async function fetchSession(url: string) {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw Object.assign(new Error('인증 연결 실패'), { status: response.status });
  const result = await response.json();
  const user = result.data?.user ?? result.user;
  if (!result.success || !user) throw new Error('인증 응답을 확인할 수 없습니다.');
  return user;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, error, mutate } = useSWR('/api/v2/auth/me', fetchSession, {
    revalidateOnFocus: false, revalidateOnReconnect: true, shouldRetryOnError: false,
  });
  const unauthorized = error?.status === 401 || error?.status === 403;
  useEffect(() => {
    if (unauthorized) {
      useAuthStore.getState().invalidateSession();
      router.replace('/login');
    } else if (user) {
      useAuthStore.setState({ user, isAuthenticated: true, token: null, isLoading: false });
    }
  }, [user, unauthorized, router]);

  if (isLoading || unauthorized) return <div className="min-h-screen flex items-center justify-center">인증 확인 중...</div>;
  if (!user) return <div className="min-h-screen flex flex-col gap-4 items-center justify-center"><p>서버 연결을 확인할 수 없습니다.</p><button onClick={() => void mutate()} className="rounded bg-blue-600 px-4 py-2 text-white">다시 시도</button></div>;
  return <ToastProvider><div className="font-sans"><AppFrame user={user}>{children}</AppFrame><MessengerContainer /></div><div className="entrip-no-print"><LogViewer /></div></ToastProvider>;
}
