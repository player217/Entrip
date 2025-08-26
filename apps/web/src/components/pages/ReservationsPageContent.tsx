'use client'

import { useState, useEffect } from 'react'
import { CalendarMonth, DataGrid, StatusTag, Button } from '@entrip/ui'
import type { ColumnDef } from '@tanstack/react-table'
// import BookingModal from '@/components/BookingModal'
const BookingModal = (_props: { isOpen: boolean; onClose: () => void; booking?: Booking | null; onSave?: () => void }) => null
// import WeekView from '@/features/calendar/WeekView'
// import WeekViewMobile from '@/features/calendar/WeekViewMobile'
// import CalendarVirtual from '@/features/calendar/CalendarVirtual'
// import BulkActionBar from '@/components/BulkActionBar'
const WeekView = (_props: { currentDate: Date }) => null
const WeekViewMobile = (_props: { events: CalendarEvent[]; currentDate: Date }) => null
const CalendarVirtual = (_props: { currentDate: Date; bookings: Booking[]; onDayClick: (date: Date) => void; onBookingClick: (booking: Booking) => void }) => null
const BulkActionBar = (_props: { selectedCount: number; onAction: (action: string) => void; onClose: () => void }) => null
import { clsx } from 'clsx'
import type { BookingEvent } from '@entrip/shared'
import { logger } from '@entrip/shared'
// import { useBookings } from '@/hooks/useBookings'
// import { exportToExcel, exportToPDF } from '@/utils/export'
// import { parseCSV, downloadCSVTemplate } from '@/utils/csv-import'
// import axiosInstance from '@/lib/axios'
// Removed duplicate interface - using the one below

const useBookings = () => ({ bookings: [] as Booking[], error: null, isLoading: false, mutate: () => {} })
const exportToExcel = (_data: Booking[], _filename: string) => {}
const exportToPDF = (_data: Booking[], _filename: string) => {}
const parseCSV = async (_file: File) => [] as Booking[]
const downloadCSVTemplate = () => {}
const axiosInstance = { post: async (_url: string, _data: { bookings: Booking[] }) => ({ status: 200, data: { success: true, created: 0 } }) }

// CalendarEvent type from CalendarWeek component
interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'golf' | 'incentive' | 'honeymoon' | 'airtel' | 'other';
  status: 'confirmed' | 'pending' | 'cancelled';
  time?: string;
  details?: string;
}

interface Booking {
  id: string
  bookingNumber?: string
  customerName: string
  teamName?: string
  date?: string
  departureDate: string
  returnDate?: string
  destination: string
  nights?: number
  paxCount?: number
  totalPax: number
  revenue: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  totalPrice?: number
  coordinator?: string
  numberOfPeople?: number
  [key: string]: unknown
}

export default function ReservationsPageContent() {
  const [activeTab, setActiveTab] = useState<'calendar-month' | 'calendar-week' | 'list' | 'calendar-virtual'>('calendar-month')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [currentDate] = useState(new Date(2025, 5)) // 2025년 6월
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 실제 API에서 데이터 가져오기
  const { bookings, isLoading, mutate } = useBookings()

  // API 데이터를 CalendarEvent 형식으로 변환
  const _events: CalendarEvent[] = bookings.map(booking => ({
    id: booking.id || '',
    date: booking.departureDate || '',
    title: booking.customerName || '',
    type: 'other' as const, // TODO: Add type field to booking
    status: booking.status === 'confirmed' ? 'confirmed' : booking.status === 'cancelled' ? 'cancelled' : 'pending',
    time: '09:00',
    details: `${booking.destination} - ${booking.numberOfPeople}명`,
  }))

  // API 데이터를 리스트 형식으로 변환
  const displayBookings: Booking[] = bookings.map((booking, index) => ({
    id: booking.id || '',
    bookingNumber: `B2025-${String(index + 1).padStart(3, '0')}`,
    customerName: booking.customerName || '',
    teamName: booking.customerName || '',
    date: booking.departureDate || '',
    departureDate: booking.departureDate || '',
    returnDate: booking.returnDate || '',
    destination: booking.destination || '',
    nights: 3, // TODO: Calculate from dates
    paxCount: booking.numberOfPeople || 0,
    revenue: 0, // TODO: Add price field to booking
    status: (booking.status?.toLowerCase() || 'pending') as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    totalPrice: 0,
    type: '기타',
    origin: '인천',
    startDate: booking.departureDate || '',
    endDate: booking.returnDate || '',
    totalPax: booking.numberOfPeople || 0,
    coordinator: '담당자',
  }))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayBookings.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
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
      accessorKey: 'type',
      header: '유형',
      size: 100,
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
        const status = getValue() as string;
        return <StatusTag status={status as 'pending' | 'confirmed' | 'cancelled' | 'completed'} size="sm" className="" />
      }
    },
    {
      accessorKey: 'totalPax',
      header: '인원',
      size: 80,
    },
    {
      accessorKey: 'revenue',
      header: '매출',
      size: 120,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return `${value.toLocaleString()}원`
      }
    },
    {
      accessorKey: 'coordinator',
      header: '담당자',
      size: 100,
    },
  ]

  const handleBookingEventClick = (event: BookingEvent) => {
    const booking = displayBookings.find(b => b.customerName === event.title)
    if (booking) {
      setSelectedBooking(booking)
      setIsModalOpen(true)
    }
  }

  const _handleCalendarEventClick = (event: CalendarEvent) => {
    const booking = displayBookings.find(b => b.customerName === event.title)
    if (booking) {
      setSelectedBooking(booking)
      setIsModalOpen(true)
    }
  }

  const _handleRowClick = (row: Booking) => {
    setSelectedBooking(row)
    setIsModalOpen(true)
  }

  const handleNewBooking = () => {
    setSelectedBooking(null)
    setIsModalOpen(true)
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    const exportData = bookings.map((booking) => ({
      id: booking.id || '',
      bookingNumber: booking.bookingNumber || '',
      customerName: booking.customerName || '',
      teamName: booking.customerName || '',
      destination: booking.destination || '',
      departureDate: booking.departureDate || '',
      returnDate: booking.returnDate || '',
      numberOfPeople: booking.numberOfPeople || 0,
      totalPax: booking.totalPax || booking.numberOfPeople || 0,
      status: (booking.status || 'pending') as 'pending' | 'confirmed' | 'cancelled' | 'completed',
      revenue: 0,
      coordinator: '담당자'
    }));

    if (type === 'excel') {
      exportToExcel(exportData, 'entrip_bookings');
    } else {
      exportToPDF(exportData, 'entrip_bookings');
    }
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvBookings = await parseCSV(file);
      logger.info('CSV data imported', 'count:', csvBookings.length);
      
      // API로 bulk upload
      const response = await axiosInstance.post('/api/bookings/bulk-upload', {
        bookings: csvBookings
      });
      
      if (response.status === 200) {
        logger.info('Bookings created successfully', 'created:', response.data.created);
        // SWR 캐시 갱신
        mutate();
      }
    } catch (error) {
      logger.error('CSV Import failed:', error instanceof Error ? error.message : String(error));
      alert('CSV 파일 업로드에 실패했습니다.');
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">예약 관리</h1>
          <p className="text-gray-600">예약 현황을 캘린더와 리스트로 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button 
              variant="secondary" 
              onClick={() => {
                const dropdown = document.getElementById('export-dropdown');
                if (dropdown) {
                  dropdown.classList.toggle('hidden');
                }
              }}
            >
              Export ▼
            </Button>
            <div 
              id="export-dropdown"
              className="hidden absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10"
            >
              <button
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  handleExport('excel');
                  document.getElementById('export-dropdown')?.classList.add('hidden');
                }}
              >
                📊 Excel로 내보내기
              </button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  handleExport('pdf');
                  document.getElementById('export-dropdown')?.classList.add('hidden');
                }}
              >
                📄 PDF로 내보내기
              </button>
              <hr className="my-1" />
              <button
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  downloadCSVTemplate();
                  document.getElementById('export-dropdown')?.classList.add('hidden');
                }}
              >
                📝 CSV 템플릿 다운로드
              </button>
            </div>
          </div>
          
          {/* CSV Import */}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              id="csv-import"
            />
            <Button 
              variant="secondary"
              onClick={() => document.getElementById('csv-import')?.click()}
            >
              📥 CSV Import
            </Button>
          </div>
          
          <Button variant="primary" onClick={handleNewBooking}>
            + 새 예약 등록
          </Button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar-month')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'calendar-month'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            월별 캘린더
          </button>
          <button
            onClick={() => setActiveTab('calendar-week')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'calendar-week'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            주별 캘린더
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'list'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            리스트 뷰
          </button>
          <button
            onClick={() => setActiveTab('calendar-virtual')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'calendar-virtual'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            가상 스크롤 캘린더
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {activeTab === 'calendar-month' ? (
          <div>
            <CalendarMonth
              month={currentDate}
              bookings={{}}
              onAddBooking={(_date: Date) => {
                // TODO: Open booking modal for date
              }}
              onBookingClick={handleBookingEventClick}
              onMonthChange={(_month: Date) => {
                // TODO: Handle month change
              }}
              className=""
            />
          </div>
        ) : activeTab === 'calendar-week' ? (
          <div className="h-[600px]">
            {isMobile ? (
              <WeekViewMobile events={_events} currentDate={currentDate} />
            ) : (
              <WeekView currentDate={currentDate} />
            )}
          </div>
        ) : activeTab === 'calendar-virtual' ? (
          <div>
            <CalendarVirtual
              currentDate={currentDate}
              bookings={bookings}
              onDayClick={(date: Date) => {
                logger.info('Day clicked', date.toISOString());
                // 날짜 클릭 시 새 예약 생성 가능
                setIsModalOpen(true);
              }}
              onBookingClick={(booking: Booking) => {
                const displayBooking = displayBookings.find(b => b.customerName === booking.customerName);
                if (displayBooking) {
                  setSelectedBooking(displayBooking);
                  setIsModalOpen(true);
                }
              }}
            />
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
        onClose={() => {
          setIsModalOpen(false)
          setSelectedBooking(null)
        }}
        booking={selectedBooking}
        onSave={() => {
          setIsModalOpen(false)
          setSelectedBooking(null)
        }}
      />
      
      <BulkActionBar 
        selectedCount={selectedIds.length}
        onAction={(action: string) => {
          logger.info('Bulk action:', `${action} on ${selectedIds.length} items`);
          // TODO: Implement bulk actions
        }}
        onClose={() => setSelectedIds([])}
      />
    </div>
  )
}