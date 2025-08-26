import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { logger } from '@entrip/shared';

interface AutoTableOptions {
  head: string[][];
  body: (string | number)[][];
  startY: number;
  styles?: {
    font?: string;
    fontSize?: number;
    cellPadding?: number;
    lineColor?: number[];
    lineWidth?: number;
  };
  headStyles?: {
    fillColor?: number[];
    textColor?: number | number[];
    fontStyle?: string;
    halign?: 'left' | 'center' | 'right';
  };
  alternateRowStyles?: {
    fillColor?: number[];
  };
  columnStyles?: Record<number, {
    cellWidth?: number;
    halign?: 'left' | 'center' | 'right';
  }>;
  didDrawPage?: (data: { pageCount: number }) => void;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// 회사 브랜드 색상
const BRAND_COLORS = {
  primary: '#016B9F',
  secondary: '#0084c7',
  light: '#E8F4F8',
  dark: '#014A70'
};

export interface ExportBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  teamName: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  numberOfPeople: number;
  status: string;
  revenue?: number;
  coordinator?: string;
}

export const exportToExcel = (bookings: ExportBooking[], _filename: string = 'bookings') => {
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws_data: (string | number | Date)[][] = [];
  
  // 회사 헤더 (병합 셀)
  ws_data.push(['ENTRIP 예약 목록']);
  ws_data.push([`생성일: ${format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })}`]);
  ws_data.push([]); // 빈 줄
  
  // 테이블 헤더
  const headers = ['번호', '예약번호', '고객명', '팀명', '목적지', '출발일', '도착일', '인원', '상태', '매출', '담당자'];
  ws_data.push(headers);
  
  // 데이터 행
  bookings.forEach((booking, index) => {
    ws_data.push([
      index + 1,
      booking.bookingNumber || `B2025-${String(index + 1).padStart(3, '0')}`,
      booking.customerName,
      booking.teamName || booking.customerName,
      booking.destination,
      format(new Date(booking.departureDate), 'yyyy-MM-dd'),
      format(new Date(booking.returnDate), 'yyyy-MM-dd'),
      booking.numberOfPeople,
      booking.status === 'confirmed' ? '확정' : booking.status === 'cancelled' ? '취소' : '대기중',
      booking.revenue || 0,
      booking.coordinator || '미지정'
    ]);
  });
  
  // 요약 정보
  ws_data.push([]); // 빈 줄
  ws_data.push(['총 예약 건수:', bookings.length + '건']);
  ws_data.push(['총 인원:', bookings.reduce((sum, b) => sum + b.numberOfPeople, 0) + '명']);
  ws_data.push(['총 매출:', bookings.reduce((sum, b) => sum + (b.revenue || 0), 0).toLocaleString() + '원']);
  
  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // 병합 셀 설정
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // 제목 행
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // 날짜 행
  ];
  
  // 스타일 설정
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      
      if (!ws[cell_ref]) continue;
      
      // 헤더 스타일
      if (R === 0) {
        ws[cell_ref].s = {
          font: { bold: true, sz: 16, color: { rgb: "016B9F" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (R === 3) { // 테이블 헤더
        ws[cell_ref].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "016B9F" } },
          alignment: { horizontal: "center" }
        };
      }
    }
  }
  
  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 5 },   // 번호
    { wch: 12 },  // 예약번호
    { wch: 15 },  // 고객명
    { wch: 15 },  // 팀명
    { wch: 15 },  // 목적지
    { wch: 12 },  // 출발일
    { wch: 12 },  // 도착일
    { wch: 8 },   // 인원
    { wch: 10 },  // 상태
    { wch: 15 },  // 매출
    { wch: 10 }   // 담당자
  ];
  
  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(wb, ws, '예약목록');
  
  // 파일 다운로드
  const date = format(new Date(), 'yyyy-MM-dd');
  const exportFilename = `Entrip_Bookings_${date}.xlsx`;
  XLSX.writeFile(wb, exportFilename);
  
  logger.info('[Export]', `XLSX 생성 완료: ${exportFilename}`);
  logger.info('[Export]', '셀 병합: A1:K1 (제목), A2:K2 (날짜)');
  logger.info('[Export]', '브랜드 색상 적용: #016B9F');
};

export const exportToPDF = (bookings: ExportBooking[], _filename: string = 'bookings') => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // 로고/헤더 영역
  doc.setFillColor(parseInt(BRAND_COLORS.primary.slice(1, 3), 16), 
                   parseInt(BRAND_COLORS.primary.slice(3, 5), 16), 
                   parseInt(BRAND_COLORS.primary.slice(5, 7), 16));
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // 회사명
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('ENTRIP', pageWidth / 2, 10, { align: 'center' });
  
  // 제목
  doc.setFontSize(14);
  doc.text('Travel Booking Report', pageWidth / 2, 18, { align: 'center' });
  
  // 날짜 정보
  const date = format(new Date(), 'yyyy년 MM월 dd일', { locale: ko });
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`생성일: ${date}`, 14, 35);
  
  // 테이블 데이터 준비
  const tableData = bookings.map((booking, index) => [
    index + 1,
    booking.bookingNumber || `B2025-${String(index + 1).padStart(3, '0')}`,
    booking.customerName,
    booking.destination,
    format(new Date(booking.departureDate), 'yyyy-MM-dd'),
    format(new Date(booking.returnDate), 'yyyy-MM-dd'),
    booking.numberOfPeople,
    booking.status === 'confirmed' ? '확정' : booking.status === 'cancelled' ? '취소' : '대기중',
    booking.revenue ? `${booking.revenue.toLocaleString()}원` : '-'
  ]);

  // 테이블 생성
  doc.autoTable({
    head: [['#', '예약번호', '고객명', '목적지', '출발일', '도착일', '인원', '상태', '매출']],
    body: tableData,
    startY: 40,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
      lineColor: [232, 244, 248],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [1, 107, 159], // Entrip brand color
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 252, 254],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },  // #
      1: { cellWidth: 30 },  // 예약번호
      2: { cellWidth: 40 },  // 고객명
      3: { cellWidth: 40 },  // 목적지
      4: { cellWidth: 30, halign: 'center' },  // 출발일
      5: { cellWidth: 30, halign: 'center' },  // 도착일
      6: { cellWidth: 20, halign: 'center' },  // 인원
      7: { cellWidth: 25, halign: 'center' },  // 상태
      8: { cellWidth: 35, halign: 'right' },  // 매출
    },
    didDrawPage: function(data: { pageCount: number }) {
      // 푸터 추가
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Entrip Travel Management System', pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Page ${data.pageCount}`, pageWidth - 20, pageHeight - 10);
    }
  });

  // 요약 정보 박스
  const finalY = doc.lastAutoTable.finalY || 40;
  const summaryY = finalY + 15;
  
  // 요약 박스 배경
  doc.setFillColor(248, 252, 254);
  doc.rect(14, summaryY - 5, 100, 35, 'F');
  
  // 요약 정보
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 16, summaryY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Bookings: ${bookings.length}`, 16, summaryY + 8);
  
  const totalPeople = bookings.reduce((sum, booking) => sum + booking.numberOfPeople, 0);
  doc.text(`Total Guests: ${totalPeople}`, 16, summaryY + 16);
  
  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.revenue || 0), 0);
  doc.text(`Total Revenue: ${totalRevenue.toLocaleString()} KRW`, 16, summaryY + 24);

  // PDF 다운로드
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const exportFilename = `Entrip_Bookings_${dateStr}.pdf`;
  doc.save(exportFilename);
  
  logger.info('[Export]', `PDF 생성 완료: ${exportFilename}`);
  logger.info('[Export]', '로고 헤더 및 푸터 추가');
  logger.info('[Export]', `브랜드 색상 적용: ${BRAND_COLORS.primary}`);
};