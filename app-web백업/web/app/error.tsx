'use client';

import { useEffect } from 'react';
import { logger } from '@entrip/shared';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러를 로거에 기록
    logger.error('GlobalErrorBoundary', 'Application error occurred', error, {
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
        <p className="text-gray-600 mb-4">
          예상치 못한 오류가 발생했습니다. 문제가 계속되면 관리자에게 문의하세요.
        </p>
        <details className="mb-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            오류 상세 정보
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <button
            onClick={() => {
              logger.downloadLogs();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            로그 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}