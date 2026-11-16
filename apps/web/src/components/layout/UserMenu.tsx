'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@entrip/ui';
import { useAuthStore, useUserRole } from '../../lib/auth-store';
import { useWorkspaceStore } from '@entrip/shared/client';
import { useTabRouter } from '@/hooks/useTabRouter';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const { user, logout } = useAuthStore();
  const { isAdmin } = useUserRole();
  const { navigateInTab } = useTabRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    if (useWorkspaceStore.getState().tabs.some(tab => tab.state?.isDirty) && !window.confirm('저장하지 않은 작업이 있습니다. 로그아웃하시겠습니까?')) return;
    setIsOpen(false);
    logout();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '관리자';
      case 'MANAGER':
        return '팀장';
      default:
        return '직원';
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-label="사용자 메뉴" aria-expanded={isOpen}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-brand-primary text-sm font-medium">
            {user.name.slice(-1)}
          </span>
        </div>
        
        {/* User Info */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-white/70">{user.companyCode}</p>
        </div>
        
        {/* Dropdown Icon */}
        <Icon 
          icon="ph:caret-down" 
          className={`w-4 h-4 text-white transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999]">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.name.slice(-1)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getRoleText(user.role)}
                  </span>
                  <span className="text-xs text-gray-400">{user.department}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigateInTab('/settings');
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon icon="ph:user" className="w-4 h-4 mr-3" />
              프로필 설정
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigateInTab('/settings');
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon icon="ph:gear" className="w-4 h-4 mr-3" />
                시스템 관리
              </button>
            )}

            <button
              onClick={() => {
                setShowHelp(value => !value);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon icon="ph:question" className="w-4 h-4 mr-3" />
              도움말
            </button>
            {showHelp && <p className="mx-3 rounded bg-blue-50 p-3 text-xs leading-relaxed text-gray-600">캘린더에서 날짜를 눌러 예약을 등록하세요. + 버튼이나 Ctrl / ⌘ + 메뉴 클릭으로 새 작업 탭을 열 수 있습니다. 각 탭의 입력은 따로 보관됩니다.</p>}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Icon icon="ph:sign-out" className="w-4 h-4 mr-3" />
              로그아웃
            </button>
          </div>

          {/* Footer Info */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              마지막 로그인: {user.lastLoginAt ? 
                new Date(user.lastLoginAt).toLocaleString('ko-KR') : 
                '정보 없음'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}