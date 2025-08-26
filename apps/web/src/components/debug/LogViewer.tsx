'use client';

import { useState, useEffect } from 'react';
import { logger, type LogEntry, type LogLevel } from '@entrip/shared';
import { Icon } from '@entrip/ui';

interface LogViewerProps {
  className?: string;
  maxLogs?: number;
}

type FilterLevel = LogLevel | 'all';

export function LogViewer({ className, maxLogs = 100 }: LogViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        const recentLogs = logger.getRecentLogs(maxLogs);
        setLogs(recentLogs);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, maxLogs]);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return 'bg-red-50 text-red-800';
      case 'warn':
        return 'bg-yellow-50 text-yellow-800';
      case 'info':
        return 'bg-blue-50 text-blue-800';
      case 'debug':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      case 'debug':
      default:
        return 'text-gray-600';
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors ${className || ''}`}
        title="로그 뷰어"
      >
        <Icon icon="ph:bug-bold" className="w-6 h-6" />
      </button>

      {/* 로그 뷰어 패널 */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[600px] h-[400px] bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-gray-800">로그 뷰어</h3>
            <div className="flex items-center gap-2">
              {/* 필터 버튼 */}
              <div className="flex gap-1">
                {(['all', 'error', 'warn', 'info', 'debug'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`px-2 py-1 text-xs rounded ${
                      filter === level 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* 액션 버튼 */}
              <button
                onClick={() => logger.clearLogs()}
                className="p-1 hover:bg-gray-100 rounded"
                title="로그 클리어"
              >
                <Icon icon="ph:trash-bold" className="w-4 h-4" />
              </button>
              <button
                onClick={() => logger.downloadLogs()}
                className="p-1 hover:bg-gray-100 rounded"
                title="로그 다운로드"
              >
                <Icon icon="ph:download-bold" className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Icon icon="ph:x-bold" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 로그 목록 */}
          <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-gray-50">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                로그가 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded cursor-pointer hover:opacity-80 ${getLogColor(log.level)} ${
                      selectedLog === log ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedLog(log === selectedLog ? null : log)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] opacity-60">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`font-semibold text-[10px] ${getLevelColor(log.level)}`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="font-semibold text-[11px]">
                        [{log.component}]
                      </span>
                      <span className="flex-1">{String(log.message)}</span>
                    </div>
                    {log.data !== undefined && log.data !== null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] opacity-60">
                          데이터 보기
                        </summary>
                        <pre className="mt-1 p-1 bg-white/50 rounded text-[10px] overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.error && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] opacity-60 text-red-600">
                          에러 스택 보기
                        </summary>
                        <pre className="mt-1 p-1 bg-white/50 rounded text-[10px] overflow-auto text-red-600">
                          {log.error.message}
                          {log.stack && '\n' + log.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="p-2 border-t text-xs text-gray-500">
            총 {filteredLogs.length}개 로그 (최근 {maxLogs}개만 표시)
          </div>
        </div>
      )}
    </>
  );
}