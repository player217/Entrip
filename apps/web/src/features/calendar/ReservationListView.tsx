'use client';

import { useEffect, useMemo } from 'react';
import { CalendarMonth, DataGrid, StatusTag, Button } from '@entrip/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { BookingModal } from '@/components/booking/BookingModal';
import { clsx } from 'clsx';
import type { BookingEvent } from '@entrip/shared';
import { Booking as SharedBooking, logger, BookingStatus } from '@entrip/shared';
import { useBookings } from '@/hooks/useBookings';
import { exportToExcel, exportToPDF } from '@/utils/export';
import { apiClient } from '@/lib/api-client';
import { getBookingDate, priceOf, getPaxCount, getCustomerName, getReturnDate } from '@/utils/booking-helpers';
import { useToast } from '@/providers/ToastProvider';
import { format } from 'date-fns';
import { useReservationViewStore } from '@/stores/reservationViewStore';

// Stub components for incomplete features
const WeekView = (_props: { currentDate: Date }) => null;
const WeekViewMobile = (_props: { events: CalendarEvent[]; currentDate: Date }) => null;
const CalendarVirtual = (_props: { currentDate: Date; bookings: Booking[]; onDayClick: (date: Date) => void; onBookingClick: (booking: Booking) => void }) => null;
const BulkActionBar = (_props: { selectedCount: number; onAction: (action: string) => void; onClose: () => void }) => null;

// CalendarEvent type from CalendarWeek component
interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'golf' | 'incentive' | 'honeymoon' | 'airtel' | 'other';
  status: BookingStatus.CONFIRMED | 'pending' | BookingStatus.CANCELLED;
  time?: string;
  details?: string;
}

interface Booking {
  id: string;
  bookingNumber?: string;
  customerName: string;
  teamName?: string;
  date?: string;
  departureDate: string;
  returnDate?: string;
  destination: string;
  nights?: number;
  paxCount?: number;
  totalPax: number;
  revenue: number;
  status: 'pending' | BookingStatus.CONFIRMED | BookingStatus.CANCELLED | 'completed';
  totalPrice?: number;
  coordinator?: string;
  numberOfPeople?: number;
  [key: string]: unknown;
}

interface ReservationListViewProps {
  viewType?: 'calendar-month' | 'calendar-week' | 'list' | 'calendar-virtual';
  currentMonth?: Date;
}

export default function ReservationListView({ 
  viewType = 'calendar-month',
  currentMonth = new Date()
}: ReservationListViewProps) {
  const { addToast } = useToast();
  
  // Use Zustand store for state management
  const {
    activeView,
    currentMonth: storeCurrentMonth,
    selectedDate,
    isModalOpen,
    selectedBookingId,
    selectedIds,
    searchQuery,
    statusFilter,
    setActiveView,
    setCurrentMonth,
    setSelectedDate,
    openModal,
    closeModal,
    setSelectedIds: setStoreSelectedIds,
    toggleSelectedId,
    clearSelection,
    setSearchQuery,
    setStatusFilter
  } = useReservationViewStore();
  
  // Use store's currentMonth or fallback to prop
  const currentDate = storeCurrentMonth || currentMonth;
  
  // Format current month for API call  
  const currentMonthParam = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Sync with external viewType prop
  useEffect(() => {
    if (viewType !== activeView) {
      setActiveView(viewType);
    }
  }, [viewType, activeView, setActiveView]);

  // Initialize current month from prop
  useEffect(() => {
    if (currentMonth && currentMonth !== storeCurrentMonth) {
      setCurrentMonth(currentMonth);
    }
  }, [currentMonth, storeCurrentMonth, setCurrentMonth]);

  // 실제 API에서 데이터 가져오기 - 현재 월 파라미터 포함
  const { bookings, isLoading } = useBookings(currentMonthParam);
  
  // Convert bookings to calendar format
  const calendarBookings = useMemo(() => {
    const bookingsMap: Record<string, BookingEvent[]> = {};
    
    (Array.isArray(bookings) ? bookings : []).forEach((booking: SharedBooking) => {
      const bookingDate = getBookingDate(booking);
      if (bookingDate) {
        const dateStr = format(bookingDate, 'yyyy-MM-dd');
        
        if (!bookingsMap[dateStr]) {
          bookingsMap[dateStr] = [];
        }
        
        bookingsMap[dateStr].push({
          id: booking.id,
          title: getCustomerName(booking) || booking.teamName || 'Unknown',
          type: booking.bookingType?.toLowerCase() || 'other',
          status: booking.status?.toLowerCase() || 'pending',
          date: dateStr, // Required field for BookingEvent
          departureDate: booking.startDate,
          returnDate: booking.endDate,
          destination: booking.destination,
          paxCount: getPaxCount(booking)
        } as BookingEvent);
      }
    });
    
    return bookingsMap;
  }, [bookings]);

  // API 데이터를 리스트 형식으로 변환
  const displayBookings: Booking[] = bookings.map((booking: SharedBooking, index: number) => ({
    id: booking.id || '',
    bookingNumber: `B2025-${String(index + 1).padStart(3, '0')}`,
    customerName: booking.customerName || '',
    teamName: booking.customerName || '',
    date: getBookingDate(booking)?.toISOString() || '',
    departureDate: getBookingDate(booking)?.toISOString() || '',
    returnDate: getReturnDate(booking)?.toISOString() || '',
    destination: booking.destination || '',
    nights: 3, // TODO: Calculate from dates
    paxCount: getPaxCount(booking) || 0,
    revenue: 0, // TODO: Add price field to booking
    status: (booking.status?.toLowerCase() || 'pending') as 'pending' | BookingStatus.CONFIRMED | BookingStatus.CANCELLED | 'completed',
    totalPrice: 0,
    type: '기타',
    origin: '인천',
    startDate: getBookingDate(booking)?.toISOString() || '',
    endDate: getReturnDate(booking)?.toISOString() || '',
    totalPax: getPaxCount(booking) || 0,
    coordinator: '담당자',
  }));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setStoreSelectedIds(displayBookings.map((b: Booking) => b.id));
    } else {
      clearSelection();
    }
  };

  const handleSelectOne = (id: string, _checked: boolean) => {
    toggleSelectedId(id);
  };

  const columns: ColumnDef<Booking>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={displayBookings.length > 0 && selectedIds.length === displayBookings.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.original.id)}
          onChange={(e) => handleSelectOne(row.original.id, e.target.checked)}
          className="rounded"
        />
      ),
      size: 50,
    },
    {
      accessorKey: 'teamName',
      header: '팀명',
      size: 200,
    },
    {
      accessorKey: 'destination',
      header: '목적지',
      size: 100,
    },
    {
      accessorKey: 'startDate',
      header: '출발일',
      size: 120,
    },
    {
      accessorKey: 'endDate',
      header: '도착일',
      size: 120,
    },
    {
      accessorKey: 'status',
      header: '상태',
      size: 100,
      cell: ({ getValue }) => {
        const status = getValue() as BookingStatus | string;
        const statusForTag = status === BookingStatus.CONFIRMED ? 'confirmed' as const :
                            status === BookingStatus.CANCELLED ? 'cancelled' as const :
                            status === BookingStatus.PENDING ? 'pending' as const :
                            status as 'pending' | 'confirmed' | 'cancelled' | 'completed';
        return <StatusTag status={statusForTag} size="sm" className="" />;
      }
    },
    {
      accessorKey: 'totalPax',
      header: '인원',
      size: 80,
    },
    {
      accessorKey: 'coordinator',
      header: '담당자',
      size: 100,
    },
  ];

  const handleBookingEventClick = (event: BookingEvent) => {
    const booking = displayBookings.find(b => b.customerName === event.title);
    if (booking) {
      openModal(booking.id);
    }
  };

  const handleNewBooking = () => {
    openModal();
  };

  // Get selected booking from ID
  const selectedBooking = selectedBookingId ? displayBookings.find(b => b.id === selectedBookingId) || null : null;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">예약 관리</h1>
          <p className="text-gray-600">예약 현황을 캘린더와 리스트로 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleNewBooking}>
            + 새 예약 등록
          </Button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('calendar-month')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeView === 'calendar-month'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            월별 캘린더
          </button>
          <button
            onClick={() => setActiveView('calendar-week')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeView === 'calendar-week'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            주별 캘린더
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeView === 'list'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            리스트 뷰
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {activeView === 'calendar-month' ? (
          <div>
            <CalendarMonth
              month={currentDate}
              bookings={calendarBookings}
              onAddBooking={(_date: Date) => {
                openModal();
              }}
              onBookingClick={handleBookingEventClick}
              onMonthChange={(month: Date) => {
                setCurrentMonth(month);
              }}
              className=""
              monthlySummary={{
                teamCount: Array.isArray(bookings) ? bookings.length : 0,
                paxCount: Array.isArray(bookings) ? bookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0) : 0,
                revenue: Array.isArray(bookings) ? bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0) : 0,
                profit: Array.isArray(bookings) ? Math.round(bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0) * 0.1) : 0
              }}
            />
          </div>
        ) : activeView === 'calendar-week' ? (
          <div className="h-[600px]">
            <WeekView currentDate={currentDate} />
          </div>
        ) : (
          <div>
            <DataGrid
              columns={columns}
              data={displayBookings}
              className=""
            />
          </div>
        )}
      </div>

      {/* 예약 편집 모달 */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        booking={selectedBooking || undefined}
        onSave={closeModal}
      />
    </div>
  );
}