import React, { forwardRef } from 'react';
import { cn } from '../../../../utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
  resizable?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ 
    className, 
    error, 
    fullWidth = true, 
    resizable = true,
    disabled,
    ...props 
  }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          // 기본 스타일 - 더 모던하고 미니멀한 디자인
          "px-3 py-2 text-sm font-normal rounded-md transition-all duration-200",
          "border-2 border-gray-300 bg-white shadow-inner",
          "placeholder:text-gray-400",
          "min-h-[100px]",
          fullWidth && "w-full",
          !resizable && "resize-none",
          
          // 상태별 스타일 - 더 subtle한 색상
          disabled 
            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
            : error
            ? "border-red-300 text-gray-900 hover:border-red-400 focus:border-red-500"
            : "border-gray-200 text-gray-900 hover:border-gray-300 focus:border-brand-primary",
          
          // 포커스 스타일 - 더 부드럽고 현대적인 shadow
          !disabled && "focus:outline-none focus:ring-2 focus:ring-offset-0",
          !disabled && !error && "focus:ring-brand-primary/20",
          !disabled && error && "focus:ring-red-500/20",
          
          className
        )}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';