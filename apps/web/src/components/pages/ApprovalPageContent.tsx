'use client';

import React, { useState } from 'react';
import { Icon } from '@entrip/ui';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ApprovalItem {
  id: string;
  title: string;
  type: 'expense' | 'leave' | 'booking';
  requestor: string;
  department: string;
  requestDate: Date;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  urgency: 'normal' | 'urgent';
}

// 더미 데이터
const mockApprovals: ApprovalItem[] = [
  {
    id: '1',
    title: '베트남 다낭 3박4일 패키지 집행 결재',
    type: 'booking',
    requestor: '김민수',
    department: '해외여행팀',
    requestDate: new Date('2025-07-30T09:30:00'),
    amount: 3500000,
    status: 'pending',
    urgency: 'urgent'
  },
  {
    id: '2',
    title: '일본 오사카 가족여행 집행 결재',
    type: 'booking',
    requestor: '이지영',
    department: '일본팀',
    requestDate: new Date('2025-07-30T10:15:00'),
    amount: 5200000,
    status: 'pending',
    urgency: 'normal'
  },
  {
    id: '3',
    title: '제주도 골프투어 집행 결재',
    type: 'booking',
    requestor: '박준혁',
    department: '국내여행팀',
    requestDate: new Date('2025-07-29T14:20:00'),
    amount: 2800000,
    status: 'approved',
    urgency: 'normal'
  },
  {
    id: '4',
    title: '싱가포르 인센티브 투어 집행 결재',
    type: 'booking',
    requestor: '최서연',
    department: '기업영업팀',
    requestDate: new Date('2025-07-29T11:00:00'),
    amount: 15000000,
    status: 'pending',
    urgency: 'urgent'
  },
  {
    id: '5',
    title: '태국 방콕 신혼여행 집행 결재',
    type: 'booking',
    requestor: '정태호',
    department: '허니문팀',
    requestDate: new Date('2025-07-28T16:45:00'),
    amount: 4200000,
    status: 'rejected',
    urgency: 'normal'
  }
];

export default function ApprovalPageContent() {
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);

  const filteredApprovals = mockApprovals.filter(item => 
    selectedStatus === 'all' || item.status === selectedStatus
  );

  const getStatusColor = (status: ApprovalItem['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
    }
  };

  const getStatusText = (status: ApprovalItem['status']) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인';
      case 'rejected':
        return '반려';
    }
  };

  const getTypeIcon = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'expense':
        return 'ph:receipt';
      case 'leave':
        return 'ph:calendar-blank';
      case 'booking':
        return 'ph:airplane-takeoff';
    }
  };

  const pendingCount = mockApprovals.filter(item => item.status === 'pending').length;
  const approvedCount = mockApprovals.filter(item => item.status === 'approved').length;
  const rejectedCount = mockApprovals.filter(item => item.status === 'rejected').length;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">결재 관리</h1>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Icon icon="ph:check-square" className="w-5 h-5" />
            일괄 승인
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div 
          className={clsx(
            'bg-white rounded-lg border p-4 cursor-pointer transition-all',
            selectedStatus === 'all' ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
          )}
          onClick={() => setSelectedStatus('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체</p>
              <p className="text-2xl font-bold text-gray-900">{mockApprovals.length}</p>
            </div>
            <Icon icon="ph:list" className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div 
          className={clsx(
            'bg-white rounded-lg border p-4 cursor-pointer transition-all',
            selectedStatus === 'pending' ? 'border-yellow-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
          )}
          onClick={() => setSelectedStatus('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">대기중</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Icon icon="ph:clock" className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div 
          className={clsx(
            'bg-white rounded-lg border p-4 cursor-pointer transition-all',
            selectedStatus === 'approved' ? 'border-green-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
          )}
          onClick={() => setSelectedStatus('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <Icon icon="ph:check-circle" className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div 
          className={clsx(
            'bg-white rounded-lg border p-4 cursor-pointer transition-all',
            selectedStatus === 'rejected' ? 'border-red-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
          )}
          onClick={() => setSelectedStatus('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">반려</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <Icon icon="ph:x-circle" className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* 결재 리스트 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  구분
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요청자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  부서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요청일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApprovals.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusColor(item.status)
                    )}>
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Icon icon={getTypeIcon(item.type)} className="w-5 h-5 text-gray-500" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.urgency === 'urgent' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          긴급
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.requestor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.amount ? `₩${item.amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(item.requestDate, 'MM/dd HH:mm', { locale: ko })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button 
                          className="text-green-600 hover:text-green-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('승인 처리되었습니다.');
                          }}
                        >
                          승인
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('반려 처리되었습니다.');
                          }}
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}