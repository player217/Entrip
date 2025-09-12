'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@entrip/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  isMine: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  avatar?: string;
  isOnline: boolean;
}

export default function ChatPageContent() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 더미 채팅방 데이터
  const [chatRooms] = useState<ChatRoom[]>([
    {
      id: '1',
      name: '김민수 팀장',
      lastMessage: '내일 회의 자료 준비 부탁드립니다.',
      timestamp: new Date('2025-07-30T14:30:00'),
      unreadCount: 2,
      isOnline: true
    },
    {
      id: '2',
      name: '여행상품 기획팀',
      lastMessage: '새로운 일본 상품 기획안이 완료되었습니다.',
      timestamp: new Date('2025-07-30T13:45:00'),
      unreadCount: 5,
      isOnline: false
    },
    {
      id: '3',
      name: '이지영 과장',
      lastMessage: '고객 문의사항 처리 완료했습니다.',
      timestamp: new Date('2025-07-30T12:20:00'),
      unreadCount: 0,
      isOnline: true
    },
    {
      id: '4',
      name: '영업팀 전체',
      lastMessage: '이번 주 매출 실적 공유합니다.',
      timestamp: new Date('2025-07-30T11:15:00'),
      unreadCount: 1,
      isOnline: false
    },
    {
      id: '5',
      name: '박준혁 대리',
      lastMessage: '베트남 출장 일정 확인 부탁드립니다.',
      timestamp: new Date('2025-07-30T10:30:00'),
      unreadCount: 0,
      isOnline: false
    }
  ]);

  // 더미 메시지 데이터
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    '1': [
      {
        id: '1',
        sender: '김민수 팀장',
        content: '안녕하세요! 오늘 업무 상황 어떤가요?',
        timestamp: new Date('2025-07-30T09:00:00'),
        type: 'text',
        isMine: false
      },
      {
        id: '2',
        sender: '나',
        content: '네, 잘 진행되고 있습니다. 월별 리포트 작성 중입니다.',
        timestamp: new Date('2025-07-30T09:05:00'),
        type: 'text',
        isMine: true
      },
      {
        id: '3',
        sender: '김민수 팀장',
        content: '좋습니다. 내일 회의에서 발표할 자료도 함께 준비해주세요.',
        timestamp: new Date('2025-07-30T14:25:00'),
        type: 'text',
        isMine: false
      },
      {
        id: '4',
        sender: '김민수 팀장',
        content: '내일 회의 자료 준비 부탁드립니다.',
        timestamp: new Date('2025-07-30T14:30:00'),
        type: 'text',
        isMine: false
      }
    ],
    '2': [
      {
        id: '1',
        sender: '최서연 대리',
        content: '새로운 일본 패키지 상품 기획안을 공유합니다.',
        timestamp: new Date('2025-07-30T13:40:00'),
        type: 'text',
        isMine: false
      },
      {
        id: '2',
        sender: '최서연 대리',
        content: '새로운 일본 상품 기획안이 완료되었습니다.',
        timestamp: new Date('2025-07-30T13:45:00'),
        type: 'text',
        isMine: false
      }
    ]
  });

  const filteredRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRoomData = selectedRoom ? chatRooms.find(room => room.id === selectedRoom) : null;
  const currentMessages = selectedRoom ? messages[selectedRoom] || [] : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedRoom) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: '나',
      content: message.trim(),
      timestamp: new Date(),
      type: 'text',
      isMine: true
    };

    setMessages(prev => ({
      ...prev,
      [selectedRoom]: [...(prev[selectedRoom] || []), newMessage]
    }));

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex bg-white">
      {/* 채팅방 목록 */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">메신저</h1>
            <button 
              onClick={() => alert('새 대화 시작 기능은 추후 구현 예정입니다.')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="ph:plus" className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* 검색 */}
          <div className="relative">
            <Icon icon="ph:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="대화 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 채팅방 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedRoom === room.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {room.name.charAt(0)}
                  </div>
                  {room.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{room.name}</h3>
                    <span className="text-xs text-gray-500">
                      {format(room.timestamp, 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{room.lastMessage}</p>
                    {room.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {selectedRoomData ? (
          <>
            {/* 채팅 헤더 */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {selectedRoomData.name.charAt(0)}
                    </div>
                    {selectedRoomData.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-900">{selectedRoomData.name}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedRoomData.isOnline ? '온라인' : '오프라인'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:phone" className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:video-camera" className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:dots-three-vertical" className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.isMine
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isMine ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {format(msg.timestamp, 'HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 메시지 입력 */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <button 
                  onClick={() => alert('파일 첨부 기능은 추후 구현 예정입니다.')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="ph:plus" className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon icon="ph:paper-plane-right" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon icon="ph:chat-circle" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">메신저를 시작하세요</h3>
              <p className="text-gray-500">왼쪽에서 대화할 상대를 선택해주세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}