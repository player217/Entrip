'use client';
import { useRouter } from 'next/navigation';
import { useMessengerStore } from '@/lib/messenger-store';

export function MessengerPanel() {
  const router = useRouter();
  const unread = useMessengerStore(state => state.conversations.reduce((sum, room) => sum + room.unreadCount, 0));
  return <button type="button" aria-label="메신저 열기" onClick={() => router.push('/chat')} className="relative rounded p-2 hover:bg-gray-100">💬{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white">{unread > 99 ? '99+' : unread}</span>}</button>;
}
