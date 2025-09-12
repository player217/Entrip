import React from 'react';
import { cn } from '../../utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <div className={cn('inline-block', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size]
        )}
      />
    </div>
  );
};