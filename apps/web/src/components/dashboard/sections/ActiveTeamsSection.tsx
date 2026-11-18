'use client'

import { useId, useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useBookings } from '../../../hooks/useBookings'
import type { Booking } from '@entrip/shared'
import { dateKey, dayDistance } from '../../../lib/bookingAnalytics'

interface TravelingTeam {
  id: string
  teamName: string
  destination: string
  currentDay: number
  totalDays: number
  startDate: string
  endDate: string
  paxCount: number
  manager: string
  status: 'traveling' | 'returning_today' | 'returning_tomorrow'
}

interface UpcomingTeam {
  id: string
  teamName: string
  destination: string
  startDate: string
  paxCount: number
  daysUntilDeparture: number
  manager: string
  status: 'confirmed' | 'pending'
}

export function ActiveTeamsSection() {
  const { bookings: apiBookings, isLoading, isError } = useBookings()
  const [showAllTraveling, setShowAllTraveling] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const travelingId = useId()
  const upcomingId = useId()

  const teamsData = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return {
        travelingTeams: [],
        upcomingTeams: []
      }
    }

    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd')

    // 현재 여행 중인 팀들
    const travelingTeams: TravelingTeam[] = []

    // 곧 출발하는 팀들 (7일 내)
    const upcomingTeams: UpcomingTeam[] = []

    apiBookings.filter(b => b.status !== 'CANCELLED').forEach((booking: Booking) => {
      const startDateStr = dateKey(booking.startDate)
      const endDateStr = dateKey(booking.endDate)

      // 현재 여행 중인 팀 (시작일 <= 오늘 <= 종료일)
      if (startDateStr <= today && endDateStr >= today && booking.status !== 'PENDING') {
        // 현재 진행 일차 계산
        const daysPassed = dayDistance(startDateStr, today) + 1
        const totalDays = dayDistance(startDateStr, endDateStr) + 1

        let status: 'traveling' | 'returning_today' | 'returning_tomorrow' = 'traveling'

        if (endDateStr === today) {
          status = 'returning_today'
        } else if (endDateStr === tomorrow) {
          status = 'returning_tomorrow'
        }

        travelingTeams.push({
          id: booking.id,
          teamName: booking.teamName,
          destination: booking.destination,
          currentDay: daysPassed,
          totalDays,
          startDate: startDateStr,
          endDate: endDateStr,
          paxCount: booking.paxCount,
          manager: booking.managerName || booking.coordinator || booking.user?.name || '미정',
          status
        })
      }

      // 곧 출발하는 팀들 (미래 출발일이지만 7일 이내)
      else if (startDateStr > today) {
        const daysUntilDeparture = dayDistance(today, startDateStr)

        if (daysUntilDeparture <= 7) {
          upcomingTeams.push({
            id: booking.id,
            teamName: booking.teamName,
            destination: booking.destination,
            startDate: startDateStr,
            paxCount: booking.paxCount,
            daysUntilDeparture,
            manager: booking.managerName || booking.coordinator || booking.user?.name || '미정',
            status: booking.status === 'CONFIRMED' ? 'confirmed' : 'pending'
          })
        }
      }
    })

    return {
      travelingTeams,
      upcomingTeams
    }
  }, [apiBookings])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'traveling':
        return 'bg-blue-100 text-blue-700'
      case 'returning_today':
        return 'bg-green-100 text-green-700'
      case 'returning_tomorrow':
        return 'bg-yellow-100 text-yellow-700'
      case 'confirmed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'traveling':
        return '여행중'
      case 'returning_today':
        return '오늘 복귀'
      case 'returning_tomorrow':
        return '내일 복귀'
      case 'confirmed':
        return '확정'
      case 'pending':
        return '대기'
      default:
        return '상태'
    }
  }

  if (isError) return <p role="alert" className="p-6 text-red-700">진행 중인 팀을 불러오지 못했습니다.</p>

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
        <h3 className="text-lg font-semibold text-gray-900">현재 진행 중인 팀들</h3>
        <span className="text-sm text-gray-500">
          여행중 {teamsData.travelingTeams.length}팀
        </span>
      </div>

      <div className="space-y-6">
        {/* 현재 여행 중인 팀들 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            여행 중인 팀 ({teamsData.travelingTeams.length}팀)
          </h4>
          {teamsData.travelingTeams.length > 0 ? (
            <div id={travelingId} className="grid gap-3">
              {(showAllTraveling ? teamsData.travelingTeams : teamsData.travelingTeams.slice(0, 6)).map((team) => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900">{team.teamName}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                          {getStatusText(team.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{team.destination} · {team.paxCount}명</p>
                      <p className="text-xs text-gray-500 mt-1">담당: {team.manager}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {team.currentDay}일차 / {team.totalDays}일
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(team.endDate), 'M월 d일', { locale: ko })} 복귀
                      </div>
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(team.currentDay / team.totalDays) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{format(new Date(team.startDate), 'M월 d일', { locale: ko })}</span>
                    <span>{Math.round((team.currentDay / team.totalDays) * 100)}%</span>
                    <span>{format(new Date(team.endDate), 'M월 d일', { locale: ko })}</span>
                  </div>
                </div>
              ))}
              {!showAllTraveling && teamsData.travelingTeams.length > 6 && <p className="entrip-print-only dashboard-preview-count">전체 {teamsData.travelingTeams.length}건 중 화면에 표시된 6건</p>}
              {teamsData.travelingTeams.length > 6 && (
                <button type="button" aria-expanded={showAllTraveling} aria-controls={travelingId}
                  onClick={() => setShowAllTraveling(value => !value)}
                  className="w-full rounded py-2 text-center text-xs text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                  {showAllTraveling ? '여행 중인 팀 접기' : `+${teamsData.travelingTeams.length - 6}개 팀 더보기`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">현재 여행 중인 팀이 없습니다.</p>
          )}
        </div>

        {/* 곧 출발하는 팀들 */}
        {teamsData.upcomingTeams.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              출발 예정 ({teamsData.upcomingTeams.length}팀)
            </h4>
            <div id={upcomingId} className="space-y-2">
              {(showAllUpcoming ? teamsData.upcomingTeams : teamsData.upcomingTeams.slice(0, 4)).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      team.status === 'confirmed' ? 'bg-green-500' : 'bg-orange-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{team.teamName}</p>
                      <p className="text-xs text-gray-600">{team.destination} · {team.paxCount}명</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">
                      {team.daysUntilDeparture === 1 ? '내일' : `${team.daysUntilDeparture}일 후`}
                    </p>
                    <p className="text-xs text-gray-500">{team.manager}</p>
                  </div>
                </div>
              ))}
              {!showAllUpcoming && teamsData.upcomingTeams.length > 4 && <p className="entrip-print-only dashboard-preview-count">전체 {teamsData.upcomingTeams.length}건 중 화면에 표시된 4건</p>}
              {teamsData.upcomingTeams.length > 4 && (
                <button type="button" aria-expanded={showAllUpcoming} aria-controls={upcomingId}
                  onClick={() => setShowAllUpcoming(value => !value)}
                  className="w-full rounded py-2 text-center text-xs text-blue-700 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                  {showAllUpcoming ? '출발 예정 접기' : `+${teamsData.upcomingTeams.length - 4}개 팀 더보기`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
