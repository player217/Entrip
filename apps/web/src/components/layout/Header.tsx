'use client';

import React from 'react';
import { Icon } from '@entrip/ui';
import Image from 'next/image';
import HeaderExchange from './HeaderExchange';
import { UserMenu } from './UserMenu';
import { clsx } from 'clsx';
import { useTabRouter } from '@/hooks/useTabRouter';

interface HeaderProps {
  className?: string;
  useTabSystem?: boolean;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function Header({ className = '', useTabSystem = false, onMenuToggle, menuOpen }: HeaderProps) {
  const { navigateInTab } = useTabRouter();
  return <header className={clsx('flex h-[70px] min-w-0 items-center gap-2 bg-[#016B9F] px-3 text-white sm:gap-4 sm:px-5', useTabSystem && 'supports-tabs', className)}>
    <button className="rounded p-2 hover:bg-white/10 md:hidden" aria-label="메뉴 열기" aria-expanded={menuOpen} onClick={onMenuToggle}><Icon icon="ph:list-bold" className="h-6 w-6" /></button>
    <button className="flex shrink-0 items-center gap-2" aria-label="Entrip 대시보드" onClick={() => navigateInTab('/')}>
      <Image src="/ciwhite.png" alt="" width={36} height={36} priority className="h-9 w-9 object-contain" />
      <Image src="/citextwhite.png" alt="Entrip" width={104} height={24} priority className="hidden h-6 w-[104px] object-contain sm:block" />
    </button>
    <div className="hidden min-w-0 flex-1 justify-center xl:flex"><div className="rounded-full border border-white/15 bg-white/10 px-3 py-1"><HeaderExchange /></div></div>
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <span className="hidden lg:block"><IconButton icon="ph:map-trifold-bold" title="지도" onClick={() => window.open('https://maps.google.com', '_blank', 'noopener,noreferrer')} /></span>
      <IconButton icon="ph:airplane-takeoff-bold" title="항공편 조회" onClick={() => navigateInTab('/flight-schedule')} />
      <span className="hidden sm:block"><IconButton icon="ph:envelope-bold" title="메일" onClick={() => navigateInTab('/mail')} /></span>
      <IconButton icon="ph:chat-circle-bold" title="메신저" onClick={() => navigateInTab('/chat')} />
      <span className="hidden lg:block"><IconButton icon="ph:gear-bold" title="설정" onClick={() => navigateInTab('/settings')} /></span>
      <div className="ml-1 border-l border-white/20 pl-1"><UserMenu /></div>
    </div>
  </header>;
}

function IconButton({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return <button className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/10" title={title} aria-label={title} onClick={onClick}><Icon icon={icon} className="h-6 w-6" /></button>;
}
