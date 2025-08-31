'use client'

import React, { useState } from 'react'
import { Button, Input, Card } from '@entrip/ui'

interface BookingFormData {
  teamName: string
  type: string
  origin: string
  destination: string
  startDate: string
  endDate: string
  totalPax: number
  status: string
  coordinator: string
  revenue: number
  notes?: string
  // 📈 누락 필드 추가
  phoneNumber?: string
  email?: string
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking?: Partial<BookingFormData>
  onSave: (data: BookingFormData) => void
}

export function BookingModal({ isOpen, onClose, booking, onSave }: BookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    teamName: booking?.teamName || '',
    type: booking?.type || '인센티브',
    origin: booking?.origin || '인천',
    destination: booking?.destination || '',
    startDate: booking?.startDate || '',
    endDate: booking?.endDate || '',
    totalPax: booking?.totalPax || 1,
    status: booking?.status || 'pending',
    coordinator: booking?.coordinator || '',
    revenue: booking?.revenue || 0,
    notes: booking?.notes || '',
    // 📈 누락 필드 초기화
    phoneNumber: booking?.phoneNumber || '',
    email: booking?.email || '',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const handleChange = (field: keyof BookingFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {booking ? '예약 수정' : '새 예약 등록'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="팀명"
                value={formData.teamName}
                onChange={(e) => handleChange('teamName', e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  예약 유형
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="인센티브">인센티브</option>
                  <option value="골프">골프</option>
                  <option value="허니문">허니문</option>
                  <option value="에어텔">에어텔</option>
                  <option value="워크샵">워크샵</option>
                  <option value="포상여행">포상여행</option>
                  <option value="팀빌딩">팀빌딩</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="출발지"
                value={formData.origin}
                onChange={(e) => handleChange('origin', e.target.value)}
                required
              />
              <Input
                label="목적지"
                value={formData.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="출발일"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <Input
                type="date"
                label="도착일"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="인원수"
                value={formData.totalPax}
                onChange={(e) => handleChange('totalPax', parseInt(e.target.value))}
                min={1}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">대기</option>
                  <option value="confirmed">확정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="담당자"
                value={formData.coordinator}
                onChange={(e) => handleChange('coordinator', e.target.value)}
                required
              />
              <Input
                type="number"
                label="매출액 (원)"
                value={formData.revenue}
                onChange={(e) => handleChange('revenue', parseInt(e.target.value))}
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비고
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="추가 정보를 입력하세요..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" variant="primary">
                {booking ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
