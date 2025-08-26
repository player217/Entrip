/**
 * 항공편 크롤링 API 클라이언트
 */

const CRAWLER_API_URL = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:8001';

// 개발 환경에서 환경변수가 없을 경우 에러 대신 기본값 사용
if (!process.env.NEXT_PUBLIC_CRAWLER_API_URL) {
  console.warn('[flightApi.ts] NEXT_PUBLIC_CRAWLER_API_URL is not set, using default: http://localhost:8001');
}

console.log('[flightApi.ts] CRAWLER_API_URL:', CRAWLER_API_URL);

export interface FlightSchedule {
  airline: string;
  flightNo: string;
  destination: string;
  departureTime: string;
  arrivalTime?: string;
  status?: string;
  days?: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
}

export interface ScheduleResponse {
  airport: string;
  crawledAt: string;
  totalFlights?: number;
  flights: FlightSchedule[];
  method?: string;
  page_title?: string;
  page_accessible?: boolean;
}

export interface LiveFlight {
  airline: string;
  flightNo: string;
  destination: string;
  scheduledTime: string;
  estimatedTime: string;
  status: string;
}

export interface LiveStatusResponse {
  airport: string;
  crawledAt: string;
  departures: LiveFlight[];
  arrivals: LiveFlight[];
}

export interface CrawlStatus {
  status: string;
  crawl_status: {
    last_schedule_crawl: string | null;
    last_live_crawl: string | null;
    last_schedule_status: string;
    last_live_status: string;
    failed_airports: string[];
  };
  timestamp: string;
}

class FlightAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CRAWLER_API_URL;
  }

  /**
   * 공항 스케줄 조회
   */
  async getSchedule(airportCode: string): Promise<ScheduleResponse> {
    const response = await fetch(`${this.baseUrl}/api/schedule/${airportCode}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 실시간 출도착 현황 조회
   */
  async getLiveStatus(airportCode: string): Promise<LiveStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/live/${airportCode}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch live status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 지원 공항 목록 조회
   */
  async getAirports(): Promise<{ airports: string[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/api/airports`);
    if (!response.ok) {
      throw new Error(`Failed to fetch airports: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 크롤링 상태 확인
   */
  async getHealth(): Promise<CrawlStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Failed to fetch health: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 스케줄 크롤링 수동 트리거
   */
  async triggerScheduleCrawl(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/crawl/schedule`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger schedule crawl: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 실시간 크롤링 수동 트리거
   */
  async triggerLiveCrawl(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/crawl/live`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger live crawl: ${response.statusText}`);
    }
    return response.json();
  }
}

export const flightAPI = new FlightAPI();