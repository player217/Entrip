'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@entrip/ui';
import { useAuthStore, useUserRole } from '@/lib/auth-store';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const { user, logout } = useAuthStore();
  const { isAdmin, isManager, role } = useUserRole();
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.name.charAt(user.name.length - 2)}
          </span>
        </div>
        
        {/* User Info */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.companyCode}</p>
        </div>
        
        {/* Dropdown Icon */}
        <Icon 
          icon="ph:caret-down" 
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.name.charAt(user.name.length - 2)}
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
                // TODO: Open profile modal
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
                  // TODO: Navigate to admin panel
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon icon="ph:gear" className="w-4 h-4 mr-3" />
                시스템 관리
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open help modal
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon icon="ph:question" className="w-4 h-4 mr-3" />
              도움말
            </button>

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