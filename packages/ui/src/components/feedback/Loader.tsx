import React from 'react';
import { clsx } from 'clsx';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const Loader = ({ 
  size = 'md', 
  className,
  text 
}: LoaderProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div className={clsx(
        'animate-spin rounded-full border-t-2 border-b-2 border-brand-500',
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-4 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

