import { ReactNode } from 'react'
import { cn } from '../../../../utils'

interface FieldProps {
  children: ReactNode
  colSpan?: number
  className?: string
  responsive?: boolean // Enable responsive behavior
}

export const Field = ({ children, colSpan = 12, className, responsive = true }: FieldProps) => {
  // Responsive classes mapping
  const responsiveClasses: Record<number, string> = {
    1: 'col-span-12 xl:col-span-1',
    2: 'col-span-12 xl:col-span-2',
    3: 'col-span-12 xl:col-span-3',
    4: 'col-span-12 xl:col-span-4',
    5: 'col-span-12 xl:col-span-5',
    6: 'col-span-12 xl:col-span-6',
    7: 'col-span-12 xl:col-span-7',
    8: 'col-span-12 xl:col-span-8',
    9: 'col-span-12 xl:col-span-9',
    10: 'col-span-12 xl:col-span-10',
    11: 'col-span-12 xl:col-span-11',
    12: 'col-span-12',
  }
  
  // Non-responsive classes
  const staticClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  }
  
  const classes = responsive ? responsiveClasses[colSpan] : staticClasses[colSpan]
  
  return (
    <div 
      className={cn(classes || 'col-span-12', className)}
      data-col-span={colSpan}
      data-classes={classes}
    >
      {children}
    </div>
  )
}