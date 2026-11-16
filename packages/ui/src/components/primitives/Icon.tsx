// packages/ui/primitives/Icon.tsx
'use client'

import React from 'react';
import { Icon as Iconify } from '@iconify/react';
import type { IconProps, IconifyIcon } from '@iconify/react';
import localIcons from './local-icons.json';

/**
 * 프로젝트의 모든 아이콘을 관리하는 중앙 컴포넌트입니다.
 * @param props - Iconify의 모든 prop을 지원합니다. (예: icon, width, height, className)
 * @example <Icon icon="ph:heart-bold" className="text-red-500" />
 */
export const Icon = (props: IconProps) => {
  const icon = typeof props.icon === 'string' ? (localIcons as Record<string, IconifyIcon>)[props.icon] || props.icon : props.icon;
  return <Iconify {...props} icon={icon} />;
};
