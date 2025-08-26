import { ReactNode } from 'react'
import { cn } from '../../../../utils'

interface FormCardProps {
  children: ReactNode
  className?: string
}

export const FormCard = ({ children, className }: FormCardProps) => {
  return (
    <div className={cn(
      'bg-white/50 rounded-lg p-4',
      className
    )}>
      {children}
    </div>
  )
}