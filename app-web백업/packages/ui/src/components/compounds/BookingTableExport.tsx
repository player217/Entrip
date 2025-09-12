'use client';

import React, { useState } from 'react';
import { Icon } from '../primitives/Icon';
import { BookingEntry } from '@entrip/shared';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  createPrintableCalendar, 
  createPrintWindow, 
  waitForStyles,
  type CalendarPrintOptions
} from '../../utils/calendarPrint';

interface BookingTableExportProps {
  bookings: BookingEntry[];
  title: string;
  onExport?: (type: 'excel' | 'pdf' | 'print') => void;
  viewType?: 'list' | 'calendar';
  calendarContent?: React.ReactNode;
  monthlySummary?: {
    teamCount: number;
    paxCount: number;
    revenue: number;
    profit: number;
  };
}

export const BookingTableExport: React.FC<BookingTableExportProps> = ({
  bookings,
  title,
  onExport,
  viewType = 'list',
  calendarContent,
  monthlySummary
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (type: 'excel' | 'pdf' | 'print') => {
    if (type === 'print') {
      if (viewType === 'calendar') {
        // 새로운 캘린더 출력 로직
        try {
          const calendarElement = document.querySelector('.calendar-month');
          if (!calendarElement) {
            console.error('Calendar element not found');
            window.print(); // 폴백으로 기본 출력
            return;
          }

          // 월간 합계 데이터 설정
          if (monthlySummary) {
            calendarElement.setAttribute('data-print-summary', JSON.stringify(monthlySummary));
          }
          calendarElement.setAttribute('data-print-title', title);

          // 출력 옵션 설정
          const printOptions: CalendarPrintOptions = {
            preserveColors: true,
            includesSummary: true,
            pageOrientation: 'landscape',
            paperSize: 'A4'
          };

          // 출력용 HTML 생성
          const printContent = await createPrintableCalendar(calendarElement, printOptions);
          
          // 출력 창 열기
          const printWindow = createPrintWindow(printContent, printOptions);
          
          // 스타일 로드 대기
          await waitForStyles(printWindow);
          
          // 출력 실행
          setTimeout(() => {
            printWindow.print();
            // 출력 후 창 닫기
            setTimeout(() => {
              printWindow.close();
            }, 100);
          }, 500);
          
        } catch (error) {
          console.error('Calendar print failed:', error);
          // 폴백: 기존 출력 방식 사용
          handleLegacyCalendarPrint();
        }
      } else {
        // 리스트 뷰 출력 (기존 로직 유지)
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const printContent = generatePrintContent();
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      // Excel, PDF 내보내기는 실제 구현 필요
      alert(`${type.toUpperCase()} 내보내기 기능을 구현해야 합니다.`);
    }
    
    onExport?.(type);
    setIsOpen(false);
  };

  // 기존 캘린더 출력 로직 (폴백용)
  const handleLegacyCalendarPrint = () => {
    const styleId = 'calendar-print-styles';
    let printStyles = document.getElementById(styleId);
        
        if (!printStyles) {
          printStyles = document.createElement('style');
          printStyles.id = styleId;
          printStyles.innerHTML = `
            @media print {
              /* 기본 설정 */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              /* 모든 요소 숨기기 */
              body > *:not(.calendar-print-wrapper) {
                display: none !important;
              }
              
              /* 캘린더 wrapper 표시 */
              .calendar-print-wrapper {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                z-index: 999999 !important;
                font-family: 'Malgun Gothic', '맑은 고딕', sans-serif !important;
              }
              
              /* 헤더, 사이드바, 네비게이션 숨기기 */
              header, nav, aside, .sidebar, .header, .navigation,
              .no-print, button, .btn, .modal {
                display: none !important;
              }
              
              /* 제목 스타일 */
              .print-title {
                text-align: center !important;
                font-size: 16pt !important;
                font-weight: bold !important;
                margin: 15px 0 !important;
                display: block !important;
                color: #000 !important;
              }
              
              /* 테이블 기반 캘린더 레이아웃 */
              .calendar-print-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                margin: 0 auto !important;
                page-break-inside: avoid !important;
              }
              
              /* 요일 헤더 */
              .calendar-print-table thead th {
                width: 14.28% !important;
                padding: 8px 4px !important;
                text-align: center !important;
                font-size: 11pt !important;
                font-weight: bold !important;
                border: 1px solid #333 !important;
                background-color: #f5f5f5 !important;
              }
              
              /* 날짜 셀 */
              .calendar-print-table tbody td {
                width: 14.28% !important;
                height: 90px !important;
                padding: 4px !important;
                border: 1px solid #666 !important;
                vertical-align: top !important;
                background: white !important;
                position: relative !important;
                overflow: hidden !important;
              }
              
              /* 날짜 번호 */
              .calendar-print-date {
                font-size: 10pt !important;
                font-weight: bold !important;
                margin-bottom: 2px !important;
                color: #000 !important;
              }
              
              /* 주말 색상 */
              .calendar-print-sunday { color: #d00 !important; }
              .calendar-print-saturday { color: #00d !important; }
              
              /* 이벤트 스타일 */
              .calendar-print-event {
                font-size: 7pt !important;
                line-height: 1.2 !important;
                padding: 1px 2px !important;
                margin: 1px 0 !important;
                background-color: #f0f0f0 !important;
                border: 0.5px solid #ccc !important;
                border-radius: 2px !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
              }
              
              /* 주간 캘린더 조정 */
              .calendar-week-print tbody td {
                height: 400px !important;
              }
              
              .calendar-week-print .calendar-print-event {
                white-space: normal !important;
                font-size: 8pt !important;
                padding: 2px 4px !important;
              }
              
              /* 페이지 설정 */
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
          `;
          document.head.appendChild(printStyles);
        }
        
        // 캘린더 컴포넌트 찾기
        const calendarElement = document.querySelector('.calendar-month, .calendar-week');
        if (calendarElement) {
          // 기존 print wrapper가 있으면 제거
          const existingWrapper = document.querySelector('.calendar-print-wrapper');
          if (existingWrapper) {
            existingWrapper.remove();
          }
          
          const wrapper = document.createElement('div');
          wrapper.className = 'calendar-print-wrapper';
          wrapper.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 999999; opacity: 0;';
          
          // 제목 추가
          const titleDiv = document.createElement('div');
          titleDiv.className = 'print-title';
          titleDiv.textContent = title;
          wrapper.appendChild(titleDiv);
          
          // 테이블 기반 캘린더 생성
          const isWeekView = calendarElement.classList.contains('calendar-week');
          const table = document.createElement('table');
          table.className = isWeekView ? 'calendar-print-table calendar-week-print' : 'calendar-print-table';
          
          // 테이블 헤더 (요일)
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
          weekDays.forEach((day, index) => {
            const th = document.createElement('th');
            th.textContent = day;
            if (index === 0) th.className = 'calendar-print-sunday';
            if (index === 6) th.className = 'calendar-print-saturday';
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);
          
          // 테이블 바디 (날짜와 이벤트)
          const tbody = document.createElement('tbody');
          const calendarDays = calendarElement.querySelectorAll('.calendar-day');
          
          // 월별 뷰는 여러 행, 주별 뷰는 한 행
          const rows = [];
          let currentRow = document.createElement('tr');
          
          calendarDays.forEach((dayElement, index) => {
            const td = document.createElement('td');
            
            // 날짜 추출
            const dateElement = dayElement.querySelector('time');
            if (dateElement) {
              const dateDiv = document.createElement('div');
              dateDiv.className = 'calendar-print-date';
              const dayNum = parseInt(dateElement.textContent || '0');
              dateDiv.textContent = dayNum.toString();
              
              // 주말 색상 적용
              const dayIndex = index % 7;
              if (dayIndex === 0) dateDiv.classList.add('calendar-print-sunday');
              if (dayIndex === 6) dateDiv.classList.add('calendar-print-saturday');
              
              td.appendChild(dateDiv);
            }
            
            // 이벤트 추출
            const events = dayElement.querySelectorAll('.calendar-event');
            events.forEach(eventElement => {
              const eventDiv = document.createElement('div');
              eventDiv.className = 'calendar-print-event';
              
              // BookingItem 내용 추출
              const bookingItem = eventElement.querySelector('[class*="BookingItem"], [class*="booking"]');
              if (bookingItem) {
                const textContent = bookingItem.textContent || '';
                // 긴 텍스트는 줄여서 표시
                eventDiv.textContent = textContent.length > 30 ? textContent.substring(0, 27) + '...' : textContent;
              } else {
                eventDiv.textContent = eventElement.textContent || '';
              }
              
              td.appendChild(eventDiv);
            });
            
            currentRow.appendChild(td);
            
            // 7개씩 행 구분 (월별 뷰)
            if ((index + 1) % 7 === 0) {
              rows.push(currentRow);
              currentRow = document.createElement('tr');
            }
          });
          
          // 마지막 행 추가
          if (currentRow.children.length > 0) {
            // 빈 셀 채우기
            while (currentRow.children.length < 7) {
              currentRow.appendChild(document.createElement('td'));
            }
            rows.push(currentRow);
          }
          
          rows.forEach(row => tbody.appendChild(row));
          table.appendChild(tbody);
          wrapper.appendChild(table);
          
          document.body.appendChild(wrapper);
          
          // 렌더링 대기 후 출력
          setTimeout(() => {
            wrapper.style.opacity = '1';
            window.print();
            
            // 정리
            setTimeout(() => {
              if (wrapper && wrapper.parentNode) {
                document.body.removeChild(wrapper);
              }
            }, 100);
          }, 200);
        } else {
          // 캘린더 요소를 찾을 수 없는 경우 기본 출력
          window.print();
        }
  };

  const generatePrintContent = () => {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const totalPax = confirmedBookings.reduce((sum, b) => sum + (b.paxCount || 0), 0);
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.revenue || 0), 0);
    const totalProfit = confirmedBookings.reduce((sum, b) => sum + ((b.revenue || 0) - (b.cost || 0)), 0);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title} - 예약 현황표</title>
        <style>
            @page {
                size: A4;
                margin: 14mm;
            }
            body {
                font-family: 'Noto Sans KR', sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                margin: 0;
                padding: 0;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
            }
            .header h1 {
                margin: 0;
                font-size: 18pt;
                font-weight: bold;
            }
            .header .date {
                margin-top: 5px;
                font-size: 10pt;
                color: #666;
            }
            .summary {
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                background-color: #f8f9fa;
                padding: 8px;
                border-radius: 4px;
            }
            .summary-item {
                text-align: center;
            }
            .summary-item .label {
                font-size: 8pt;
                color: #666;
                margin-bottom: 2px;
            }
            .summary-item .value {
                font-size: 11pt;
                font-weight: bold;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 9pt;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 6px;
                text-align: left;
                vertical-align: top;
            }
            th {
                background-color: #f8f9fa;
                font-weight: bold;
                text-align: center;
            }
            .status-confirmed { color: #059669; font-weight: bold; }
            .status-pending { color: #d97706; font-weight: bold; }
            .status-cancelled { color: #dc2626; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 8pt;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${title}</h1>
            <div class="date">출력일: ${format(new Date(), 'yyyy년 M월 d일', { locale: ko })}</div>
        </div>
        
        <div class="summary">
            <div class="summary-item">
                <div class="label">총 예약</div>
                <div class="value">${totalBookings}건</div>
            </div>
            <div class="summary-item">
                <div class="label">확정 예약</div>
                <div class="value">${confirmedBookings.length}건</div>
            </div>
            <div class="summary-item">
                <div class="label">총 인원</div>
                <div class="value">${totalPax.toLocaleString()}명</div>
            </div>
            <div class="summary-item">
                <div class="label">총 매출</div>
                <div class="value">${totalRevenue.toLocaleString()}원</div>
            </div>
            <div class="summary-item">
                <div class="label">총 수익</div>
                <div class="value">${totalProfit.toLocaleString()}원</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th width="8%">날짜</th>
                    <th width="20%">상품명</th>
                    <th width="8%">예약번호</th>
                    <th width="6%">상태</th>
                    <th width="10%">담당자</th>
                    <th width="6%">인원</th>
                    <th width="12%">매출액</th>
                    <th width="12%">원가</th>
                    <th width="12%">수익</th>
                    <th width="6%">수익률</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => {
                  const revenue = booking.revenue || 0;
                  const cost = booking.cost || 0;
                  const profit = revenue - cost;
                  const profitRate = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
                  
                  return `
                    <tr>
                        <td class="text-center">${format(new Date(booking.date), 'M/d', { locale: ko })}</td>
                        <td>${booking.name || ''}</td>
                        <td class="text-center">${booking.code || ''}</td>
                        <td class="text-center status-${booking.status?.toLowerCase() || 'pending'}">
                            ${booking.status === 'CONFIRMED' ? '확정' : 
                              booking.status === 'PENDING' ? '대기' : 
                              booking.status === 'CANCELLED' ? '취소' : '미정'}
                        </td>
                        <td class="text-center">${booking.manager || ''}</td>
                        <td class="text-center">${(booking.paxCount || 0).toLocaleString()}명</td>
                        <td class="text-right">${revenue.toLocaleString()}원</td>
                        <td class="text-right">${cost.toLocaleString()}원</td>
                        <td class="text-right">${profit.toLocaleString()}원</td>
                        <td class="text-center">${profitRate}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            Entrip 여행사 통합 관리 시스템 | ${format(new Date(), 'yyyy-MM-dd HH:mm')}
        </div>
    </body>
    </html>
    `;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Icon icon="ph:printer" className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">출력</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700"
      >
        <Icon icon="ph:printer" className="w-4 h-4" />
        <span className="text-sm font-medium">출력</span>
        <Icon icon="ph:caret-down" className="w-3 h-3" />
      </button>
      
      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
        <button
          onClick={() => handleExport('print')}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <Icon icon="ph:printer" className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">바로 출력</span>
        </button>
        
        <button
          onClick={() => handleExport('pdf')}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <Icon icon="ph:file-pdf" className="w-4 h-4 text-red-500" />
          <span className="text-sm text-gray-700">PDF로 저장</span>
        </button>
        
        <button
          onClick={() => handleExport('excel')}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-b-lg"
        >
          <Icon icon="ph:microsoft-excel-logo" className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-700">Excel로 저장</span>
        </button>
      </div>
    </div>
  );
};