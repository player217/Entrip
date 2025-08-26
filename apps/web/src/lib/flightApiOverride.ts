/**
 * 임시 항공편 API 클라이언트 - 포트 8003 사용
 */

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
}

class FlightAPIOverride {
  private baseUrl: string = 'http://localhost:8002';

  async getSchedule(airportCode: string): Promise<ScheduleResponse> {
    const response = await fetch(`${this.baseUrl}/api/schedule/${airportCode}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }
    return response.json();
  }

  async getAirports(): Promise<{ airports: any[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/api/airports`);
    if (!response.ok) {
      throw new Error(`Failed to fetch airports: ${response.statusText}`);
    }
    return response.json();
  }
}

export const flightAPIOverride = new FlightAPIOverride();