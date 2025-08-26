import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const router: ExpressRouter = Router();

// 운영 통계 조회
router.get('/stats/overview', authenticate, async (req: AuthRequest, res) => {
  try {
    // 현재 월의 시작과 끝
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 지난 6개월 데이터 조회
    const monthlyStats = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
      
      // 해당 월의 예약 통계
      const bookings = await prisma.booking.findMany({
        where: {
          startDate: {
            gte: monthStart,
            lte: monthEnd
          },
          status: 'CONFIRMED',
          companyCode: req.user!.companyCode  // 회사별 필터링
        },
        include: {
          user: true
        }
      });
      
      const totalRevenue = bookings.reduce((sum, booking) => 
        sum + Number(booking.totalPrice), 0
      );
      
      const totalCost = bookings.reduce((sum, booking) => 
        sum + Number(booking.totalPrice) * 0.75, 0 // 가정: 원가율 75%
      );
      
      const profit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
      
      monthlyStats.push({
        month: targetDate.toLocaleDateString('ko-KR', { month: 'long' }),
        revenue: totalRevenue,
        profit: profit,
        margin: Math.round(margin * 10) / 10,
        count: bookings.length,
        paxCount: bookings.reduce((sum, booking) => sum + booking.paxCount, 0)
      });
    }
    
    // 담당자별 통계
    // User 모델에는 companyCode가 없으므로 bookings를 통해 필터링
    const bookingsWithUsers = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        companyCode: req.user!.companyCode,  // 회사별 필터링
        startDate: {
          gte: new Date(currentYear, 0, 1), // 올해 시작
          lte: new Date(currentYear, 11, 31, 23, 59, 59) // 올해 끝
        }
      },
      include: {
        user: true
      }
    });
    
    // 사용자별로 그룹화
    const userBookingsMap = new Map<string, any[]>();
    bookingsWithUsers.forEach(booking => {
      const userId = booking.createdBy;
      if (!userBookingsMap.has(userId)) {
        userBookingsMap.set(userId, []);
      }
      userBookingsMap.get(userId)!.push(booking);
    });
    
    // 각 사용자에 대한 통계 생성
    const managerStats = Array.from(userBookingsMap.entries()).map(([userId, bookings]) => {
      const user = bookings[0]?.user;
      return {
        user,
        bookings
      };
    }).filter(stat => stat.user?.role === 'MANAGER');
    
    const managerData = managerStats.map(manager => {
      const revenue = manager.bookings.reduce((sum, booking) => 
        sum + Number(booking.totalPrice), 0
      );
      const cost = revenue * 0.75; // 가정: 원가율 75%
      const profit = revenue - cost;
      
      return {
        name: manager.name,
        revenue,
        profit,
        count: manager.bookings.length,
        paxCount: manager.bookings.reduce((sum, booking) => sum + booking.paxCount, 0)
      };
    }).sort((a, b) => b.revenue - a.revenue);
    
    // 전체 통계
    const totalStats = {
      totalCount: managerData.reduce((sum, manager) => sum + manager.count, 0),
      totalRevenue: managerData.reduce((sum, manager) => sum + manager.revenue, 0),
      totalProfit: managerData.reduce((sum, manager) => sum + manager.profit, 0),
      totalPax: managerData.reduce((sum, manager) => sum + manager.paxCount, 0)
    };
    
    const avgMargin = totalStats.totalRevenue > 0 ? 
      (totalStats.totalProfit / totalStats.totalRevenue * 100) : 0;
    
    res.json({
      monthlyStats,
      managerData,
      totalStats: {
        ...totalStats,
        avgMargin: Math.round(avgMargin * 10) / 10
      }
    });
    
  } catch (error) {
    console.error('Stats overview error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 기간별 통계 조회
router.get('/stats/period/:period', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period } = req.params as { period: 'month' | 'quarter' | 'year' };
    const now = new Date();
    
    let dateRanges: { start: Date; end: Date; label: string }[] = [];
    
    if (period === 'month') {
      // 지난 12개월
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        dateRanges.push({
          start,
          end,
          label: date.toLocaleDateString('ko-KR', { month: 'long' })
        });
      }
    } else if (period === 'quarter') {
      // 지난 4분기
      for (let i = 3; i >= 0; i--) {
        const quarterStart = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
        const start = new Date(quarterStart.getFullYear(), quarterStart.getMonth(), 1);
        const end = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0, 23, 59, 59);
        dateRanges.push({
          start,
          end,
          label: `${Math.floor(quarterStart.getMonth() / 3) + 1}분기`
        });
      }
    } else {
      // 지난 3년
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        dateRanges.push({
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31, 23, 59, 59),
          label: `${year}년`
        });
      }
    }
    
    const periodStats = [];
    
    for (const range of dateRanges) {
      const bookings = await prisma.booking.findMany({
        where: {
          startDate: {
            gte: range.start,
            lte: range.end
          },
          status: 'CONFIRMED',
          companyCode: req.user!.companyCode  // 회사별 필터링
        }
      });
      
      const revenue = bookings.reduce((sum, booking) => 
        sum + Number(booking.totalPrice), 0
      );
      const cost = revenue * 0.75;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue * 100) : 0;
      
      periodStats.push({
        label: range.label,
        revenue,
        profit,
        margin: Math.round(margin * 10) / 10,
        count: bookings.length,
        paxCount: bookings.reduce((sum, booking) => sum + booking.paxCount, 0)
      });
    }
    
    res.json(periodStats);
    
  } catch (error) {
    console.error('Stats period error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;