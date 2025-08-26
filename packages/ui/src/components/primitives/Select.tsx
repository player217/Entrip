import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  hint?: string; // alias for helperText
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    hint, 
    fullWidth = false, 
    options,
    placeholder,
    onChange,
    ...props 
  }, ref) => {
    const displayHelperText = helperText || hint;
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };
    
    return (
      <div className={clsx('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={props.id}
            className="mb-1 text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={props.id}
          className={clsx(
            'px-3 py-2 border rounded-md text-base transition-colors appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            'bg-white cursor-pointer',
            error
              ? 'border-danger text-danger'
              : 'border-gray-300 hover:border-gray-400',
            className
          )}
          onChange={handleChange}
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

Select.displayName = 'Select';