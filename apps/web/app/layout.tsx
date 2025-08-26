import React from 'react'
import type { Metadata } from 'next'
import { QueryProvider } from '../src/providers/QueryProvider'
import { ToastContainer } from 'react-toastify'
import { Providers } from '../src/components/providers/Providers'
import { SWRProvider } from '../src/lib/swr'
import './globals.css'
import '@entrip/ui/global.css'
import 'react-toastify/dist/ReactToastify.css'
import '../src/styles/fonts.css'

export const metadata: Metadata = {
  title: 'Entrip - 여행사 통합 관리 시스템',
  description: '예약 관리, 결재, 계좌 관리, 통계를 위한 종합 솔루션',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">
        <QueryProvider>
          <SWRProvider>
            <Providers>
              {children}
            </Providers>
          </SWRProvider>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </QueryProvider>
      </body>
    </html>
  )
}
