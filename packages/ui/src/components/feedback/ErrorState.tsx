import React from 'react';
import { Button } from '../primitives/Button';
import { clsx } from 'clsx';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ErrorState = ({
  title = '오류가 발생했습니다',
  message = '잠시 후 다시 시도해주세요.',
  action,
  className,
}: ErrorStateProps) => {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center p-8 text-center',
      className
    )}>
      <div className="w-16 h-16 mb-4 text-danger">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">{message}</p>
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  title = '데이터가 없습니다',
  message = '아직 표시할 내용이 없습니다.',
  action,
  icon,
  className,
}: EmptyStateProps) => {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center p-8 text-center',
      className
    )}>
      {icon || (
        <div className="w-16 h-16 mb-4 text-gray-400">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">{message}</p>
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
