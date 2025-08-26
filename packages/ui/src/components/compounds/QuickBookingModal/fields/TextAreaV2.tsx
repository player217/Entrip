import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '../../../../utils';
import { Icon } from '../../../primitives/Icon';

export interface TextAreaV2Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  resizable?: boolean;
  showCharCount?: boolean;
  maxCharCount?: number;
}

export const TextAreaV2 = forwardRef<HTMLTextAreaElement, TextAreaV2Props>(
  ({ 
    className, 
    error, 
    success,
    fullWidth = true, 
    resizable = true,
    disabled,
    showCharCount = false,
    maxCharCount,
    value,
    onChange,
    maxLength,
    ...props 
  }, ref) => {
    const [charCount, setCharCount] = useState(0);
    const maxChars = maxCharCount || maxLength;
    
    useEffect(() => {
      const count = String(value || '').length;
      setCharCount(count);
    }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (onChange) {
        onChange(e);
      }
    };
    
    const isNearLimit = maxChars && charCount > maxChars * 0.9;
    const isOverLimit = maxChars && charCount > maxChars;
    
    return (
      <div className="relative">
        <textarea
          ref={ref}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            // 기본 스타일 - 패딩 통일, font-normal로 변경
            "px-3 py-2 text-sm font-normal rounded-lg transition-all duration-200",
            "border shadow-sm",
            "placeholder:text-gray-400",
            "min-h-[100px]",
            fullWidth && "w-full",
            !resizable && "resize-none",
            
            // 상태별 스타일 - 그라데이션 배경
            disabled 
              ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-60"
              : error || isOverLimit
              ? "bg-gradient-to-br from-red-50 to-pink-50 border-red-400 text-gray-900 hover:border-red-500 hover:shadow-xl"
              : success
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 text-gray-900 hover:border-green-500 hover:shadow-xl"
              : "bg-white border-gray-300 text-gray-900 hover:border-gray-400",
            
            // 포커스 스타일 - 발광 효과
            !disabled && "focus:outline-none",
            !disabled && !error && !success && !isOverLimit && "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            !disabled && (error || isOverLimit) && "focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            !disabled && success && !isOverLimit && "focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
            
            // 아이콘 공간 확보
            (success || error) && "pr-10",
            showCharCount && "pb-8",
            
            className
          )}
          {...props}
        />
        
        {/* Status Icons */}
        <div className="absolute top-2 right-2">
          {success && !disabled && !isOverLimit && (
            <Icon 
              icon="heroicons:check-circle-solid" 
              className="w-5 h-5 text-green-500"
            />
          )}
          
          {(error || isOverLimit) && !disabled && (
            <Icon 
              icon="heroicons:exclamation-circle-solid" 
              className="w-5 h-5 text-red-500"
            />
          )}
        </div>
        
        {/* Character Count - 더 화려하게 */}
        {showCharCount && maxChars && (
          <div className={cn(
            "absolute bottom-2 right-2 text-xs font-medium transition-colors",
            isOverLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-gray-400"
          )}>
            {charCount} / {maxChars}
          </div>
        )}
      </div>
    );
  }
);

TextAreaV2.displayName = 'TextAreaV2';