import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as bookingService from '../services/booking.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BookingStatus, BookingType } from '@entrip/shared';

const router: ExpressRouter = Router();

// Export bookings
router.post('/bookings/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { format = 'xlsx' } = req.query;
    const { ids } = req.body;
    
    // 선택된 예약들만 내보내기 또는 전체
    const query = ids ? { ids } : {};
    const bookingsResult = await bookingService.listBookings(query);
    const bookings = bookingsResult.data;
    
    if (format === 'xlsx') {
      // Generate Excel file
      const worksheetData = [
        // Headers
        ['예약번호', '고객명', '팀명', '여행지', '예약유형', '시작일', '종료일', '인원수', '숙박일수', '상태', '총금액', '통화', '생성일'],
        // Data rows
        ...bookings.map(booking => [
          booking.bookingNumber,
          booking.customerName || booking.client,
          booking.teamName,
          booking.destination,
          translateType(booking.bookingType),
          new Date(booking.startDate).toLocaleDateString('ko-KR'),
          new Date(booking.endDate).toLocaleDateString('ko-KR'),
          booking.paxCount,
          booking.nights,
          translateStatus(booking.status),
          formatCurrency(Number(booking.totalPrice || booking.price)),
          booking.currency,
          new Date(booking.createdAt).toLocaleDateString('ko-KR')
        ])
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '예약목록');
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // 예약번호
        { wch: 15 }, // 고객명
        { wch: 20 }, // 팀명
        { wch: 20 }, // 여행지
        { wch: 12 }, // 예약유형
        { wch: 12 }, // 시작일
        { wch: 12 }, // 종료일
        { wch: 10 }, // 인원수
        { wch: 10 }, // 숙박일수
        { wch: 10 }, // 상태
        { wch: 15 }, // 총금액
        { wch: 8 },  // 통화
        { wch: 12 }, // 생성일
      ];
      
      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Entrip_Bookings_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx"`);
      res.send(buffer);
      
      console.log(`[Export] POST /api/bookings/export?format=xlsx → 200 (${bookings.length} bookings)`);
      
    } else if (format === 'pdf') {
      // Generate PDF file
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Add title
      doc.setFontSize(18);
      doc.text('Entrip 예약 목록', 14, 20);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`생성일: ${new Date().toLocaleString('ko-KR')}`, 14, 30);
      
      // Prepare table data
      const headers = ['예약번호', '고객명', '팀명', '여행지', '예약유형', '시작일', '종료일', '인원수', '상태'];
      const data = bookings.map(booking => [
        booking.bookingNumber,
        booking.customerName || booking.client,
        booking.teamName,
        booking.destination,
        translateType(booking.bookingType),
        new Date(booking.startDate).toLocaleDateString('ko-KR'),
        new Date(booking.endDate).toLocaleDateString('ko-KR'),
        booking.paxCount.toString(),
        translateStatus(booking.status)
      ]);
      
      // Add table
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 40,
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [1, 107, 159], // Entrip brand color
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
      
      // Add summary
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(10);
      doc.text(`총 ${bookings.length}건의 예약`, 14, finalY + 10);
      
      // Generate buffer
      const buffer = doc.output('arraybuffer');
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Entrip_Bookings_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf"`);
      res.send(Buffer.from(buffer));
      
      console.log(`[Export] POST /api/bookings/export?format=pdf → 200 (${bookings.length} bookings)`);
      
    } else {
      res.status(400).json({ error: 'Invalid format. Use xlsx or pdf' });
    }
  } catch (error: any) {
    console.error('[Export] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    [BookingStatus.PENDING]: '대기중',
    [BookingStatus.CONFIRMED]: '확정',
    [BookingStatus.CANCELLED]: '취소',
    'pending': '대기중',
    'confirmed': '확정',
    'done': '완료',
    'cancelled': '취소'
  };
  return statusMap[status] || status;
}

function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    [BookingType.PACKAGE]: '패키지',
    [BookingType.FIT]: 'FIT',
    [BookingType.GROUP]: '단체',
    [BookingType.BUSINESS]: '비즈니스',
    'incentive': '인센티브',
    'golf': '골프',
    'honeymoon': '허니문',
    'airtel': '에어텔'
  };
  return typeMap[type] || type;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
}

export default router;