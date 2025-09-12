import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = ({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse',
  ...rest
}: SkeletonProps) => {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };
  
  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
      {...rest}
    />
  );
};

export interface SkeletonGroupProps {
  count?: number;
  gap?: number;
  direction?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
}

export const SkeletonGroup = ({
  count = 3,
  gap = 2,
  direction = 'vertical',
  children,
}: SkeletonGroupProps) => {
  const directionClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };
  
  if (children) {
    return (
      <div className={clsx('flex', directionClasses[direction], `gap-${gap}`)}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={clsx('flex', directionClasses[direction], `gap-${gap}`)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  );
};
