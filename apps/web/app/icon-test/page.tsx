'use client'

import React from 'react'
import { Icon } from '@entrip/ui'

export default function IconTestPage() {
  const testIcons = [
    { name: 'Map', icon: 'ph:map-trifold-bold' },
    { name: 'Flight', icon: 'ph:airplane-takeoff-bold' },
    { name: 'Notification', icon: 'ph:bell-bold' },
    { name: 'Mail', icon: 'ph:envelope-bold' },
    { name: 'Messenger', icon: 'ph:chat-circle-bold' },
    { name: 'Settings', icon: 'ph:gear-bold' },
    { name: 'Plus', icon: 'ph:plus' },
    { name: 'X', icon: 'ph:x' },
    { name: 'Globe', icon: 'ph:globe-bold' },
  ]

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-6">Icon CSP Test Page</h1>
      <p className="mb-4 text-gray-600">
        This page tests if Iconify icons are loading correctly after the CSP fix.
      </p>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        {testIcons.map((item) => (
          <div key={item.icon} className="flex flex-col items-center p-4 border rounded-lg">
            <Icon icon={item.icon} className="w-[26px] h-[26px] mb-2 text-blue-600" />
            <span className="text-sm text-gray-700">{item.name}</span>
            <code className="text-xs text-gray-500 mt-1">{item.icon}</code>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Debug Information:</h2>
        <p className="text-sm text-gray-600 mb-2">
          If icons are not visible, check the browser console for CSP errors.
        </p>
        <p className="text-sm text-gray-600">
          Icons should appear as 26px × 26px blue icons with their names below.
        </p>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2">Header Icons Test (same as used in header):</h3>
          <div className="flex gap-2 p-3 bg-blue-600 rounded-lg">
            <Icon icon="ph:map-trifold-bold" className="w-[26px] h-[26px] text-white" />
            <Icon icon="ph:airplane-takeoff-bold" className="w-[26px] h-[26px] text-white" />
            <Icon icon="ph:bell-bold" className="w-[26px] h-[26px] text-white" />
            <Icon icon="ph:envelope-bold" className="w-[26px] h-[26px] text-white" />
            <Icon icon="ph:chat-circle-bold" className="w-[26px] h-[26px] text-white" />
            <Icon icon="ph:gear-bold" className="w-[26px] h-[26px] text-white" />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Main App
        </button>
      </div>
    </div>
  )
}