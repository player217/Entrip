import { notFound } from 'next/navigation'
import IconTestContent from './IconTestContent'

export default function IconTestPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <IconTestContent />
}
