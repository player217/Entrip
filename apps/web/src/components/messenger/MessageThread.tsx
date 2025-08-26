'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessengerStore } from '@/lib/messenger-store';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '@entrip/ui';

export function MessageThread() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const {
    activeConversationId,
    messages,
    typingUsers,
    conversations,
    selectConversation,
  } = useMessengerStore();

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationMessages = messages[activeConversationId!] || [];
  const typingInConversation = typingUsers[activeConversationId!] || [];

  // Auto scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
      
      // Load more messages when scrolled to top
      if (scrollTop === 0 && conversationMessages.length > 0) {
        const firstMessage = conversationMessages[0];
        useMessengerStore.getState().loadMoreMessages(firstMessage.id);
      }
    }
  };

  const getConversationName = () => {
    if (!activeConversation) return '';
    if (activeConversation.name) return activeConversation.name;
    if (activeConversation.type === 'DIRECT') {
      const otherParticipant = activeConversation.participants.find(
        (p: any) => p.user.id !== localStorage.getItem('userId')
      );
      return otherParticipant?.user.name || 'Unknown';
    }
    return 'Unnamed Group';
  };

  const getParticipantCount = () => {
    if (!activeConversation) return 0;
    return activeConversation.participants.length;
  };

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-3 lg:hidden"
            onClick={() => selectConversation('')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <h3 className="font-semibold">{getConversationName()}</h3>
            <p className="text-xs text-gray-500">
              {activeConversation.type === 'DIRECT' 
                ? typingInConversation.length > 0 ? '입력 중...' : '온라인'
                : `참여자 ${getParticipantCount()}명`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {conversationMessages.length === 0 ? (
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
            <p>메시지가 없습니다</p>
            <p className="text-sm mt-2">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          <>
            {conversationMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {typingInConversation.length > 0 && <TypingIndicator users={typingInConversation} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Message Input */}
      <MessageInput />
    </div>
  );
}