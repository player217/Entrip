'use client';

import React, { useState, useEffect } from 'react';
import { KOREAN_AIRPORTS, getAirportByCode } from '@entrip/shared';
import { flightAPI, type FlightSchedule } from '@entrip/shared';

export function FlightScheduleSearch() {
  const [selectedDeparture, setSelectedDeparture] = useState<string>('');
  const [selectedArrival, setSelectedArrival] = useState<string>('');
  const [availableArrivals, setAvailableArrivals] = useState<string[]>([]);
  const [flights, setFlights] = useState<FlightSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCrawled, setLastCrawled] = useState<string | null>(null);
  
  // 컴포넌트 마운트 확인
  useEffect(() => {
    console.log('FlightScheduleSearch component mounted');
    console.log('CRAWLER_API_URL:', process.env.NEXT_PUBLIC_CRAWLER_API_URL);
  }, []);

  // 출발지 변경시 도착지 목록 업데이트
  useEffect(() => {
    if (selectedDeparture) {
      setSelectedArrival('');
      setFlights([]);
      fetchAvailableDestinations();
    } else {
      setAvailableArrivals([]);
    }
  }, [selectedDeparture]);

  // 도착지 선택시 항공편 조회
  useEffect(() => {
    if (selectedDeparture && selectedArrival) {
      fetchFlightSchedule();
    }
  }, [selectedArrival]);

  const fetchAvailableDestinations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching destinations for:', selectedDeparture);
      
      // API에서 전체 스케줄 가져오기
      const scheduleData = await flightAPI.getSchedule(selectedDeparture);
      console.log('API Response:', scheduleData);
      
      // 중복 제거된 도착지 목록 추출
      const destinations = new Set<string>();
      scheduleData.flights.forEach(flight => {
        if (flight.destination && flight.destination !== 'Unknown') {
          // API가 이미 IATA 코드만 반환하므로 그대로 사용
          const code = flight.destination.trim();
          if (code.length === 3) {
            destinations.add(code);
          }
        }
      });
      
      setAvailableArrivals(Array.from(destinations).sort());
      setLastCrawled(scheduleData.crawledAt);
      
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
      setError('도착지 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlightSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API에서 스케줄 가져오기
      const scheduleData = await flightAPI.getSchedule(selectedDeparture);
      
      // 선택한 도착지로 필터링
      const filteredFlights = scheduleData.flights.filter(flight => {
        const destCode = flight.destination.trim();
        return destCode === selectedArrival;
      });
      
      setFlights(filteredFlights);
      
    } catch (err) {
      console.error('Failed to fetch flights:', err);
      setError('항공편 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDaySymbol = (active: boolean) => active ? '●' : '○';

  const formatCrawledTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">항공편 스케줄 조회</h1>
      
      {lastCrawled && (
        <div className="mb-4 text-sm text-gray-600">
          마지막 업데이트: {formatCrawledTime(lastCrawled)}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">출발 공항</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDeparture}
            onChange={(e) => setSelectedDeparture(e.target.value)}
            disabled={loading}
          >
            <option value="">출발 공항을 선택하세요</option>
            {KOREAN_AIRPORTS.map(airport => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">도착 공항</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedArrival}
            onChange={(e) => setSelectedArrival(e.target.value)}
            disabled={!selectedDeparture || loading || availableArrivals.length === 0}
          >
            <option value="">
              {!selectedDeparture 
                ? '먼저 출발 공항을 선택하세요' 
                : availableArrivals.length === 0 
                  ? '운항 노선이 없습니다'
                  : '도착 공항을 선택하세요'
              }
            </option>
            {availableArrivals.map(code => {
              const airport = getAirportByCode(code);
              return (
                <option key={code} value={code}>
                  {code} - {airport?.name || airport?.nameEn || code}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && flights.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">항공사</th>
                <th className="px-4 py-2 border">편명</th>
                <th className="px-4 py-2 border">출발</th>
                <th className="px-4 py-2 border">도착</th>
                <th className="px-4 py-2 border">월</th>
                <th className="px-4 py-2 border">화</th>
                <th className="px-4 py-2 border">수</th>
                <th className="px-4 py-2 border">목</th>
                <th className="px-4 py-2 border">금</th>
                <th className="px-4 py-2 border">토</th>
                <th className="px-4 py-2 border">일</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight, index) => (
                <tr key={`${flight.flightNo}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{flight.airline}</td>
                  <td className="px-4 py-2 border font-medium">{flight.flightNo}</td>
                  <td className="px-4 py-2 border">{flight.departureTime}</td>
                  <td className="px-4 py-2 border">{flight.arrivalTime || '-'}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.mon || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.tue || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.wed || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.thu || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.fri || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.sat || false)}</td>
                  <td className="px-4 py-2 border text-center">{getDaySymbol(flight.days?.sun || false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-4 text-sm text-gray-600">
            총 {flights.length}개 항공편
          </div>
        </div>
      )}

      {!loading && selectedDeparture && selectedArrival && flights.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          해당 노선의 운항 스케줄이 없습니다.
        </div>
      )}
    </div>
  );
}