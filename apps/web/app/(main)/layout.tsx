'use client'

import React from 'react'
import { Inter } from 'next/font/google'
import AppFrame from '../../src/components/layout/AppFrame'
import { LogViewer } from '../../src/components/debug/LogViewer'
import { ToastProvider } from '../../src/providers/ToastProvider'
import { MessengerContainer } from '../../src/components/messenger/MessengerContainer'

const inter = Inter({ subsets: ['latin'] })

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className={`${inter.className} font-inter`}>
        <AppFrame>{children}</AppFrame>
        <MessengerContainer />
      </div>
      <LogViewer />
    </ToastProvider>
  )
}