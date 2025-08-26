'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plane } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '../lib/api-client';

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

interface Route {
  departure: string;
  arrival: string;
  departureCity: string;
  arrivalCity: string;
  available: boolean;
}

interface WeeklySchedule {
  day: string;
  flights: {
    airline: string;
    flightNo: string;
    departure: string;
    arrival: string;
  }[];
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: '월요일' },
  { key: 'tuesday', label: '화요일' },  
  { key: 'wednesday', label: '수요일' },
  { key: 'thursday', label: '목요일' },
  { key: 'friday', label: '금요일' },
  { key: 'saturday', label: '토요일' },
  { key: 'sunday', label: '일요일' },
];

// 국가별 도시 그룹핑
const COUNTRY_CITIES: Record<string, string[]> = {
  '대한민국': ['서울(ICN)', '서울(GMP)', '부산(PUS)', '제주(CJU)'],
  '일본': ['도쿄(NRT)', '도쿄(HND)', '오사카(KIX)', '나고야(NGO)', '후쿠오카(FUK)'],
  '중국': ['베이징(PEK)', '상하이(PVG)', '광저우(CAN)', '선전(SZX)'],
  '동남아시아': ['방콕(BKK)', '싱가포르(SIN)', '쿠알라룸푸르(KUL)', '마닐라(MNL)'],
  '유럽': ['런던(LHR)', '파리(CDG)', '프랑크푸르트(FRA)', '암스테르담(AMS)'],
  '북미': ['뉴욕(JFK)', '로스앤젤레스(LAX)', '시카고(ORD)', '토론토(YYZ)'],
};

export default function FlightRoutes() {
  const [step, setStep] = useState<'departure' | 'arrival' | 'schedule'>('departure');
  const [selectedDeparture, setSelectedDeparture] = useState('');
  const [selectedArrival, setSelectedArrival] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 한국 주요 공항 하드코딩 (우선 표시)
  const KOREAN_AIRPORTS: Airport[] = [
    { code: "ICN", name: "인천국제공항", city: "인천", country: "대한민국" },
    { code: "GMP", name: "김포국제공항", city: "서울", country: "대한민국" },
    { code: "PUS", name: "김해국제공항", city: "부산", country: "대한민국" },
    { code: "CJU", name: "제주국제공항", city: "제주", country: "대한민국" },
    { code: "TAE", name: "대구국제공항", city: "대구", country: "대한민국" },
    { code: "CJJ", name: "청주국제공항", city: "청주", country: "대한민국" },
    { code: "KWJ", name: "광주공항", city: "광주", country: "대한민국" },
    { code: "RSU", name: "여수공항", city: "여수", country: "대한민국" },
    { code: "USN", name: "울산공항", city: "울산", country: "대한민국" },
    { code: "MWX", name: "무안국제공항", city: "무안", country: "대한민국" },
    { code: "YNY", name: "양양국제공항", city: "양양", country: "대한민국" },
    { code: "HIN", name: "사천공항", city: "사천", country: "대한민국" },
    // 주요 해외 공항들
    { code: "NRT", name: "나리타국제공항", city: "도쿄", country: "일본" },
    { code: "HND", name: "하네다공항", city: "도쿄", country: "일본" },
    { code: "KIX", name: "간사이국제공항", city: "오사카", country: "일본" },
    { code: "PEK", name: "베이징수도국제공항", city: "베이징", country: "중국" },
    { code: "PVG", name: "상하이푸둥국제공항", city: "상하이", country: "중국" },
    { code: "BKK", name: "수완나품국제공항", city: "방콕", country: "태국" },
    { code: "SIN", name: "창이국제공항", city: "싱가포르", country: "싱가포르" },
    { code: "JFK", name: "존 F. 케네디 국제공항", city: "뉴욕", country: "미국" }
  ];

  // API에서 추가 공항 데이터 가져오기 (한국 공항을 우선으로 표시)
  const { data: apiAirports = [] } = useSWR<Airport[]>('/api/flight/airports', fetcher);
  
  // 한국 공항 + API 공항 병합 (중복 제거)
  const airports = useMemo(() => {
    const airportMap = new Map<string, Airport>();
    
    // 한국 공항을 먼저 추가
    KOREAN_AIRPORTS.forEach(airport => {
      airportMap.set(airport.code, airport);
    });
    
    // API 공항 추가 (중복되지 않는 것만)
    apiAirports.forEach(airport => {
      if (!airportMap.has(airport.code)) {
        airportMap.set(airport.code, {
          ...airport,
          country: airport.country || '기타'
        });
      }
    });
    
    return Array.from(airportMap.values());
  }, [apiAirports]);

  // 선택된 출발지의 도착지 목록
  const { data: routes = [] } = useSWR<Route[]>(
    selectedDeparture ? `/api/flight/routes?departure=${selectedDeparture}` : null,
    fetcher
  );

  // 주간 스케줄
  const { data: schedule = [] } = useSWR<WeeklySchedule[]>(
    selectedDeparture && selectedArrival 
      ? `/api/flight/schedule?departure=${selectedDeparture}&arrival=${selectedArrival}` 
      : null,
    fetcher
  );

  const filteredAirports = useMemo(() => {
    if (!searchTerm) {
      // 검색어가 없으면 한국 공항을 먼저 표시
      return airports.sort((a, b) => {
        if (a.country === '대한민국' && b.country !== '대한민국') return -1;
        if (a.country !== '대한민국' && b.country === '대한민국') return 1;
        return a.name.localeCompare(b.name);
      });
    }
    
    return airports.filter(airport =>
      airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.country?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      // 검색 시에도 한국 공항 우선
      if (a.country === '대한민국' && b.country !== '대한민국') return -1;
      if (a.country !== '대한민국' && b.country === '대한민국') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [airports, searchTerm]);

  const handleDepartureSelect = (airportCode: string) => {
    setSelectedDeparture(airportCode);
    setSelectedArrival('');
    setStep('arrival');
  };

  const handleArrivalSelect = (airportCode: string) => {
    setSelectedArrival(airportCode);
    setStep('schedule');
  };

  const handleReset = () => {
    setStep('departure');
    setSelectedDeparture('');
    setSelectedArrival('');
    setSearchTerm('');
  };

  const getDepartureAirport = () => airports.find(a => a.code === selectedDeparture);
  const getArrivalAirport = () => airports.find(a => a.code === selectedArrival);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center space-x-2 ${step === 'departure' ? 'text-blue-600' : step === 'arrival' || step === 'schedule' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${step === 'departure' ? 'border-blue-600 bg-blue-50 text-blue-600' : step === 'arrival' || step === 'schedule' ? 'border-green-600 bg-green-50 text-green-600' : 'border-gray-300 bg-white text-gray-400'}`}>
            1
          </div>
          <span className="font-medium text-gray-800">출발지 선택</span>
        </div>
        <div className={`w-8 h-0.5 ${step === 'arrival' || step === 'schedule' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center space-x-2 ${step === 'arrival' ? 'text-blue-600' : step === 'schedule' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${step === 'arrival' ? 'border-blue-600 bg-blue-50 text-blue-600' : step === 'schedule' ? 'border-green-600 bg-green-50 text-green-600' : 'border-gray-300 bg-white text-gray-400'}`}>
            2
          </div>
          <span className="font-medium text-gray-800">도착지 선택</span>
        </div>
        <div className={`w-8 h-0.5 ${step === 'schedule' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center space-x-2 ${step === 'schedule' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${step === 'schedule' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-400'}`}>
            3
          </div>
          <span className="font-medium text-gray-800">운항 스케줄</span>
        </div>
      </div>

      {/* Current Selection */}
      {(selectedDeparture || selectedArrival) && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {selectedDeparture && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-600">출발:</span>
                  <span className="font-medium text-gray-800">{getDepartureAirport()?.name} ({selectedDeparture})</span>
                </div>
              )}
              {selectedDeparture && selectedArrival && (
                <Plane className="text-blue-600" size={20} />
              )}
              {selectedArrival && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-600">도착:</span>
                  <span className="font-medium text-gray-800">{getArrivalAirport()?.name} ({selectedArrival})</span>
                </div>
              )}
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              다시 선택
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Departure Selection */}
      {step === 'departure' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="출발 공항을 검색하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredAirports.slice(0, 50).map((airport) => (
              <button
                key={airport.code}
                onClick={() => handleDepartureSelect(airport.code)}
                className={`p-4 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors bg-white ${
                  airport.country === '대한민국' ? 'border-blue-200 bg-blue-50/30' : ''
                }`}
              >
                <div className="font-medium text-gray-800">{airport.name}</div>
                <div className="text-sm text-gray-600">{airport.city} ({airport.code})</div>
                {airport.country && (
                  <div className={`text-xs mt-1 ${
                    airport.country === '대한민국' ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {airport.country}
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {filteredAirports.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
          
          {filteredAirports.length > 50 && (
            <div className="text-center py-2 text-sm text-gray-500">
              처음 50개 공항만 표시됩니다. 검색어를 입력하여 더 정확한 결과를 확인하세요.
            </div>
          )}
        </div>
      )}

      {/* Step 2: Arrival Selection */}
      {step === 'arrival' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">도착지를 선택하세요</h3>
          
          {Object.entries(COUNTRY_CITIES).map(([country, cities]) => (
            <div key={country} className="space-y-2">
              <h4 className="font-medium text-gray-700 border-b pb-1">{country}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cities.map((cityCode) => {
                  const code = cityCode.match(/\(([^)]+)\)/)?.[1] || '';
                  const cityName = cityCode.replace(/\([^)]+\)/, '').trim();
                  
                  // 노선 매칭 로직 개선
                  const hasRoute = routes.some(route => {
                    // API에서 반환하는 arrival 필드와 매칭
                    if (route.arrival === code) return true;
                    
                    // 한국 공항의 경우 도시명으로도 매칭 시도
                    const koreanCityMap: Record<string, string[]> = {
                      'ICN': ['인천', '서울'],
                      'GMP': ['김포', '서울'],
                      'PUS': ['부산', '김해'],
                      'CJU': ['제주'],
                      'TAE': ['대구'],
                      'CJJ': ['청주'],
                      'KWJ': ['광주'],
                      'NRT': ['도쿄'],
                      'HND': ['도쿄'],
                      'KIX': ['오사카']
                    };
                    
                    const possibleNames = koreanCityMap[code] || [cityName];
                    return possibleNames.some(name => 
                      route.arrival?.includes(name) || 
                      route.arrivalCity?.includes(name)
                    );
                  });
                  
                  return (
                    <button
                      key={code}
                      onClick={() => hasRoute && handleArrivalSelect(code)}
                      disabled={!hasRoute}
                      className={`p-3 text-left border rounded-lg transition-colors bg-white ${
                        hasRoute
                          ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                      }`}
                    >
                      <div className={`font-medium ${hasRoute ? 'text-gray-800' : 'text-gray-400'}`}>{cityName}</div>
                      <div className={`text-sm ${hasRoute ? 'text-gray-600' : 'text-gray-400'}`}>({code})</div>
                      {!hasRoute && (
                        <div className="text-xs text-red-500 mt-1">운항 중단</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Weekly Schedule */}
      {step === 'schedule' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">주간 운항 스케줄</h3>
          
          {schedule.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-lg border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-left font-medium min-w-[100px] text-gray-700">요일</th>
                    <th className="p-3 text-left font-medium text-gray-700">항공사</th>
                    <th className="p-3 text-left font-medium text-gray-700">편명</th>
                    <th className="p-3 text-left font-medium text-gray-700">출발시간</th>
                    <th className="p-3 text-left font-medium text-gray-700">도착시간</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day) => {
                    const daySchedule = schedule.find(s => s.day === day.key);
                    const flights = daySchedule?.flights || [];
                    
                    return flights.length > 0 ? (
                      flights.map((flight, index) => (
                        <tr key={`${day.key}-${index}`} className="border-b hover:bg-gray-50">
                          {index === 0 && (
                            <td className="p-3 font-medium text-gray-800" rowSpan={flights.length}>
                              {day.label}
                            </td>
                          )}
                          <td className="p-3 text-gray-800">{flight.airline}</td>
                          <td className="p-3 font-mono text-gray-800">{flight.flightNo}</td>
                          <td className="p-3 text-gray-800">{flight.departure}</td>
                          <td className="p-3 text-gray-800">{flight.arrival}</td>
                        </tr>
                      ))
                    ) : (
                      <tr key={day.key} className="border-b">
                        <td className="p-3 font-medium text-gray-800">{day.label}</td>
                        <td className="p-3 text-gray-400" colSpan={4}>운항 없음</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
              선택하신 노선의 운항 스케줄을 불러오는 중입니다...
            </div>
          )}
        </div>
      )}
    </div>
  );
}