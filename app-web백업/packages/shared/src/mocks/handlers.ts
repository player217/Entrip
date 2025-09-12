import { rest } from 'msw'

export const handlers = [
  // Dashboard API - 전체 대시보드 데이터
  rest.get('/api/dashboard', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        stats: {
          todayBookings: 12,
          activeProjects: 24,
          pendingApprovals: 3,
          unreadMessages: 5,
          monthlyRevenue: 85000000,
          monthlyProfit: 12000000,
        },
        todayTasks: [
          { id: '1', title: '김철수팀 항공권 예약', priority: 'high', dueTime: '14:00' },
          { id: '2', title: '이영희팀 호텔 확정', priority: 'medium', dueTime: '16:00' },
          { id: '3', title: '박민수팀 비자 서류 제출', priority: 'high', dueTime: '17:00' }
        ],
        recentNotifications: [
          { id: '1', message: '새로운 예약 요청이 있습니다', time: '10분 전' },
          { id: '2', message: '결재 승인이 완료되었습니다', time: '30분 전' },
          { id: '3', message: '환율이 업데이트되었습니다', time: '1시간 전' }
        ]
      })
    )
  }),

  // Dashboard stats
  rest.get('/api/dashboard/stats', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        todayBookings: 12,
        activeProjects: 24,
        pendingApprovals: 3,
        unreadMessages: 5,
        monthlyRevenue: 85000000,
        monthlyProfit: 12000000,
      })
    )
  }),

  // Exchange rates - /fx 엔드포인트 추가
  rest.get('/api/fx', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        rates: [
          { currency: 'USD', rate: 1320.50, change: 0.5 },
          { currency: 'EUR', rate: 1440.30, change: -0.2 },
          { currency: 'JPY', rate: 8.95, change: 0.1 },
          { currency: 'CNY', rate: 183.20, change: 0.0 }
        ],
        updatedAt: new Date().toISOString()
      })
    )
  }),

  // Exchange rates - 기존 엔드포인트 유지
  rest.get('/api/exchange/current', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        rates: [
          { currency: 'JPY', symbol: '¥', rate: 1098.23, change: 0.5 },
          { currency: 'EUR', symbol: '€', rate: 1421.56, change: -0.3 },
          { currency: 'USD', symbol: '$', rate: 1334.80, change: 0.2 },
          { currency: 'CNY', symbol: '¥', rate: 185.42, change: -0.1 },
        ],
      })
    )
  }),

  // Bookings
  rest.get('/api/bookings', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        bookings: [
          {
            id: '1',
            teamName: '김철수팀',
            type: 'golf',
            origin: '서울',
            destination: '발리',
            departDate: '2024-06-20',
            returnDate: '2024-06-25',
            status: 'confirmed',
            managerId: 'manager1',
            revenue: 25000000,
            profit: 5000000,
          },
          {
            id: '2',
            teamName: '이영희팀',
            type: 'incentive',
            origin: '서울',
            destination: '태국',
            departDate: '2024-06-22',
            returnDate: '2024-06-26',
            status: 'pending',
            managerId: 'manager2',
            revenue: 30000000,
            profit: 6000000,
          },
        ],
        total: 2,
      })
    )
  }),

  // Auth
  rest.post('/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json()
    
    if (email === 'test@entrip.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          user: {
            id: '1',
            name: '테스트 사용자',
            email: 'test@entrip.com',
            role: 'admin',
          },
          accessToken: 'mock-access-token',
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    )
  }),

  // Stats - 운영 현황
  rest.get('/api/stats', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        monthlyStats: [
          { month: '2024-01', revenue: 120000000, profit: 18000000, bookings: 45 },
          { month: '2024-02', revenue: 135000000, profit: 20250000, bookings: 52 },
          { month: '2024-03', revenue: 150000000, profit: 22500000, bookings: 58 },
          { month: '2024-04', revenue: 142000000, profit: 21300000, bookings: 55 },
          { month: '2024-05', revenue: 165000000, profit: 24750000, bookings: 63 },
          { month: '2024-06', revenue: 85000000, profit: 12750000, bookings: 32 }
        ],
        managerStats: [
          { managerId: 'manager1', name: '김철수', bookings: 24, revenue: 250000000, profit: 37500000 },
          { managerId: 'manager2', name: '이영희', bookings: 18, revenue: 180000000, profit: 27000000 },
          { managerId: 'manager3', name: '박민수', bookings: 15, revenue: 150000000, profit: 22500000 }
        ]
      })
    )
  }),

  // Reservations - 예약 목록
  rest.get('/api/reservations', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        reservations: [
          {
            id: '1',
            teamName: '김철수팀',
            type: 'golf',
            origin: '서울',
            destination: '발리',
            departDate: '2024-06-20',
            returnDate: '2024-06-25',
            status: 'confirmed',
            managerId: 'manager1',
            revenue: 25000000,
            profit: 5000000,
            customerCount: 12,
            paymentStatus: 'partial'
          },
          {
            id: '2',
            teamName: '이영희팀',
            type: 'incentive',
            origin: '서울',
            destination: '태국',
            departDate: '2024-06-22',
            returnDate: '2024-06-26',
            status: 'pending',
            managerId: 'manager2',
            revenue: 30000000,
            profit: 6000000,
            customerCount: 20,
            paymentStatus: 'pending'
          }
        ],
        total: 2
      })
    )
  }),
]