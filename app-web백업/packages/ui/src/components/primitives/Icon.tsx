// packages/ui/primitives/Icon.tsx
'use client'

import React from 'react';
import { Icon as Iconify } from '@iconify/react';
import type { IconProps } from '@iconify/react';

/**
 * 프로젝트의 모든 아이콘을 관리하는 중앙 컴포넌트입니다.
 * @param props - Iconify의 모든 prop을 지원합니다. (예: icon, width, height, className)
 * @example <Icon icon="ph:heart-bold" className="text-red-500" />
 */
export const Icon = (props: IconProps) => {
  return <Iconify {...props} />;
};
