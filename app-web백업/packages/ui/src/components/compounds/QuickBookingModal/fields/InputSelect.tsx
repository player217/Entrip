import React, { forwardRef } from 'react';
import { cn } from '../../../../utils';
import { Icon } from '../../../primitives/Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface InputSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  searchable?: boolean; // For future implementation
  onChange?: (value: string) => void;
}

export const InputSelect = forwardRef<HTMLSelectElement, InputSelectProps>(
  ({ 
    className, 
    options, 
    error, 
    success, 
    fullWidth = true, 
    placeholder,
    disabled,
    onChange,
    ...props 
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            // 기본 스타일 - 더 모던하고 미니멀한 디자인
            "h-8 px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-200",
            "border-2 border-gray-300 bg-white shadow-inner appearance-none cursor-pointer",
            fullWidth && "w-full",
            
            // 상태별 스타일 - 더 subtle한 색상
            disabled 
              ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
              : error
              ? "border-red-300 text-gray-900 hover:border-red-400 focus:border-red-500"
              : success
              ? "border-green-300 text-gray-900 hover:border-green-400 focus:border-green-500"
              : "border-gray-200 text-gray-900 hover:border-gray-300 focus:border-brand-primary",
            
            // 포커스 스타일 - 더 부드럽고 현대적인 shadow
            !disabled && "focus:outline-none focus:ring-2 focus:ring-offset-0",
            !disabled && !error && !success && "focus:ring-brand-primary/20",
            !disabled && error && "focus:ring-red-500/20",
            !disabled && success && "focus:ring-green-500/20",
            
            // 아이콘을 위한 여백
            "pr-10",
            
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option 
              key={`${option.value}-${index}`} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Dropdown icon - always inside input */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Icon 
            icon="heroicons:chevron-down" 
            className={cn(
              "w-4 h-4",
              disabled ? "text-gray-400" : "text-gray-600"
            )}
          />
        </div>
      </div>
    );
  }
);

InputSelect.displayName = 'InputSelect';