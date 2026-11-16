'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@entrip/shared/client';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TabContentManager } from './TabContentManager';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';

interface AppFrameProps {
  children: React.ReactNode;
  useTabSystem?: boolean;
  user?: { id: string; companyCode: string };
}

export default function AppFrame({ children, user }: AppFrameProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ownerId = useWorkspaceStore(state => state.ownerId);
  const bindOwner = useWorkspaceStore(state => state.bindOwner);
  const expectedOwner = user ? `${user.companyCode}:${user.id}` : null;
  useEffect(() => { bindOwner(expectedOwner); }, [bindOwner, expectedOwner]);
  const ready = expectedOwner !== null && ownerId === expectedOwner;
  return <div className="grid h-[100dvh] min-w-0 grid-rows-[70px_1fr] overflow-hidden bg-[#016B9F]">
    <Header className="z-50" useTabSystem onMenuToggle={() => setMobileMenuOpen(value => !value)} menuOpen={mobileMenuOpen} />
    <div className="relative flex min-h-0 min-w-0">
      {mobileMenuOpen && <button className="absolute inset-0 z-30 bg-black/30 md:hidden" aria-label="메뉴 닫기" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-2xl bg-white">
        {ready && <><WorkspaceTabs /><div className="min-h-0 min-w-0 flex-1"><TabContentManager>{children}</TabContentManager></div></>}
      </main>
    </div>
  </div>;
}
