'use client';

import { useEffect, useState } from 'react';
import { useMessengerStore } from '@/lib/messenger-store';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { Button } from '@entrip/ui';

export function MessengerContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { 
    connect, 
    disconnect, 
    isConnected,
    activeConversationId,
    conversations 
  } = useMessengerStore();

  useEffect(() => {
    // Connect to WebSocket when component mounts
    const token = localStorage.getItem('token');
    if (token && isOpen) {
      connect(token);
    }

    return () => {
      disconnect();
    };
  }, [isOpen]);

  // Calculate unread count
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="relative bg-primary text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-lg shadow-2xl transition-all ${
        isFullScreen
          ? 'inset-4'
          : 'bottom-4 right-4 w-[400px] h-[600px] lg:w-[800px] lg:h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">메신저</h2>
          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? '연결됨' : '연결 끊김'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
            {isFullScreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100%-65px)]">
        {/* Conversation List */}
        <div className={`border-r ${activeConversationId ? 'w-1/3' : 'w-full'}`}>
          <ConversationList />
        </div>

        {/* Message Thread */}
        {activeConversationId && (
          <div className="flex-1">
            <MessageThread />
          </div>
        )}
      </div>
    </div>
  );
}