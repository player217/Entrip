'use client';

import { useState, useEffect } from 'react';
// import useSWR from 'swr';
// import { fetcher } from '../lib/fetcher';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import AirlineLogo from './AirlineLogo';
import { logger } from '@entrip/shared';

interface Flight {
  flightNo: string;
  airline: string;
  departure: string;
  arrival: string;
  scheduledDep: string;
  scheduledArr: string;
  avgDelay?: number;
  status?: string;
  aircraft?: string;
  via?: string;
}

interface FlightStatus {
  flightNo: string;
  status: string;
  actualDep?: string;
  actualArr?: string;
  gate?: string;
  delay?: number;
}

interface FlightTableProps {
  flights: Flight[];
  selectedAirport: string;
}

// Airline name mapping
const AIRLINE_NAMES: Record<string, string> = {
  KE: '대한항공',
  OZ: '아시아나',
  '7C': '제주항공',
  BX: '에어부산',
  LJ: '진에어',
  JL: '일본항공',
  NH: '전일본공수',
  CA: '중국국제항공',
  MU: '중국동방항공',
};

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  'ON TIME': 'text-green-600',
  'DELAYED': 'text-red-600',
  'BOARDING': 'text-blue-600',
  'DEPARTED': 'text-gray-600',
  'ARRIVED': 'text-gray-500',
  'CANCELLED': 'text-red-800 line-through',
};

export default function FlightTable({ flights, selectedAirport }: FlightTableProps) {
  const [statusMap, setStatusMap] = useState<Record<string, FlightStatus>>({});

  // Fetch real-time status for each flight
  useEffect(() => {
    const fetchStatuses = async () => {
      const statuses: Record<string, FlightStatus> = {};
      
      // Fetch status for first 5 flights to avoid too many requests (API rate limit)
      const flightsToCheck = flights.slice(0, 5);
      
      await Promise.all(
        flightsToCheck.map(async (flight) => {
          try {
            const response = await fetch(`/api/flight/status/${flight.flightNo}`);
            if (response.ok) {
              const status = await response.json();
              statuses[flight.flightNo] = status;
            }
          } catch (error) {
            logger.error(`Failed to fetch status for ${flight.flightNo}:`, error instanceof Error ? error.message : String(error));
          }
        })
      );
      
      setStatusMap(statuses);
    };

    if (flights.length > 0) {
      fetchStatuses();
    }
  }, [flights]);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="p-3 text-left font-medium">항공편</th>
            <th className="p-3 text-left font-medium">항공사</th>
            <th className="p-3 text-left font-medium">출발</th>
            <th className="p-3 text-left font-medium">도착</th>
            <th className="p-3 text-left font-medium">예정 출발</th>
            <th className="p-3 text-left font-medium">예정 도착</th>
            <th className="p-3 text-left font-medium">소요시간</th>
            <th className="p-3 text-left font-medium">평균 지연</th>
            <th className="p-3 text-left font-medium">실시간 상태</th>
            <th className="p-3 text-left font-medium">기종</th>
            <th className="p-3 text-left font-medium">경유</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((flight, index) => {
            const realtimeStatus = statusMap[flight.flightNo];
            const statusClass = STATUS_COLORS[realtimeStatus?.status || flight.status || ''] || '';
            
            // 소요시간 계산
            const calculateDuration = (dep: string, arr: string) => {
              try {
                const depTime = new Date(dep);
                const arrTime = new Date(arr);
                const diffMs = arrTime.getTime() - depTime.getTime();
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                return `${hours}시간 ${minutes}분`;
              } catch {
                return '-';
              }
            };
            
            return (
              <tr key={`${flight.flightNo}-${index}`} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="p-3 font-mono font-medium text-sm">
                  {flight.flightNo.includes('+') ? (
                    <div className="space-y-1">
                      {flight.flightNo.split('+').map((segment, i) => (
                        <div key={i} className="text-xs">{segment}</div>
                      ))}
                    </div>
                  ) : (
                    flight.flightNo
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <AirlineLogo airline={AIRLINE_NAMES[flight.airline] || flight.airline} size="sm" />
                    <span className="text-sm">{AIRLINE_NAMES[flight.airline] || flight.airline}</span>
                  </div>
                </td>
                <td className="p-3 text-sm font-medium">{flight.departure}</td>
                <td className="p-3 text-sm font-medium">{flight.arrival}</td>
                <td className="p-3 text-sm">{formatTime(flight.scheduledDep)}</td>
                <td className="p-3 text-sm">
                  {flight.scheduledArr.includes('+1') ? (
                    <span className="text-orange-600">
                      {formatTime(flight.scheduledArr.replace('+1', ''))} <span className="text-xs">(+1일)</span>
                    </span>
                  ) : (
                    formatTime(flight.scheduledArr)
                  )}
                </td>
                <td className="p-3 text-sm font-medium text-gray-600">
                  {calculateDuration(flight.scheduledDep, flight.scheduledArr.replace('+1', ''))}
                </td>
                <td className="p-3">
                  {flight.avgDelay !== undefined ? (
                    <span className={`text-sm ${flight.avgDelay >= 15 ? 'text-red-600 font-medium' : flight.avgDelay > 5 ? 'text-orange-600' : 'text-green-600'}`}>
                      {flight.avgDelay}분
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className={`p-3 font-medium text-sm ${statusClass}`}>
                  {realtimeStatus?.status || flight.status || '-'}
                </td>
                <td className="p-3 text-sm">{flight.aircraft || '-'}</td>
                <td className="p-3 text-sm">
                  {flight.via ? (
                    <span className="text-blue-600 font-medium">{flight.via} 경유</span>
                  ) : (
                    <span className="text-green-600">직항</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {flights.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {selectedAirport}에서 출발하는 항공편이 없습니다.
        </div>
      )}
      
      {flights.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-right">
          총 {flights.length}개 항공편 • 마지막 업데이트: {format(new Date(), 'HH:mm', { locale: ko })}
        </div>
      )}
    </div>
  );
}