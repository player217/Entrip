'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@entrip/ui';
import { LoginRequest } from '@entrip/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

interface LoginFormData {
  companyCode: string;
  username: string;  
  password: string;
}

// Demo accounts for quick testing - 원클릭 자동 로그인
const DEMO_DEFAULT_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || 'pass1234';
const DEMO_DEFAULT_COMPANY = process.env.DEMO_DEFAULT_COMPANY || 'ENTRIP_MAIN';

const DEMO_ACCOUNTS = [
  { label: '관리자', companyCode: DEMO_DEFAULT_COMPANY, username: 'admin', password: DEMO_DEFAULT_PASSWORD, role: 'ADMIN' },
  { label: '매니저1', companyCode: DEMO_DEFAULT_COMPANY, username: 'manager1', password: DEMO_DEFAULT_PASSWORD, role: 'MANAGER' },
  { label: '매니저2', companyCode: DEMO_DEFAULT_COMPANY, username: 'manager2', password: DEMO_DEFAULT_PASSWORD, role: 'MANAGER' },
  { label: '직원1', companyCode: DEMO_DEFAULT_COMPANY, username: 'user1', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
  { label: '직원2', companyCode: DEMO_DEFAULT_COMPANY, username: 'user2', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
  { label: '직원3', companyCode: DEMO_DEFAULT_COMPANY, username: 'user3', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
  { label: '직원4', companyCode: DEMO_DEFAULT_COMPANY, username: 'user4', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
  { label: '직원5', companyCode: DEMO_DEFAULT_COMPANY, username: 'user5', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
  { label: '게스트1', companyCode: DEMO_DEFAULT_COMPANY, username: 'guest1', password: DEMO_DEFAULT_PASSWORD, role: 'GUEST' },
  { label: '게스트2', companyCode: DEMO_DEFAULT_COMPANY, username: 'guest2', password: DEMO_DEFAULT_PASSWORD, role: 'GUEST' },
  // J1 여행사 계정들
  { label: 'J1관리자', companyCode: 'j1', username: 'admin', password: DEMO_DEFAULT_PASSWORD, role: 'ADMIN' },
  { label: 'J1매니저', companyCode: 'j1', username: 'manager1', password: DEMO_DEFAULT_PASSWORD, role: 'MANAGER' },
  { label: 'J1직원', companyCode: 'j1', username: 'user1', password: DEMO_DEFAULT_PASSWORD, role: 'USER' },
];

console.log('🔍 DEMO_ACCOUNTS length:', DEMO_ACCOUNTS.length, 'accounts loaded');

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const [formData, setFormData] = useState<LoginFormData>({
    companyCode: 'j1',
    username: 'admin',
    password: DEMO_DEFAULT_PASSWORD
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const selectDemoAccount = async (index: number) => {
    const account = DEMO_ACCOUNTS[index];
    if (!account) return;
    
    setSelectedDemo(index);
    if (error) setError(null);
    setIsLoading(true);

    try {
      // 즉시 로그인 수행
      const success = await login({
        companyCode: account.companyCode,
        username: account.username,
        password: account.password
      });
      
      if (success) {
        // Store userId separately for messenger
        const user = useAuthStore.getState().user;
        if (user?.id) {
          localStorage.setItem('userId', user.id);
        }
        
        // Small delay to ensure auth state is fully updated
        setTimeout(() => {
          router.push('/');
        }, 100);
      } else {
        // Get error from auth store
        const authError = useAuthStore.getState().error;
        setError(authError || '로그인에 실패했습니다.');
        // 실패 시 폼 데이터도 채워줌
        setFormData({
          companyCode: account.companyCode,
          username: account.username,
          password: account.password
        });
      }
    } catch (error) {
      console.error('Demo login error:', error);
      setError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      // 실패 시 폼 데이터도 채워줌
      setFormData({
        companyCode: account.companyCode,
        username: account.username,
        password: account.password
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Use auth store login method
      const success = await login(formData as LoginRequest);
      
      if (success) {
        // Store userId separately for messenger
        const user = useAuthStore.getState().user;
        if (user?.id) {
          localStorage.setItem('userId', user.id);
        }
        
        // Small delay to ensure auth state is fully updated
        setTimeout(() => {
          router.push('/');
        }, 100);
      } else {
        // Get error from auth store
        const authError = useAuthStore.getState().error;
        setError(authError || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Brand Image with Blue Theme */}
      <div className="flex-1 relative bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h1 className="text-6xl font-bold tracking-wider">ENTRIP</h1>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-blue-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-blue-900 mb-2">로그인</h2>
              <p className="text-gray-600">계정 정보를 입력해주세요</p>
            </div>

            {/* Demo Account Selector */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">데모 계정 선택:</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectDemoAccount(index)}
                    disabled={isLoading}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedDemo === index 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-100'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading && selectedDemo === index ? '로그인 중...' : account.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Company Code */}
              <div>
                <label htmlFor="companyCode" className="block text-sm font-semibold text-blue-900 mb-2">
                  회사 코드
                </label>
                <input
                  id="companyCode"
                  name="companyCode"
                  type="text"
                  required
                  value={formData.companyCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-blue-50 text-blue-900 font-medium"
                  placeholder="j1"
                  disabled={isLoading}
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-blue-900 mb-2">
                  아이디
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-blue-50 text-blue-900 font-medium"
                  placeholder="admin"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-blue-900 mb-2">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-blue-50 text-blue-900 font-medium"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button - Orange */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 shadow-lg"
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}