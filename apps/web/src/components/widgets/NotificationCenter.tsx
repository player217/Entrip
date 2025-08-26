'use client'

import { useState } from 'react'
import { Button } from '@entrip/ui'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '새 예약 등록',
    message: '김철수팀 발리 골프투어가 등록되었습니다.',
    type: 'info',
    timestamp: new Date(),
    read: false,
  },
  {
    id: '2',
    title: '결재 요청',
    message: '이영희팀 태국 인센티브 결재 요청이 있습니다.',
    type: 'warning',
    timestamp: new Date(),
    read: false,
  },
]

export function NotificationCenter() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications] = useState(mockNotifications)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">알림</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.timestamp.toLocaleString('ko-KR')}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-brand-500 rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                알림이 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
