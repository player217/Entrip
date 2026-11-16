'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useMessengerStore } from '@/lib/messenger-store';

/** Own the signed-in session connection independently of the selected workspace tab. */
export function MessengerContainer() {
  const user = useAuthStore(state => state.user);
  useEffect(() => {
    if (user) useMessengerStore.getState().initialize({ ...user, email: user.email || '' });
    else useMessengerStore.getState().disconnect();
    return () => useMessengerStore.getState().disconnect();
  }, [user?.id, user?.companyCode]);
  return null;
}
