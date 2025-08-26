'use client';

import { useState, useEffect } from 'react';
import { X, Clock, MapPin } from 'lucide-react';
import FlightTable from './FlightTable';
import FlightRoutes from './FlightRoutes';
import useSWR from 'swr';
import { fetcher } from '../lib/api-client';
import { subscribeToFlightDelays, unsubscribeFromFlightDelays, watchFlight, initializeSocket } from '../lib/socket';
import { useToast } from '../providers/ToastProvider';
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
}

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Airport {
  code: string;
  name: string;
  city: string;
}

export default function FlightModal({ isOpen, onClose }: FlightModalProps) {
  const [mode, setMode] = useState<'timetable' | 'routes'>('timetable');
  const [selectedAirport, setSelectedAirport] = useState('ICN');
  const [isInternational, setIsInternational] = useState(false);
  const { addToast } = useToast();
  
  // Fetch airports list
  const { data: airports = [] } = useSWR<Airport[]>(
    isOpen ? '/api/flight/airports' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Fetch timetable for selected airport
  const { data: flights = [], error, isLoading } = useSWR<Flight[]>(
    isOpen && selectedAirport ? `/api/flight/timetable?dep=${selectedAirport}${isInternational ? '&intl=true' : ''}` : null,
    fetcher,
    {
      refreshInterval: 3 * 60 * 60 * 1000, // 3 hours
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (flights.length > 0) {
      logger.info('Flight timetable fetched', `dep=${selectedAirport} intl=${isInternational} rows=${flights.length}`);
      
      // Initialize socket first
      const socket = initializeSocket();
      if (socket) {
        // Watch first 5 flights for delays
        flights.slice(0, 5).forEach(flight => {
          watchFlight(flight.flightNo);
        });
      }
    }
  }, [flights, selectedAirport, isInternational]);
  
  // Subscribe to delay notifications
  useEffect(() => {
    if (!isOpen) return;
    
    // Initialize socket first
    const socket = initializeSocket();
    if (!socket) {
      logger.warn('FlightModal', 'Could not initialize socket - no auth token');
      return;
    }
    
    const handleDelay = (delayInfo: { flightNo: string; delay: number }) => {
      logger.info('Flight delay notification', `${delayInfo.flightNo} delayed ${delayInfo.delay}min`);
      addToast({
        type: 'warning',
        title: `항공편 지연 알림`,
        message: `${delayInfo.flightNo} 편이 ${delayInfo.delay}분 지연되었습니다.`,
        duration: 10000
      });
    };
    
    subscribeToFlightDelays(handleDelay);
    
    return () => {
      unsubscribeFromFlightDelays();
    };
  }, [isOpen, addToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="border-b">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">✈️ 항공편 정보</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Mode Tabs */}
            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setMode('timetable')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  mode === 'timetable'
                    ? 'bg-white border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Clock size={18} />
                시간표 조회
              </button>
              <button
                onClick={() => setMode('routes')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  mode === 'routes'
                    ? 'bg-white border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <MapPin size={18} />
                항공 노선
              </button>
            </div>
            
            {/* Timetable Controls */}
            {mode === 'timetable' && (
              <div className="flex items-center gap-4 p-4 bg-white">
                {airports.length > 0 && (
                  <select
                    value={selectedAirport}
                    onChange={(e) => setSelectedAirport(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {airports.map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name} ({airport.code})
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isInternational}
                    onChange={(e) => setIsInternational(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">국제선</span>
                </label>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {mode === 'timetable' ? (
              error ? (
                <div className="text-center py-8 text-red-500">
                  항공편 정보를 불러오는 중 오류가 발생했습니다.
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-600">항공편 정보를 불러오는 중...</p>
                </div>
              ) : (
                <FlightTable flights={flights} selectedAirport={selectedAirport} />
              )
            ) : (
              <FlightRoutes />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}