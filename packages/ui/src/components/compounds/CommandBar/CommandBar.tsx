'use client';

import React from 'react';
import Image from 'next/image';
// import { Icon } from '../../primitives/Icon'; // TODO: Use for command bar icons

interface CommandBarProps {
  user?: {
    name?: string;
    company?: string;
  };
  exchangeRates?: {
    USD: number;
    EUR: number;
    JPY: number;
  };
}

export const CommandBar: React.FC<CommandBarProps> = () => {
  return (
    <>
      {/* 로고 영역 */}
      <div className="flex items-center gap-3">
        <Image src="/ciwhite.png" alt="Entrip mark" width={32} height={32} className="h-9 w-auto" />
        <Image src="/citextwhite.png" alt="Entrip wordmark" width={100} height={24} className="h-6 w-auto" />
      </div>
    </>
  );
};

// IconButton component removed - not used in current implementation
// To re-enable: uncomment below and use in render
/*
interface IconButtonProps {
  icon: string;
  title: string;
  badge?: boolean;
  onClick?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  title,
  badge,
  onClick 
}) => (
  <button 
    className="relative p-2.5 text-header-icon hover:text-header-iconHover transition-all duration-200 rounded-lg hover:bg-white/10"
    title={title}
    onClick={onClick}
  >
    <Icon icon={icon} className="w-6 h-6" />
    {badge && (
      <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-brand-500 rounded-full animate-pulse" />
    )}
  </button>
);
*/

export default CommandBar;
