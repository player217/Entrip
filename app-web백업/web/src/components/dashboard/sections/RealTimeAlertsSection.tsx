'use client'

import { useMemo } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useBookings } from '../../../hooks/useBookings'
import type { Booking } from '@entrip/shared'

interface UrgentAlert {
  id: string
  type: 'payment' | 'document' | 'schedule' | 'customer'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  time: string
}

interface PendingTask {
  id: string
  type: 'confirm' | 'payment' | 'document'
  title: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

export function RealTimeAlertsSection() {
  const { bookings: apiBookings, isLoading } = useBookings()

  const alertsData = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return {
        urgentAlerts: [],
        pendingTasks: [],
        todayDeadlines: []
      }
    }

    // 긴급 알림 - 내일/모레 출발하는 미확정 예약
    const urgentAlerts: UrgentAlert[] = []
    const pendingTasks: PendingTask[] = []
    const todayDeadlines: PendingTask[] = []

    apiBookings.forEach((booking: Booking) => {
      const startDate = new Date(booking.startDate)
      const now = new Date()

      // 내일 출발하는데 미확정인 경우
      if (isTomorrow(startDate) && booking.status === 'PENDING') {
        urgentAlerts.push({
          id: booking.id,
          type: 'schedule',
          title: '내일 출발 미확정 예약',
          description: `${booking.teamName} - ${booking.destination}`,
          priority: 'high',
          time: format(now, 'HH:mm')
        })
      }

      // 오늘 출발하는데 미확정인 경우 (매우 긴급)
      if (isToday(startDate) && booking.status === 'PENDING') {
        urgentAlerts.push({
          id: booking.id,
          type: 'schedule',
          title: '오늘 출발 미확정 예약',
          description: `${booking.teamName} - ${booking.destination} (긴급처리 필요)`,
          priority: 'high',
          time: format(now, 'HH:mm')
        })
      }

      // 대기 중인 예약들을 처리 과제로 추가
      if (booking.status === 'PENDING') {
        const daysUntilDeparture = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilDeparture <= 7) { // 일주일 내 출발
          const task: PendingTask = {
            id: booking.id,
            type: 'confirm',
            title: `${booking.teamName} 예약 확정`,
            deadline: format(startDate, 'M월 d일', { locale: ko }),
            priority: daysUntilDeparture <= 2 ? 'high' : daysUntilDeparture <= 4 ? 'medium' : 'low'
          }

          if (daysUntilDeparture <= 1) {
            todayDeadlines.push(task)
          } else {
            pendingTasks.push(task)
          }
        }
      }

      // 결제 관련 알림 (임시 로직)
      if (booking.totalPrice > 5000000 && booking.status === 'CONFIRMED') {
        // 고액 예약에 대한 결제 확인 알림
        const daysSinceCreated = Math.ceil((now.getTime() - new Date(booking.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceCreated >= 3) {
          urgentAlerts.push({
            id: `payment-${booking.id}`,
            type: 'payment',
            title: '결제 확인 필요',
            description: `${booking.teamName} - 고액 예약 결제 확인`,
            priority: 'medium',
            time: format(now, 'HH:mm')
          })
        }
      }
    })

    return {
      urgentAlerts: urgentAlerts.slice(0, 5), // 최대 5개
      pendingTasks: pendingTasks.slice(0, 4),  // 최대 4개
      todayDeadlines: todayDeadlines.slice(0, 3) // 최대 3개
    }
  }, [apiBookings])

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return '📅'
      case 'payment':
        return '💳'
      case 'document':
        return '📄'
      case 'customer':
        return '👥'
      case 'confirm':
        return '✅'
      default:
        return '📋'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">실시간 알림 및 업무</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-gray-500">실시간</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 긴급 알림 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            긴급 처리 ({alertsData.urgentAlerts.length}건)
          </h4>
          {alertsData.urgentAlerts.length > 0 ? (
            <div className="space-y-2">
              {alertsData.urgentAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getPriorityColor(alert.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{getTypeIcon(alert.type)}</span>
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs opacity-80 mt-1">{alert.description}</p>
                      </div>
                    </div>
                    <span className="text-xs opacity-70">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3">긴급 처리할 알림이 없습니다.</p>
          )}
        </div>

        {/* 오늘 마감 업무 */}
        {alertsData.todayDeadlines.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              오늘 마감 ({alertsData.todayDeadlines.length}건)
            </h4>
            <div className="space-y-2">
              {alertsData.todayDeadlines.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getTypeIcon(task.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-orange-900">{task.title}</p>
                      <p className="text-xs text-orange-700">마감: {task.deadline}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {task.priority === 'high' ? '긴급' : task.priority === 'medium' ? '보통' : '낮음'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 처리 대기 업무 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            처리 대기 ({alertsData.pendingTasks.length}건)
          </h4>
          {alertsData.pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {alertsData.pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getTypeIcon(task.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-600">마감: {task.deadline}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {task.priority === 'high' ? '긴급' : task.priority === 'medium' ? '보통' : '낮음'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3">처리 대기 중인 업무가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}