import React, { forwardRef } from 'react';
import { cn } from '../../utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-white shadow-sm',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-primary',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';