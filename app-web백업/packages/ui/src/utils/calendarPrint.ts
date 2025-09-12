import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export interface CalendarPrintOptions {
  preserveColors: boolean;
  includesSummary: boolean;
  pageOrientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'Letter';
}

export interface MonthlySummary {
  teamCount: number;
  paxCount: number;
  revenue: number;
  profit: number;
}

/**
 * 캘린더를 출력 가능한 형태로 변환
 */
export async function createPrintableCalendar(
  element: Element,
  options: CalendarPrintOptions,
  viewType: 'monthly' | 'weekly' = 'monthly'
): Promise<string> {
  // 1. DOM 복제
  const clonedElement = element.cloneNode(true) as HTMLElement;
  
  // 2. 불필요한 요소 제거
  removePrintExcludedElements(clonedElement);
  
  // 3. 스타일 추출 및 인라인화
  await inlineAllStyles(clonedElement);
  
  // 4. BookingItem 스타일 보존
  preserveBookingItemStyles(clonedElement);
  
  // 5. 레이아웃 최적화
  optimizePrintLayout(clonedElement, options, viewType);
  
  // 6. 합계 추가
  if (options.includesSummary) {
    if (viewType === 'weekly') {
      appendWeeklySummary(clonedElement);
    } else {
      appendMonthlySummary(clonedElement);
    }
  }
  
  // 7. HTML 문자열 생성
  return generatePrintHTML(clonedElement, options);
}

/**
 * 출력에서 제외할 요소들 제거
 */
function removePrintExcludedElements(element: HTMLElement): void {
  const excludeSelectors = [
    '.no-print',
    'button',
    '.calendar-add-btn',
    '.event-tooltip',
    '[role="tooltip"]',
    '.modal',
    '.dropdown',
    'header',
    'nav',
    'aside'
  ];
  
  excludeSelectors.forEach(selector => {
    element.querySelectorAll(selector).forEach(el => el.remove());
  });
}

/**
 * 모든 스타일을 인라인으로 변환
 */
async function inlineAllStyles(element: HTMLElement): Promise<void> {
  const allElements = element.querySelectorAll('*');
  
  allElements.forEach((el: Element) => {
    if (el instanceof HTMLElement) {
      const computedStyles = window.getComputedStyle(el);
      const importantStyles = [
        'background-color',
        'color',
        'border',
        'border-left',
        'border-radius',
        'padding',
        'margin',
        'font-size',
        'font-weight',
        'display',
        'position',
        'width',
        'height',
        'text-align',
        'overflow',
        'white-space',
        'text-overflow'
      ];
      
      importantStyles.forEach(prop => {
        const value = computedStyles.getPropertyValue(prop);
        if (value && value !== 'initial' && value !== 'inherit' && value !== 'none') {
          el.style.setProperty(prop, value, 'important');
        }
      });
    }
  });
}

/**
 * BookingItem 컴포넌트 스타일 보존
 */
function preserveBookingItemStyles(element: HTMLElement): void {
  const bookingItems = element.querySelectorAll('.event-item, .event-pending, .event-confirmed, .event-cancelled');
  
  bookingItems.forEach((item: Element) => {
    if (item instanceof HTMLElement) {
      // 상태별 색상 강제 적용
      if (item.classList.contains('event-pending') || item.textContent?.includes('⏳')) {
        item.style.setProperty('background-color', '#FEF3C7', 'important');
        item.style.setProperty('color', '#92400E', 'important');
        item.style.setProperty('border-left', '3px solid #92400E', 'important');
      } else if (item.classList.contains('event-confirmed') || item.textContent?.includes('✓')) {
        item.style.setProperty('background-color', '#D1FAE5', 'important');
        item.style.setProperty('color', '#065F46', 'important');
        item.style.setProperty('border-left', '3px solid #065F46', 'important');
      } else if (item.classList.contains('event-cancelled') || item.textContent?.includes('✗')) {
        item.style.setProperty('background-color', '#FEE2E2', 'important');
        item.style.setProperty('color', '#991B1B', 'important');
        item.style.setProperty('border-left', '3px solid #991B1B', 'important');
      }
      
      // 기본 스타일 보장
      item.style.setProperty('font-size', '9pt', 'important');
      item.style.setProperty('padding', '2px 4px', 'important');
      item.style.setProperty('margin', '2px 0', 'important');
      item.style.setProperty('border-radius', '3px', 'important');
      item.style.setProperty('display', 'flex', 'important');
      item.style.setProperty('align-items', 'center', 'important');
      item.style.setProperty('gap', '4px', 'important');
    }
  });
}

/**
 * 출력용 레이아웃 최적화
 */
function optimizePrintLayout(element: HTMLElement, options: CalendarPrintOptions, viewType: 'monthly' | 'weekly' = 'monthly'): void {
  // 캘린더 그리드 최적화
  const calendarGrid = element.querySelector('.calendar-grid, .grid-cols-7');
  if (calendarGrid instanceof HTMLElement) {
    calendarGrid.style.setProperty('display', 'grid', 'important');
    calendarGrid.style.setProperty('grid-template-columns', 'repeat(7, 1fr)', 'important');
    calendarGrid.style.setProperty('width', '100%', 'important');
  }
  
  // 날짜 셀 높이 조정
  const calendarDays = element.querySelectorAll('.calendar-day, .calendar-day-cell');
  const minHeight = viewType === 'weekly' 
    ? '150px' // 주간 캘린더는 더 높게
    : (options.pageOrientation === 'landscape' ? '90px' : '110px');
  
  calendarDays.forEach(day => {
    if (day instanceof HTMLElement) {
      day.style.setProperty('min-height', minHeight, 'important');
      day.style.setProperty('vertical-align', 'top', 'important');
      day.style.setProperty('position', 'relative', 'important');
      day.style.setProperty('page-break-inside', 'avoid', 'important');
    }
  });
  
  // 오늘 날짜 강조
  const todayCell = element.querySelector('.today');
  if (todayCell instanceof HTMLElement) {
    todayCell.style.setProperty('background-color', 'rgba(255, 113, 46, 0.07)', 'important');
    todayCell.style.setProperty('box-shadow', 'inset 0 0 0 2px #FF712E', 'important');
  }
}

/**
 * 주간 합계 추가
 */
function appendWeeklySummary(element: HTMLElement): void {
  const summaryData = extractMonthlySummary(element); // 동일한 구조 사용
  
  const summaryHTML = `
    <div class="weekly-summary-print" style="
      margin-top: 20px !important;
      padding: 15px !important;
      background-color: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      border-radius: 4px !important;
      page-break-inside: avoid !important;
    ">
      <h3 style="
        font-size: 12pt !important;
        font-weight: bold !important;
        margin-bottom: 10px !important;
        color: #333 !important;
      ">주간 합계</h3>
      <div style="
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 15px !important;
        text-align: center !important;
      ">
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 팀</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${summaryData.teamCount}팀</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 인원</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${summaryData.paxCount.toLocaleString()}명</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 매출</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${formatCurrency(summaryData.revenue)}</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 수익</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${formatCurrency(summaryData.profit)}</div>
        </div>
      </div>
    </div>
  `;
  
  const summaryElement = document.createElement('div');
  summaryElement.innerHTML = summaryHTML;
  element.appendChild(summaryElement.firstElementChild!);
}

/**
 * 월간 합계 추가
 */
function appendMonthlySummary(element: HTMLElement): void {
  const summaryData = extractMonthlySummary(element);
  
  const summaryHTML = `
    <div class="monthly-summary-print" style="
      margin-top: 20px !important;
      padding: 15px !important;
      background-color: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      border-radius: 4px !important;
      page-break-inside: avoid !important;
    ">
      <h3 style="
        font-size: 12pt !important;
        font-weight: bold !important;
        margin-bottom: 10px !important;
        color: #333 !important;
      ">월간 합계</h3>
      <div style="
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 15px !important;
        text-align: center !important;
      ">
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 팀</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${summaryData.teamCount}팀</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 인원</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${summaryData.paxCount.toLocaleString()}명</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 매출</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${formatCurrency(summaryData.revenue)}</div>
        </div>
        <div style="padding: 8px !important; background: white !important; border-radius: 3px !important; border: 1px solid #e0e0e0 !important;">
          <div style="font-size: 9pt !important; color: #666 !important; margin-bottom: 4px !important;">총 수익</div>
          <div style="font-size: 14pt !important; font-weight: bold !important; color: #333 !important;">${formatCurrency(summaryData.profit)}</div>
        </div>
      </div>
    </div>
  `;
  
  const summaryElement = document.createElement('div');
  summaryElement.innerHTML = summaryHTML;
  element.appendChild(summaryElement.firstElementChild!);
}

/**
 * 월간 합계 데이터 추출
 */
function extractMonthlySummary(element: HTMLElement): MonthlySummary {
  // data 속성에서 추출
  const summaryAttr = element.getAttribute('data-print-summary');
  if (summaryAttr) {
    try {
      return JSON.parse(summaryAttr);
    } catch (e) {
      console.error('Failed to parse summary data:', e);
    }
  }
  
  // DOM에서 직접 계산
  const bookingItems = element.querySelectorAll('.event-item');
  let teamCount = 0;
  let confirmedCount = 0;
  
  bookingItems.forEach(item => {
    if (!item.classList.contains('event-cancelled')) {
      teamCount++;
      if (item.classList.contains('event-confirmed')) {
        confirmedCount++;
      }
    }
  });
  
  // 기본값 반환
  return {
    teamCount,
    paxCount: teamCount * 10, // 임시 계산
    revenue: teamCount * 5000000, // 임시 계산
    profit: teamCount * 1500000 // 임시 계산
  };
}

/**
 * 금액 포맷팅
 */
function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  } else if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}천만`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return amount.toLocaleString() + '원';
}

/**
 * 출력용 HTML 생성
 */
export function generatePrintHTML(
  calendarElement: HTMLElement,
  options: CalendarPrintOptions
): string {
  const title = calendarElement.getAttribute('data-print-title') || 
                format(new Date(), 'yyyy년 M월', { locale: ko }) + ' 캘린더';
  const orientation = options.pageOrientation;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 출력</title>
  <style>
    /* 기본 설정 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* 페이지 설정 */
    @page {
      size: ${options.paperSize} ${orientation};
      margin: 10mm;
    }
    
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      background: white;
      color: #333;
    }
    
    /* 출력 컨테이너 */
    .print-container {
      width: 100%;
      padding: 10px;
    }
    
    /* 제목 영역 */
    .print-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .print-header h1 {
      font-size: 20pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    
    .print-header .subtitle {
      font-size: 10pt;
      color: #666;
    }
    
    /* 캘린더 영역 */
    .calendar-wrapper {
      width: 100%;
      margin-bottom: 20px;
    }
    
    /* 상태별 색상 유지 */
    .event-pending {
      background-color: #FEF3C7 !important;
      color: #92400E !important;
      border-left: 3px solid #92400E !important;
    }
    
    .event-confirmed {
      background-color: #D1FAE5 !important;
      color: #065F46 !important;
      border-left: 3px solid #065F46 !important;
    }
    
    .event-cancelled {
      background-color: #FEE2E2 !important;
      color: #991B1B !important;
      border-left: 3px solid #991B1B !important;
    }
    
    /* 페이지 나눔 방지 */
    .calendar-grid,
    .monthly-summary-print {
      page-break-inside: avoid !important;
    }
    
    /* 출력 시 숨김 */
    @media print {
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="print-header">
      <h1>${title}</h1>
      <div class="subtitle">출력일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })}</div>
    </div>
    
    <div class="calendar-wrapper">
      ${calendarElement.outerHTML}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 출력 창 생성
 */
export function createPrintWindow(content: string, options: CalendarPrintOptions): Window {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }
  
  printWindow.document.write(content);
  printWindow.document.close();
  
  return printWindow;
}

/**
 * 스타일 로드 대기
 */
export async function waitForStyles(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    printWindow.onload = () => {
      // 추가 렌더링 시간 제공
      setTimeout(resolve, 500);
    };
    
    // 타임아웃 설정
    setTimeout(resolve, 2000);
  });
}