import React from 'react';
import { Button } from '../../../primitives/Button';
import { Icon } from '../../../primitives/Icon';
import { cn } from '../../../../utils';

export interface RepeaterProps {
  title: string;
  addButtonText?: string;
  onAdd: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface RepeaterItemProps {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
  className?: string;
  removable?: boolean;
}

export function Repeater({
  title,
  addButtonText = '추가',
  onAdd,
  children,
  className
}: RepeaterProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      
      <div className="space-y-3">
        {children}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="w-full text-brand-primary bg-[#FBF9F5] hover:bg-[#F5F2EC] border border-dashed border-brand-primary/30 hover:border-brand-primary/50 rounded-lg py-2"
      >
        <Icon icon="heroicons:plus-circle" className="w-4 h-4 mr-2" />
        {addButtonText}
      </Button>
    </div>
  );
}

export function RepeaterItem({
  title,
  onRemove,
  children,
  className,
  removable = true
}: RepeaterItemProps) {
  return (
    <div 
      className={cn(
        "bg-gray-50/50 border border-gray-200 rounded-lg p-2.5 space-y-1",
        "transition-all duration-200 hover:border-gray-300 hover:shadow-sm",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-1"
          >
            <Icon icon="heroicons:x-mark" className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {children}
    </div>
  );
}