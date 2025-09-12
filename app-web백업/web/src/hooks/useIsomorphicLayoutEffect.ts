import { useEffect, useLayoutEffect } from 'react'

// SSR 환경에서 useLayoutEffect 사용 시 경고를 방지하고
// 클라이언트에서는 useLayoutEffect를 사용하여 paint 전에 실행
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect