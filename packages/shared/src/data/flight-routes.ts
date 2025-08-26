export interface FlightSchedule {
  airline: string;
  flightNo: string;
  departureTime: string;
  arrivalTime: string;
  days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
}

export interface Route {
  departure: string;
  arrival: string;
  flights: FlightSchedule[];
}

// 샘플 데이터 - 실제로는 API나 데이터베이스에서 가져와야 함
export const SAMPLE_ROUTES: Route[] = [
  // 김해공항(PUS) 출발
  {
    departure: 'PUS',
    arrival: 'KIX',
    flights: [
      {
        airline: '티웨이항공',
        flightNo: 'TW301',
        departureTime: '08:00',
        arrivalTime: '09:50',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '진에어',
        flightNo: 'LJ241',
        departureTime: '08:10',
        arrivalTime: '10:00',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'PUS',
    arrival: 'NRT',
    flights: [
      {
        airline: '에어부산',
        flightNo: 'BX164',
        departureTime: '07:35',
        arrivalTime: '10:05',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '이스타항공',
        flightNo: 'ZE605',
        departureTime: '07:05',
        arrivalTime: '09:50',
        days: { mon: false, tue: true, wed: false, thu: true, fri: false, sat: true, sun: false }
      }
    ]
  },
  {
    departure: 'PUS',
    arrival: 'TPE',
    flights: [
      {
        airline: '에바항공',
        flightNo: 'BR169',
        departureTime: '12:00',
        arrivalTime: '13:35',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  // 인천공항(ICN) 출발
  {
    departure: 'ICN',
    arrival: 'NRT',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE703',
        departureTime: '09:25',
        arrivalTime: '11:45',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '아시아나항공',
        flightNo: 'OZ102',
        departureTime: '09:00',
        arrivalTime: '11:20',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'ICN',
    arrival: 'KIX',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE721',
        departureTime: '09:35',
        arrivalTime: '11:20',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '아시아나항공',
        flightNo: 'OZ112',
        departureTime: '07:55',
        arrivalTime: '09:40',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '진에어',
        flightNo: 'LJ231',
        departureTime: '07:40',
        arrivalTime: '09:30',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'ICN',
    arrival: 'PVG',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE893',
        departureTime: '08:25',
        arrivalTime: '09:40',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '중국동방항공',
        flightNo: 'MU5052',
        departureTime: '08:55',
        arrivalTime: '10:10',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'ICN',
    arrival: 'BKK',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE651',
        departureTime: '18:05',
        arrivalTime: '21:45',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '아시아나항공',
        flightNo: 'OZ741',
        departureTime: '19:30',
        arrivalTime: '23:10',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '타이항공',
        flightNo: 'TG657',
        departureTime: '10:20',
        arrivalTime: '14:10',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  // 김포공항(GMP) 출발
  {
    departure: 'GMP',
    arrival: 'CJU',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE1201',
        departureTime: '07:00',
        arrivalTime: '08:10',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '아시아나항공',
        flightNo: 'OZ8901',
        departureTime: '07:05',
        arrivalTime: '08:15',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '제주항공',
        flightNo: '7C101',
        departureTime: '06:50',
        arrivalTime: '08:00',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'GMP',
    arrival: 'KIX',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE2741',
        departureTime: '08:30',
        arrivalTime: '10:20',
        days: { mon: true, tue: false, wed: true, thu: false, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'GMP',
    arrival: 'SHA',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE2811',
        departureTime: '09:10',
        arrivalTime: '10:50',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '중국동방항공',
        flightNo: 'MU5042',
        departureTime: '12:55',
        arrivalTime: '14:10',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }
      }
    ]
  },
  // 제주공항(CJU) 출발
  {
    departure: 'CJU',
    arrival: 'GMP',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE1202',
        departureTime: '08:50',
        arrivalTime: '10:00',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '아시아나항공',
        flightNo: 'OZ8902',
        departureTime: '08:55',
        arrivalTime: '10:05',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  },
  {
    departure: 'CJU',
    arrival: 'PUS',
    flights: [
      {
        airline: '대한항공',
        flightNo: 'KE1503',
        departureTime: '10:30',
        arrivalTime: '11:20',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      },
      {
        airline: '에어부산',
        flightNo: 'BX8801',
        departureTime: '11:15',
        arrivalTime: '12:05',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
      }
    ]
  }
];

// 출발 공항에서 갈 수 있는 도착지 목록 가져오기
export async function getDestinationsByDeparture(departureCode: string): Promise<string[]> {
  try {
    // API URL 설정
    const apiUrl = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:8001';
    const response = await fetch(`${apiUrl}/api/schedule/${departureCode}`);
    
    if (!response.ok) {
      // API 실패시 샘플 데이터로 폴백
      const destinations = new Set<string>();
      SAMPLE_ROUTES.forEach(route => {
        if (route.departure === departureCode) {
          destinations.add(route.arrival);
        }
      });
      return Array.from(destinations);
    }
    
    const data = await response.json();
    const destinations = new Set<string>();
    
    // API 응답에서 도착지 추출
    if (data.flights && Array.isArray(data.flights)) {
      data.flights.forEach((flight: any) => {
        if (flight.destination && flight.destination !== 'Unknown') {
          destinations.add(flight.destination);
        }
      });
    }
    
    return Array.from(destinations).sort();
  } catch (error) {
    console.error('Failed to fetch destinations from API:', error);
    // API 에러시 샘플 데이터로 폴백
    const destinations = new Set<string>();
    SAMPLE_ROUTES.forEach(route => {
      if (route.departure === departureCode) {
        destinations.add(route.arrival);
      }
    });
    return Array.from(destinations);
  }
}

// 특정 노선의 항공편 스케줄 가져오기
export function getFlightsByRoute(departureCode: string, arrivalCode: string): FlightSchedule[] {
  const route = SAMPLE_ROUTES.find(
    r => r.departure === departureCode && r.arrival === arrivalCode
  );
  return route ? route.flights : [];
}