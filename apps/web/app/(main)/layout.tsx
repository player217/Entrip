'use client'

import React from 'react'
import { Inter } from 'next/font/google'
import { redirect } from 'next/navigation'
import useSWR from 'swr'
import AppFrame from '../../src/components/layout/AppFrame'
import { LogViewer } from '../../src/components/debug/LogViewer'
import { ToastProvider } from '../../src/providers/ToastProvider'
import { MessengerContainer } from '../../src/components/messenger/MessengerContainer'

const inter = Inter({ subsets: ['latin'] })

// Auth-aware fetcher for user verification
const fetcher = (url: string) =>
  fetch(url, {
    credentials: 'include', // Send cookies
    cache: 'no-store',      // Don't cache auth-sensitive requests
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Authentication failed')
    }
    return res.json()
  })

// Loading component
function AuthLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">인증 확인 중...</p>
      </div>
    </div>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verify authentication status on client-side
  const { data: user, isLoading, error } = useSWR('/api/auth/verify', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  })

  // Show loading spinner while verifying auth
  if (isLoading) {
    return <AuthLoader />
  }

  // Redirect to login if authentication failed
  if (error || !user) {
    redirect('/login')
  }

  // Render authenticated layout
  return (
    <ToastProvider>
      <div className={`${inter.className} font-inter`}>
        <AppFrame user={user.user}>{children}</AppFrame>
        <MessengerContainer />
      </div>
      <LogViewer />
    </ToastProvider>
  )
}