import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  hint?: string; // alias for helperText
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, hint, fullWidth = false, ...props }, ref) => {
    const displayHelperText = helperText || hint;
    return (
      <div className={clsx('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label className="mb-1 text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'px-3 py-2 border rounded-md text-base transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error
              ? 'border-danger text-danger placeholder-danger/50'
              : 'border-gray-300 hover:border-gray-400',
            className
          )}
          {...props}
        />
        {(error || displayHelperText) && (
          <p className={clsx(
            'mt-1 text-sm',
            error ? 'text-danger' : 'text-gray-500'
          )}>
            {error || displayHelperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
