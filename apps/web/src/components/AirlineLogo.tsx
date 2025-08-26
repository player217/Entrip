'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plane } from 'lucide-react';
import { logger } from '@entrip/shared';

interface AirlineLogoProps {
  airline: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 }
};

export default function AirlineLogo({ airline, size = 'md', className = '' }: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const dimensions = sizeMap[size];
  
  // 로컬 로고 경로
  const logoPath = `/logos/${encodeURIComponent(airline)}.png`;
  
  if (hasError) {
    // Fallback to placeholder
    return (
      <div 
        className={`inline-flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Plane className="text-gray-400" size={dimensions.width * 0.6} />
      </div>
    );
  }
  
  return (
    <div className={`relative inline-block ${className}`}>
      <Image
        src={logoPath}
        alt={`${airline} logo`}
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        onError={() => {
          logger.error('[AirlineLogo]', `Failed to load: ${logoPath}`);
          setHasError(true);
        }}
        onLoad={() => {
          logger.info('[AirlineLogo]', `✔️ Loaded: ${logoPath}`);
        }}
      />
    </div>
  );
}