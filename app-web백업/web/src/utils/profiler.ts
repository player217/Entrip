import { Profiler as ReactProfiler, ProfilerOnRenderCallback } from 'react';
import { logger } from '@entrip/shared';

interface ProfileData {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

const profileData: ProfileData[] = [];

export const onRenderCallback: ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  const data: ProfileData = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };
  
  profileData.push(data);
  
  // 콘솔에 성능 데이터 출력
  if (actualDuration > 16) { // 60fps = 16.67ms per frame
    logger.warn('[Profiler]', `Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms`);
  }
};

export const startProfiling = () => {
  logger.info('[Profiler]', 'profile-start');
  profileData.length = 0; // Clear previous data
};

export const stopProfiling = () => {
  logger.info('[Profiler]', 'profile-stop');
  
  // 성능 분석 결과
  const totalRenders = profileData.length;
  const avgDuration = profileData.reduce((sum, d) => sum + d.actualDuration, 0) / totalRenders;
  const slowRenders = profileData.filter(d => d.actualDuration > 16.67).length;
  
  logger.info('[Profiler]', `Total renders: ${totalRenders}`);
  logger.info('[Profiler]', `Average duration: ${avgDuration.toFixed(2)}ms`);
  logger.info('[Profiler]', `Slow renders (>16.67ms): ${slowRenders} (${(slowRenders/totalRenders*100).toFixed(1)}%)`);
  
  // JSON 파일로 저장
  const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profile-${Date.now()}.json`;
  a.click();
  
  logger.info('[Profiler]', `Profile data saved to profile-${Date.now()}.json`);
  
  return profileData;
};

export { ReactProfiler };