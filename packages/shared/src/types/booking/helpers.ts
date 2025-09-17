import { BookingDTO, BookingStatus } from './dto';

/**
 * Booking 헬퍼 함수들
 * 클래스 대신 Plain Object와 함께 사용하는 유틸리티 함수
 */

// UI 표시용 타입 코드
export type BookingTypeCode = 'GF' | 'IN' | 'HM' | 'AT';

// UI용 BookingEvent 타입
export interface BookingEvent {
  id: string;
  typeCode: BookingTypeCode;
  name: string;
  customerName: string;
  teamName?: string;
  destination?: string;
  status: BookingStatus;
  manager: string;
  paxCount: number;
  date: string;
  departureDate?: string;
  returnDate?: string;
  revenue: number;
  totalPrice: number;
  cost: number;
}

/**
 * Booking 비즈니스 로직 헬퍼 함수들
 */
export const BookingHelpers = {
  /**
   * 예약 취소 가능 여부 확인
   */
  canCancel(booking: BookingDTO): boolean {
    return booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
  },

  /**
   * 예약 수정 가능 여부 확인
   */
  canEdit(booking: BookingDTO): boolean {
    return booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  },

  /**
   * 여행 기간 계산 (일수)
   */
  getDuration(booking: BookingDTO): number {
    if (!booking.endDate) return 1;
    
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays || 1;
  },

  /**
   * 목적지 기반 타입 코드 추론
   */
  getTypeCode(booking: BookingDTO): BookingTypeCode {
    const destination = booking.destination || '';
    
    // 골프 여행
    if (destination.includes('골프') || destination.includes('Golf') || destination.includes('CC')) {
      return 'GF';
    }
    
    // 신혼여행
    if (destination.includes('신혼') || destination.includes('허니문') || destination.includes('Honeymoon')) {
      return 'HM';
    }
    
    // 해외여행 (주요 국가들)
    const internationalDestinations = [
      '일본', '중국', '태국', '베트남', '싱가포르', '홍콩', '대만',
      '필리핀', '말레이시아', '인도네시아', '미국', '유럽', '호주'
    ];
    
    if (internationalDestinations.some(country => destination.includes(country))) {
      return 'IN';
    }
    
    // 기타 (국내 등)
    return 'AT';
  },

  /**
   * 원가 계산 (임시 로직 - 실제로는 백엔드에서 계산해야 함)
   */
  calculateCost(booking: BookingDTO): number {
    // 임시: 총 금액의 70% + 랜덤 변동
    const baseRate = 0.7;
    const variance = 0.15;
    const randomFactor = Math.random() * variance;
    
    return Math.floor(booking.totalPrice * (baseRate + randomFactor));
  },

  /**
   * BookingDTO를 UI용 BookingEvent로 변환
   */
  toBookingEvent(booking: BookingDTO): BookingEvent {
    return {
      id: booking.id,
      typeCode: this.getTypeCode(booking),
      name: booking.teamName || booking.customerName,
      customerName: booking.customerName,
      teamName: booking.teamName,
      destination: booking.destination || undefined,
      status: booking.status,
      manager: booking.manager || '미정',
      paxCount: booking.paxCount || 1,
      date: booking.startDate,
      departureDate: booking.startDate,
      returnDate: booking.endDate || undefined,
      revenue: booking.totalPrice,
      totalPrice: booking.totalPrice,
      cost: this.calculateCost(booking),
    };
  },

  /**
   * 여러 BookingDTO를 BookingEvent 배열로 변환
   */
  toBookingEvents(bookings: BookingDTO[]): BookingEvent[] {
    return bookings.map(booking => this.toBookingEvent(booking));
  },

  /**
   * 두 Booking이 같은지 비교 (id와 version으로)
   */
  areEqual(a: BookingDTO, b: BookingDTO): boolean {
    return a.id === b.id && a.version === b.version;
  },

  /**
   * 상태별 필터링
   */
  filterByStatus(bookings: BookingDTO[], status: BookingStatus): BookingDTO[] {
    return bookings.filter(booking => booking.status === status);
  },

  /**
   * 날짜 범위 필터링
   */
  filterByDateRange(bookings: BookingDTO[], startDate: string, endDate: string): BookingDTO[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.startDate);
      return bookingDate >= start && bookingDate <= end;
    });
  },

  /**
   * 회사 코드별 필터링
   */
  filterByCompany(bookings: BookingDTO[], companyCode: string): BookingDTO[] {
    return bookings.filter(booking => booking.companyCode === companyCode);
  },

  /**
   * 매니저별 그룹화
   */
  groupByManager(bookings: BookingDTO[]): Record<string, BookingDTO[]> {
    return bookings.reduce((groups, booking) => {
      const manager = booking.manager || '미정';
      if (!groups[manager]) {
        groups[manager] = [];
      }
      groups[manager].push(booking);
      return groups;
    }, {} as Record<string, BookingDTO[]>);
  },

  /**
   * 월별 그룹화
   */
  groupByMonth(bookings: BookingDTO[]): Record<string, BookingDTO[]> {
    return bookings.reduce((groups, booking) => {
      const date = new Date(booking.startDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(booking);
      return groups;
    }, {} as Record<string, BookingDTO[]>);
  },

  /**
   * 통계 정보 계산
   */
  calculateStats(bookings: BookingDTO[]): {
    totalCount: number;
    totalRevenue: number;
    totalPax: number;
    averagePrice: number;
    statusCounts: Record<BookingStatus, number>;
  } {
    const stats = {
      totalCount: bookings.length,
      totalRevenue: 0,
      totalPax: 0,
      averagePrice: 0,
      statusCounts: {
        PENDING: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
        COMPLETED: 0,
      } as Record<BookingStatus, number>,
    };

    bookings.forEach(booking => {
      stats.totalRevenue += booking.totalPrice;
      stats.totalPax += booking.paxCount || 1;
      stats.statusCounts[booking.status]++;
    });

    stats.averagePrice = stats.totalCount > 0 
      ? Math.round(stats.totalRevenue / stats.totalCount) 
      : 0;

    return stats;
  }
};