'use client'

import { ReactNode, useEffect } from 'react'
import { logger } from '@entrip/shared'
import { AuthProvider } from './AuthProvider'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { SessionProvider } from 'next-auth/react'

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 60 * 1000, // 1분
//       refetchOnWindowFocus: false,
//     },
//   },
// })

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
    ) {
      import('../../mocks').then(() => {
        logger.info('App', 'MSW initialization started')
      })
    }
  }, [])

  return (
    <AuthProvider>
      {/* <QueryClientProvider client={queryClient}> */}
        {/* <SessionProvider> */}
          {children}
        {/* </SessionProvider> */}
      {/* </QueryClientProvider> */}
    </AuthProvider>
  )
}
