import React, { forwardRef } from 'react';
import * as Select from '@radix-ui/react-select';
import { cn } from '../../../../utils';
import { Icon } from '../../../primitives/Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface InputSelectV2Props {
  options: SelectOption[];
  error?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const InputSelectV2 = forwardRef<HTMLButtonElement, InputSelectV2Props>(
  ({ 
    className, 
    options, 
    error, 
    success, 
    fullWidth = true, 
    placeholder = "선택하세요",
    disabled,
    value,
    onChange,
    ...props 
  }, ref) => {
    // Handle value being undefined or null
    const currentValue = value || '';
    
    return (
      <Select.Root value={currentValue} onValueChange={onChange} disabled={disabled}>
        <Select.Trigger
          ref={ref}
          className={cn(
            // 기본 스타일 - 높이 44px로 통일, 정렬 수정
            "h-11 px-3 py-2 text-sm font-normal rounded-lg transition-all duration-200",
            "border shadow-sm",
            "flex items-center justify-between gap-2",
            fullWidth && "w-full",
            
            // 상태별 스타일 - 더 선명한 색상과 그라데이션
            disabled 
              ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-60"
              : error
              ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-400 text-gray-900 hover:border-red-500 hover:shadow-xl"
              : success
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 text-gray-900 hover:border-green-500 hover:shadow-xl"
              : "bg-white border-gray-300 text-gray-900 hover:border-gray-400",
            
            // 향상된 포커스 스타일
            !disabled && "focus:outline-none transform-gpu",
            !disabled && !error && !success && "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            !disabled && error && "focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            !disabled && success && "focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
            
            className
          )}
          {...props}
        >
          <Select.Value placeholder={placeholder} className="text-gray-900 flex-1 text-left" />
          
          <div className="flex items-center gap-2">
            {/* Success checkmark */}
            {success && !disabled && (
              <Icon 
                icon="heroicons:check-circle-solid" 
                className="w-5 h-5 text-green-500"
              />
            )}
            
            {/* Error icon */}
            {error && !disabled && (
              <Icon 
                icon="heroicons:exclamation-circle-solid" 
                className="w-5 h-5 text-red-500"
              />
            )}
            
            {/* Dropdown icon */}
            <Select.Icon asChild>
              <Icon 
                icon="heroicons:chevron-down" 
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  disabled ? "text-gray-400" : "text-gray-600"
                )}
              />
            </Select.Icon>
          </div>
        </Select.Trigger>
        
        <Select.Portal>
          <Select.Content 
            position="popper" 
            sideOffset={5}
            className={cn(
              "relative z-50 min-w-[8rem] overflow-hidden",
              "bg-white rounded-lg shadow-lg",
              "border border-gray-200",
              "animate-in fade-in-0 zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2",
              "data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2",
              "data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              <Icon icon="heroicons:chevron-up" className="w-4 h-4" />
            </Select.ScrollUpButton>
            
            <Select.Viewport className="p-1 h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]">
              {options.map((option, index) => (
                <Select.Item
                  key={`${option.value}-${index}`}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm rounded-md",
                    "select-none cursor-pointer outline-none",
                    "transition-colors duration-150",
                    "hover:bg-gray-100",
                    "focus:bg-blue-50 focus:text-blue-900",
                    "data-[disabled]:text-gray-400 data-[disabled]:cursor-not-allowed",
                    "data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900"
                  )}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-0 w-6 inline-flex items-center justify-center">
                    <Icon icon="heroicons:check" className="w-4 h-4 text-blue-600" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
            
            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
              <Icon icon="heroicons:chevron-down" className="w-4 h-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    );
  }
);

InputSelectV2.displayName = 'InputSelectV2';