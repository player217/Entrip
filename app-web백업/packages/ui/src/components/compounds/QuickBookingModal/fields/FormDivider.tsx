import { cn } from '../../../../utils'

interface FormDividerProps {
  title: string
  className?: string
}

export const FormDivider = ({ title, className }: FormDividerProps) => {
  return (
    <h3 className={cn("text-sm font-semibold text-gray-600 border-b pb-1", className)}>
      {title}
    </h3>
  )
}