import React from 'react'
import { Providers } from '@/components/providers/Providers'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      {children}
    </Providers>
  )
}
