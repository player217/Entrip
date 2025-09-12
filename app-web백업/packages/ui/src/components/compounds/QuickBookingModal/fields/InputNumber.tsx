import React, { forwardRef } from 'react';
import { cn } from '../../../../utils';
import { Icon } from '../../../primitives/Icon';

export interface InputNumberProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
}

export const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(
  ({ className, error, success, fullWidth = true, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="number"
          disabled={disabled}
          className={cn(
            // 기본 스타일 - 더 모던하고 미니멀한 디자인
            "h-8 px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-200",
            "border-2 border-gray-300 bg-white shadow-inner",
            "placeholder:text-gray-400",
            fullWidth && "w-full",
            
            // Remove spinner buttons for cleaner look
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            
            // 상태별 스타일 - 더 subtle한 색상
            disabled 
              ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
              : error
              ? "border-red-300 text-gray-900 hover:border-red-400 focus:border-red-500"
              : success
              ? "border-green-300 text-gray-900 pr-10 hover:border-green-400 focus:border-green-500"
              : "border-gray-200 text-gray-900 hover:border-gray-300 focus:border-brand-primary",
            
            // 포커스 스타일 - 더 부드럽고 현대적인 shadow
            !disabled && "focus:outline-none focus:ring-2 focus:ring-offset-0",
            !disabled && !error && !success && "focus:ring-brand-primary/20",
            !disabled && error && "focus:ring-red-500/20",
            !disabled && success && "focus:ring-green-500/20",
            
            className
          )}
          {...props}
        />
        
        {/* Success checkmark */}
        {success && !disabled && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Icon 
              icon="heroicons:check-circle-solid" 
              className="w-4 h-4 text-green-500"
            />
          </div>
        )}
        
        {/* Error icon */}
        {error && !disabled && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Icon 
              icon="heroicons:exclamation-circle-solid" 
              className="w-4 h-4 text-red-500"
            />
          </div>
        )}
      </div>
    );
  }
);

InputNumber.displayName = 'InputNumber';