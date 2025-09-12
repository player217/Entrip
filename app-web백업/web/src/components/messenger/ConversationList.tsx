'use client';

import { useState } from 'react';
import { useMessengerStore } from '@/lib/messenger-store';
import { Button } from '@entrip/ui';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function ConversationList() {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, selectConversation, activeConversationId, onlineUsers } = useMessengerStore();

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.participants.some((p: any) => 
        p.user.name.toLowerCase().includes(searchLower)
      ) ||
      conv.lastMessage?.content.toLowerCase().includes(searchLower)
    );
  });

  const getConversationName = (conversation: any) => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'DIRECT') {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== localStorage.getItem('userId')
      );
      return otherParticipant?.user.name || 'Unknown';
    }
    return 'Unnamed Group';
  };

  const getConversationAvatar = (conversation: any) => {
    if (conversation.avatar) return conversation.avatar;
    if (conversation.type === 'DIRECT') {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== localStorage.getItem('userId')
      );
      return otherParticipant?.user.avatar;
    }
    return null;
  };

  const isUserOnline = (conversation: any) => {
    if (conversation.type === 'DIRECT') {
      const otherParticipant = conversation.participants.find(
        (p: any) => p.user.id !== localStorage.getItem('userId')
      );
      return otherParticipant ? onlineUsers.has(otherParticipant.user.id) : false;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="대화 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>대화가 없습니다</p>
            <Button variant="primary" size="sm" className="mt-4">
              새 대화 시작
            </Button>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => selectConversation(conversation.id)}
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                activeConversationId === conversation.id ? 'bg-blue-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {getConversationAvatar(conversation) ? (
                  <img
                    src={getConversationAvatar(conversation)}
                    alt={getConversationName(conversation)}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {getConversationName(conversation)[0]}
                    </span>
                  </div>
                )}
                {isUserOnline(conversation) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">
                    {getConversationName(conversation)}
                  </p>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage?.content || '메시지가 없습니다'}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-3 border-t">
        <Button variant="primary" className="w-full">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          새 대화 시작
        </Button>
      </div>
    </div>
  );
}