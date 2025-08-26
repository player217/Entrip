'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useWorkspaceStore } from '@entrip/shared/client'

/**
 * 탭별 상태를 관리하는 Hook
 * 각 탭이 독립적인 상태를 유지할 수 있도록 지원
 */
export function useTabState<T = any>(initialState?: T) {
  const { activeTabKey, tabs, updateTabState } = useWorkspaceStore()
  const [localState, setLocalState] = useState<T | undefined>(initialState)
  const previousTabKey = useRef(activeTabKey)
  
  // 현재 활성 탭 찾기
  const activeTab = tabs.find(t => t.key === activeTabKey)
  
  // 탭 전환 시 상태 복원
  useEffect(() => {
    if (activeTabKey !== previousTabKey.current) {
      // 이전 탭의 상태 저장
      if (previousTabKey.current) {
        updateTabState(previousTabKey.current, { 
          componentState: localState 
        })
      }
      
      // 새 탭의 상태 복원
      if (activeTab?.state?.componentState) {
        setLocalState(activeTab.state.componentState)
      } else {
        setLocalState(initialState)
      }
      
      previousTabKey.current = activeTabKey
    }
  }, [activeTabKey, activeTab?.state?.componentState]) // localState 제거하여 무한 루프 방지
  
  // 상태 업데이트 함수
  const setState = useCallback((newState: T | ((prev: T | undefined) => T)) => {
    setLocalState(prev => {
      const nextState = typeof newState === 'function' 
        ? (newState as Function)(prev) 
        : newState
      
      // 즉시 탭 상태에도 저장
      if (activeTabKey) {
        updateTabState(activeTabKey, { 
          componentState: nextState 
        })
      }
      
      return nextState
    })
  }, [activeTabKey, updateTabState])
  
  return [localState, setState] as const
}

/**
 * 탭별 스크롤 위치를 관리하는 Hook
 */
export function useTabScroll(elementRef: React.RefObject<HTMLElement>) {
  const { activeTabKey, tabs, updateTabState } = useWorkspaceStore()
  const previousTabKey = useRef(activeTabKey)
  
  const activeTab = tabs.find(t => t.key === activeTabKey)
  
  useEffect(() => {
    if (!elementRef.current) return
    
    const element = elementRef.current
    
    // 탭 전환 시 스크롤 위치 복원
    if (activeTabKey !== previousTabKey.current) {
      if (activeTab?.state?.scrollPosition !== undefined) {
        element.scrollTop = activeTab.state.scrollPosition
      } else {
        element.scrollTop = 0
      }
      previousTabKey.current = activeTabKey
    }
    
    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      if (activeTabKey) {
        updateTabState(activeTabKey, { 
          scrollPosition: element.scrollTop 
        })
      }
    }
    
    element.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [activeTabKey, activeTab, updateTabState, elementRef])
}

/**
 * 탭별 폼 데이터를 관리하는 Hook
 */
export function useTabForm<T extends Record<string, any>>(
  initialValues: T
) {
  const [formData, setFormData] = useTabState(initialValues)
  
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    } as T))
  }, [setFormData])
  
  const resetForm = useCallback(() => {
    setFormData(initialValues)
  }, [setFormData, initialValues])
  
  return {
    formData,
    updateField,
    resetForm,
    setFormData
  }
}