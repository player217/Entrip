import React from 'react';
import { clsx } from 'clsx';

export type StatusType = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface StatusTagProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: '대기중',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  confirmed: {
    label: '확정',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: '취소',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  completed: {
    label: '완료',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  }
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function StatusTag({ status, size = 'md', className }: StatusTagProps) {
  const config = statusConfig[status];

  if (!config) {
    return null;
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border',
        config.className,
        sizeConfig[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}