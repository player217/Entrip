import React from 'react';
import { BookingType, BookingStatus, type BookingFilters } from '@entrip/shared';

interface BookingFiltersProps {
  filters: BookingFilters;
  onFiltersChange: (filters: Partial<BookingFilters>) => void;
  onReset: () => void;
}

const typeLabels: Record<BookingType, string> = {
  [BookingType.PACKAGE]: '패키지',
  [BookingType.FIT]: '자유여행',
  [BookingType.GROUP]: '단체',
  [BookingType.BUSINESS]: '비즈니스',
};

const statusLabels: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: '대기중',
  [BookingStatus.CONFIRMED]: '확정',
  [BookingStatus.CANCELLED]: '취소',
};

export function BookingFilters({ filters, onFiltersChange, onReset }: BookingFiltersProps) {
  const handleKeywordChange = (keyword: string) => {
    onFiltersChange({ keyword: keyword || undefined });
  };

  const handleClientChange = (client: string) => {
    onFiltersChange({ client: client || undefined });
  };

  const handleTypeChange = (type: string) => {
    onFiltersChange({ type: type ? (type as BookingType) : undefined });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ status: status ? (status as BookingStatus) : undefined });
  };

  const handleDateFromChange = (dateFrom: string) => {
    onFiltersChange({ dateFrom: dateFrom || undefined });
  };

  const handleDateToChange = (dateTo: string) => {
    onFiltersChange({ dateTo: dateTo || undefined });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">필터</h3>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          초기화
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 통합 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            통합 검색
          </label>
          <input
            type="text"
            placeholder="예약번호, 팀명, 고객명, 목적지"
            value={filters.keyword || ''}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 고객명 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            고객명
          </label>
          <input
            type="text"
            placeholder="고객명으로 검색"
            value={filters.client || ''}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 예약 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            예약 유형
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체 유형</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 예약 상태 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            예약 상태
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체 상태</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 출발일 시작 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            출발일 (시작)
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 출발일 종료 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            출발일 (종료)
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 활성 필터 표시 */}
      {(filters.keyword || filters.client || filters.type || filters.status || filters.dateFrom || filters.dateTo) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">활성 필터:</span>
            {filters.keyword && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                검색: {filters.keyword}
                <button
                  onClick={() => handleKeywordChange('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.client && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                고객: {filters.client}
                <button
                  onClick={() => handleClientChange('')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.type && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                유형: {typeLabels[filters.type]}
                <button
                  onClick={() => handleTypeChange('')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                상태: {statusLabels[filters.status]}
                <button
                  onClick={() => handleStatusChange('')}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}