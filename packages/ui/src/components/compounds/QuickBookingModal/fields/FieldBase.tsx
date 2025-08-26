import React from 'react';
import { cn } from '../../../../utils';

export interface FieldBaseProps {
  label: string;
  id: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldBase({
  label,
  id,
  required = false,
  helperText,
  error,
  children,
  className
}: FieldBaseProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  
  return (
    <div className={cn("w-full", className)}>
      <label 
        htmlFor={id}
        className={cn(
          "mb-0.5 block text-sm font-medium",
          error ? "text-red-600" : "text-gray-700"
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Children with aria attributes */}
      {React.isValidElement(children) && 
        React.cloneElement(children as React.ReactElement<any>, {
          'aria-invalid': !!error,
          'aria-describedby': error ? errorId : helperText ? helperId : undefined,
        })
      }
      
      {/* Helper text or error message */}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-normal text-red-500" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1 text-xs font-normal text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}