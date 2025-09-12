'use client'

import { useState } from 'react'
import { Button } from '@entrip/ui'

/* TODO(booking-modal): 구현 전까지 비활성화
interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  isMe: boolean
}
*/

/* TODO(booking-modal): 구현 전까지 비활성화
const _mockMessages: Message[] = [
  {
    id: '1',
    sender: '김철수',
    content: '발리 골프투어 견적서 확인 부탁드립니다.',
    timestamp: new Date(),
    isMe: false,
  },
  {
    id: '2',
    sender: '나',
    content: '네, 확인하고 회신드리겠습니다.',
    timestamp: new Date(),
    isMe: true,
  },
]
*/

export function MessengerPanel() {
  const [showMessenger, setShowMessenger] = useState(false)
  // const [messages] = useState(mockMessages) // TODO: Use for message display
  const unreadCount = 2 // TODO: 실제 미읽은 메시지 수 계산

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMessenger(!showMessenger)}
        className="relative"
      >
        💬
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {showMessenger && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">메신저</h3>
          </div>
          
          {/* 채팅 목록 */}
          <div className="max-h-96 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" />
                <div className="flex-1">
                  <p className="font-medium">김철수</p>
                  <p className="text-sm text-gray-600 truncate">발리 골프투어 견적서 확인...</p>
                </div>
                <span className="text-xs text-gray-400">방금</span>
              </div>
              <div className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" />
                <div className="flex-1">
                  <p className="font-medium">이영희</p>
                  <p className="text-sm text-gray-600 truncate">태국 호텔 예약 관련 문의</p>
                </div>
                <span className="text-xs text-gray-400">10분 전</span>
              </div>
            </div>
          </div>

          {/* TODO: WebSocket 연결 및 실시간 채팅 구현 */}
        </div>
      )}
    </div>
  )
}
