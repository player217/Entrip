'use client'

import React, { useState } from 'react'
import { Icon } from '@entrip/ui'
import { useTeamBookingList } from '@entrip/shared/hooks/useTeamBooking'
import { NewTeamModal } from '@entrip/ui'
import type { TeamBooking } from '@entrip/shared/types/team-booking'
import { logger } from '@entrip/shared'

export function TeamBookingListView() {
  const {
    bookings,
    filters,
    totalCount,
    isLoading,
    error,
    updateFilters,
    clearError
  } = useTeamBookingList()
  
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState(false)
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  }

  const statusLabels = {
    draft: '예약대기',
    confirmed: '확정',
    in_progress: '진행중',
    completed: '완료',
    cancelled: '취소'
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(new Set(bookings.map(b => b.id)))
    } else {
      setSelectedBookings(new Set())
    }
  }

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedBookings)
    if (checked) {
      newSelected.add(bookingId)
    } else {
      newSelected.delete(bookingId)
    }
    setSelectedBookings(newSelected)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ ...filters, teamCode: searchTerm })
  }

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      updateFilters({ ...filters, status: undefined })
    } else {
      updateFilters({ ...filters, status: [status as TeamBooking['status']] })
    }
  }

  const handlePageChange = (page: number) => {
    updateFilters({ ...filters, page })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="ph:warning" className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">팀 예약 관리</h1>
          <button
            onClick={() => setIsNewTeamModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Icon icon="ph:plus" className="w-5 h-5" />
            신규 팀 등록
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Icon
                icon="ph:magnifying-glass"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              />
              <input
                type="text"
                placeholder="팀 코드, 투어명, 고객사명으로 검색"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                !filters.status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.status?.[0] === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Icon icon="ph:spinner" className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Icon icon="ph:file-x" className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">예약 내역이 없습니다</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedBookings.size === bookings.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  팀 코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  투어명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  목적지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  일정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  인원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedBookings.has(booking.id)}
                      onChange={(e) => handleSelectBooking(booking.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {booking.teamCode}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {booking.tourName}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {booking.destination}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div>
                      {new Date(booking.departureDate).toLocaleDateString('ko-KR')} ~
                    </div>
                    <div>
                      {new Date(booking.returnDate).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {booking.nights}박 {booking.days}일
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    <div>{booking.customer.organizationName}</div>
                    <div className="text-xs text-gray-500">
                      {booking.customer.contacts[0]?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div>총 {booking.totalCount}명</div>
                    <div className="text-xs">
                      성인 {booking.adultCount}
                      {booking.childCount > 0 && `, 아동 ${booking.childCount}`}
                      {booking.infantCount > 0 && `, 유아 ${booking.infantCount}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[booking.status]}`}>
                      {statusLabels[booking.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="text-sm">
                      {booking.managers.find(m => m.id === booking.mainManagerId)?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Icon icon="ph:eye" className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Icon icon="ph:pencil" className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Icon icon="ph:trash" className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 {totalCount}건 중 {((filters.page! - 1) * filters.pageSize!) + 1}-
              {Math.min(filters.page! * filters.pageSize!, totalCount)}건 표시
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm">
                {filters.page} / {Math.ceil(totalCount / filters.pageSize!)}
              </span>
              <button
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page! * filters.pageSize! >= totalCount}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewTeamModal
        isOpen={isNewTeamModalOpen}
        onClose={() => setIsNewTeamModalOpen(false)}
        onSave={(data) => {
          logger.info('New team data', JSON.stringify(data));
          // TODO: API 호출 또는 store 업데이트
          setIsNewTeamModalOpen(false);
        }}
        selectedDate={''}
      />
    </div>
  )
}