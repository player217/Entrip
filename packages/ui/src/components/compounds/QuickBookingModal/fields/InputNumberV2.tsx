import React, { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../../../utils';
import { Icon } from '../../../primitives/Icon';

export interface InputNumberV2Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  showControls?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

export const InputNumberV2 = forwardRef<HTMLInputElement, InputNumberV2Props>(
  ({ 
    className, 
    error, 
    success, 
    fullWidth = true, 
    disabled,
    showControls = true,
    step = 1,
    min,
    max,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [isIncrementing, setIsIncrementing] = useState(false);
    const [isDecrementing, setIsDecrementing] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const handleIncrement = () => {
      if (disabled || !onChange) return;
      
      const currentValue = Number(value) || 0;
      const newValue = max !== undefined ? Math.min(currentValue + step, max) : currentValue + step;
      
      const event = {
        target: { value: String(newValue) }
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange(event);
    };
    
    const handleDecrement = () => {
      if (disabled || !onChange) return;
      
      const currentValue = Number(value) || 0;
      const newValue = min !== undefined ? Math.max(currentValue - step, min) : currentValue - step;
      
      const event = {
        target: { value: String(newValue) }
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange(event);
    };
    
    const startIncrement = () => {
      if (disabled) return;
      setIsIncrementing(true);
      handleIncrement();
      
      // Start with a delay, then repeat faster
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(handleIncrement, 100);
      }, 400);
    };
    
    const startDecrement = () => {
      if (disabled) return;
      setIsDecrementing(true);
      handleDecrement();
      
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(handleDecrement, 100);
      }, 400);
    };
    
    const stopChange = () => {
      setIsIncrementing(false);
      setIsDecrementing(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    
    useEffect(() => {
      return () => {
        stopChange();
      };
    }, []);
    
    return (
      <div className="relative">
        <input
          ref={ref}
          type="number"
          disabled={disabled}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          className={cn(
            // 기본 스타일 - 높이 44px로 통일, font-normal로 변경
            "h-11 px-3 py-2 text-sm font-normal rounded-lg transition-all duration-200",
            "border shadow-sm",
            "placeholder:text-gray-400",
            fullWidth && "w-full",
            
            // Remove spinner buttons
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            
            // 상태별 스타일 - 배경 그라데이션 추가
            disabled 
              ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-60"
              : error
              ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-400 text-gray-900 hover:border-red-500 hover:shadow-xl"
              : success
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 text-gray-900 hover:border-green-500 hover:shadow-xl"
              : "bg-white border-gray-300 text-gray-900 hover:border-gray-400",
            
            // 포커스 스타일 - 발광 효과
            !disabled && "focus:outline-none",
            !disabled && !error && !success && "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            !disabled && error && "focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            !disabled && success && "focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
            
            // Controls padding
            showControls && !disabled && "pr-20",
            !showControls && (error || success) && "pr-10",
            
            className
          )}
          {...props}
        />
        
        {/* Number Controls */}
        {showControls && !disabled && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <div className="flex h-9 overflow-hidden rounded-md border border-gray-300 bg-gray-50">
              <button
                type="button"
                onMouseDown={startDecrement}
                onMouseUp={stopChange}
                onMouseLeave={stopChange}
                onTouchStart={startDecrement}
                onTouchEnd={stopChange}
                className={cn(
                  "px-2 hover:bg-gray-100 active:bg-gray-200 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                  isDecrementing && "bg-gray-200"
                )}
                tabIndex={-1}
              >
                <Icon icon="heroicons:minus" className="w-4 h-4 text-gray-600" />
              </button>
              
              <div className="w-px bg-gray-300" />
              
              <button
                type="button"
                onMouseDown={startIncrement}
                onMouseUp={stopChange}
                onMouseLeave={stopChange}
                onTouchStart={startIncrement}
                onTouchEnd={stopChange}
                className={cn(
                  "px-2 hover:bg-gray-100 active:bg-gray-200 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                  isIncrementing && "bg-gray-200"
                )}
                tabIndex={-1}
              >
                <Icon icon="heroicons:plus" className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
        
        {/* Status Icons */}
        {!showControls && (
          <>
            {success && !disabled && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Icon 
                  icon="heroicons:check-circle-solid" 
                  className="w-5 h-5 text-green-500"
                />
              </div>
            )}
            
            {error && !disabled && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Icon 
                  icon="heroicons:exclamation-circle-solid" 
                  className="w-5 h-5 text-red-500"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

InputNumberV2.displayName = 'InputNumberV2';