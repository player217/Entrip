'use client'

import React from 'react'
import { Icon } from '@entrip/ui'
import Image from 'next/image'
import HeaderExchange from './HeaderExchange'
import { UserMenu } from './UserMenu'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  className?: string
  useTabSystem?: boolean
}

export function Header({ className = '', useTabSystem = false }: HeaderProps) {
  const router = useRouter()

  return (
    <header className={clsx('flex h-[70px] bg-[#016B9F] text-white items-center px-6 gap-6', useTabSystem && 'supports-tabs', className)}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image
          src="/ciwhite.png"
          alt="Entrip"
          width={40}
          height={40}
          priority
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
        />
        <Image
          src="/citextwhite.png"
          alt="Entrip"
          width={120}
          height={24}
          priority
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>

      {/* Centered exchange line */}
      <div className="flex-1 flex justify-center">
        <div className="rounded-full bg-white/10 px-4 py-1 backdrop-blur-sm border border-white/15">
          <HeaderExchange />
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-2">
        <IconButton
          icon="ph:map-trifold-bold"
          title="지도"
          onClick={() => window.open('https://maps.google.com', '_blank')}
        />
        <IconButton
          icon="ph:airplane-takeoff-bold"
          title="항공편 조회"
          onClick={() => router.push('/flight-schedule')}
        />
        <IconButton icon="ph:bell-bold" title="알림" badge />
        <IconButton icon="ph:envelope-bold" title="메일" />
        <IconButton icon="ph:chat-circle-bold" title="메신저" />
        <IconButton icon="ph:gear-bold" title="설정" />
        <div className="ml-2 border-l border-white/20 pl-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

interface IconButtonProps {
  icon: string
  title: string
  badge?: boolean
  onClick?: () => void
}

const IconButton: React.FC<IconButtonProps> = ({ icon, title, badge, onClick }) => (
  <button
    className="relative p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
    title={title}
    onClick={onClick}
  >
    <Icon icon={icon} className="w-[26px] h-[26px]" />
    {badge && (
      <span className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
    )}
  </button>
)
