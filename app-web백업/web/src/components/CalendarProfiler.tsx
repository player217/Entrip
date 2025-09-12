'use client';

import { useState, useEffect } from 'react';
import { ReactProfiler, onRenderCallback, startProfiling, stopProfiling } from '../utils/profiler';
import { memoryProfiler } from '../utils/memory-profiler';
import CalendarVirtual from '../features/calendar/CalendarVirtual';
import { logger, type Booking } from '@entrip/shared';

interface CalendarProfilerProps {
  currentDate: Date;
  bookings: Booking[];
  onDayClick?: (date: Date) => void;
  onBookingClick?: (booking: Booking) => void;
}

export default function CalendarProfiler({ currentDate, bookings, onDayClick, onBookingClick }: CalendarProfilerProps) {
  const [isProfiling, setIsProfiling] = useState(false);
  interface ProfileResult {
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
  }

  interface MemoryResult {
    initialMemory: number;
    finalMemory: number;
    percentageChange: number;
  }

  const [profileResults, setProfileResults] = useState<ProfileResult[] | null>(null);
  const [memoryResults, setMemoryResults] = useState<MemoryResult | null>(null);

  const handleStartProfiling = () => {
    logger.info('[CalendarProfiler]', 'Starting performance and memory profiling');
    setIsProfiling(true);
    startProfiling();
    memoryProfiler.start();
  };

  const handleStopProfiling = () => {
    logger.info('[CalendarProfiler]', 'Stopping profiling');
    setIsProfiling(false);
    
    // Stop performance profiling
    const perfResults = stopProfiling();
    setProfileResults(perfResults);
    
    // Stop memory profiling
    const memResults = memoryProfiler.stop();
    setMemoryResults(memResults);
  };

  // Clean up effect
  useEffect(() => {
    return () => {
      if (isProfiling) {
        memoryProfiler.stop();
      }
    };
  }, [isProfiling]);

  return (
    <div>
      {/* Profiling controls */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={handleStartProfiling}
            disabled={isProfiling}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Start Profiling
          </button>
          <button
            onClick={handleStopProfiling}
            disabled={!isProfiling}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Stop Profiling
          </button>
          {isProfiling && (
            <span className="text-sm text-gray-600">
              🔴 Profiling in progress...
            </span>
          )}
        </div>

        {/* Results display */}
        {profileResults && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Performance Results:</h4>
            <div className="text-sm space-y-1">
              <div>Total renders: {profileResults.length}</div>
              <div>Slow renders (&gt;16.67ms): {profileResults.filter((r) => r.actualDuration > 16.67).length}</div>
              <div>FPS estimate: {(1000 / (profileResults.reduce((sum, r) => sum + r.actualDuration, 0) / profileResults.length)).toFixed(1)}</div>
            </div>
          </div>
        )}

        {memoryResults && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Memory Results:</h4>
            <div className="text-sm space-y-1">
              <div>Initial: {(memoryResults.initialMemory / 1024 / 1024).toFixed(2)}MB</div>
              <div>Final: {(memoryResults.finalMemory / 1024 / 1024).toFixed(2)}MB</div>
              <div>Change: {memoryResults.percentageChange > 0 ? '+' : ''}{memoryResults.percentageChange.toFixed(1)}%</div>
              <div className={memoryResults.percentageChange < -30 ? 'text-green-600 font-medium' : ''}>
                {memoryResults.percentageChange < -30 && '✅ Memory reduction target achieved!'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar wrapped in Profiler */}
      <ReactProfiler id="CalendarVirtual" onRender={onRenderCallback}>
        <CalendarVirtual
          currentDate={currentDate}
          bookings={bookings}
          onDayClick={onDayClick}
          onBookingClick={onBookingClick}
        />
      </ReactProfiler>
    </div>
  );
}