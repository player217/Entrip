'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { initializeSocket } from '../lib/socket';

type Topic = 'bookings' | 'finance' | 'users';
const legacyBookingEvents = ['booking:create', 'booking:update', 'booking:delete', 'booking:bulk-create', 'booking:bulk-delete'];

/** Re-read the current view on another employee's write or after a network interruption. */
export function useCompanyRefresh(
  topics: readonly Topic[],
  refresh: (signal: AbortSignal) => void | Promise<unknown>
) {
  const owner = useAuthStore(state => state.user);
  const subscription = topics.join(',');
  useEffect(() => {
    if (!owner?.id || !owner.companyCode) return;
    const socket = initializeSocket();
    const watched = subscription.split(',');
    const controller = new AbortController();
    let pending = false;
    let running = false;
    let retry = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const request = () => {
      pending = true;
      if (running || timer || document.hidden || controller.signal.aborted) return;
      // One user action can update a ledger, a balance and an approval together.
      timer = setTimeout(async () => {
        timer = undefined;
        pending = false;
        running = true;
        try {
          await refresh(controller.signal);
          retry = false;
        } catch {
          retry = true;
        } finally {
          running = false;
          if (pending && !controller.signal.aborted) request();
        }
      }, 80);
    };
    const changed = (topic: Topic) => { if (watched.includes(topic)) request(); };
    const resume = () => { if (!document.hidden) request(); };
    socket?.on('company:changed', changed);
    socket?.on('connect', request);
    const bookingEvents = watched.includes('bookings') ? legacyBookingEvents : [];
    for (const event of bookingEvents) socket?.on(event, request);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    const fallback = setInterval(() => {
      if (!document.hidden && (!socket?.connected || retry)) request();
    }, 20000);
    return () => {
      controller.abort();
      clearInterval(fallback);
      clearTimeout(timer);
      socket?.off('company:changed', changed);
      socket?.off('connect', request);
      for (const event of bookingEvents) socket?.off(event, request);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [owner?.id, owner?.companyCode, subscription, refresh]);
}
