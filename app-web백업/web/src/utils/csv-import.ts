import { parse } from 'csv-parse/browser/esm';

export interface CSVBooking {
  customerName: string;
  phoneNumber: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  numberOfPeople: number;
  status?: string;
}

export const parseCSV = async (file: File): Promise<CSVBooking[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const bookings: CSVBooking[] = [];
      
      try {
        // CSV 파싱
        const parser = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        
        parser.on('readable', function() {
          let record;
          while ((record = parser.read()) !== null) {
            bookings.push({
              customerName: record['고객명'] || record['customerName'] || '',
              phoneNumber: record['전화번호'] || record['phoneNumber'] || '',
              destination: record['목적지'] || record['destination'] || '',
              departureDate: record['출발일'] || record['departureDate'] || '',
              returnDate: record['도착일'] || record['returnDate'] || '',
              numberOfPeople: parseInt(record['인원'] || record['numberOfPeople'] || '1'),
              status: record['상태'] || record['status'] || 'pending',
            });
          }
        });
        
        parser.on('error', (err) => {
          reject(err);
        });
        
        parser.on('end', () => {
          resolve(bookings);
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
};

// CSV 파일 유효성 검사
export const validateCSVBooking = (booking: CSVBooking): string[] => {
  const errors: string[] = [];
  
  if (!booking.customerName) errors.push('고객명이 없습니다');
  if (!booking.phoneNumber) errors.push('전화번호가 없습니다');
  if (!booking.destination) errors.push('목적지가 없습니다');
  if (!booking.departureDate) errors.push('출발일이 없습니다');
  if (!booking.returnDate) errors.push('도착일이 없습니다');
  if (!booking.numberOfPeople || booking.numberOfPeople < 1) errors.push('인원수가 올바르지 않습니다');
  
  // 날짜 형식 검증
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (booking.departureDate && !dateRegex.test(booking.departureDate)) {
    errors.push('출발일 형식이 올바르지 않습니다 (YYYY-MM-DD)');
  }
  if (booking.returnDate && !dateRegex.test(booking.returnDate)) {
    errors.push('도착일 형식이 올바르지 않습니다 (YYYY-MM-DD)');
  }
  
  return errors;
};

// 샘플 CSV 템플릿 다운로드
export const downloadCSVTemplate = () => {
  const headers = ['고객명', '전화번호', '목적지', '출발일', '도착일', '인원', '상태'];
  const sampleData = [
    ['홍길동', '010-1234-5678', '제주도', '2025-08-01', '2025-08-05', '2', 'pending'],
    ['김철수', '010-2345-6789', '부산', '2025-08-10', '2025-08-12', '4', 'confirmed'],
  ];
  
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'entrip_booking_template.csv';
  link.click();
};