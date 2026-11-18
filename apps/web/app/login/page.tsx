'use client';
import React, { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';

const companies = [
  { code: 'entrip', name: '엔트립 본사', domain: 'entrip.com' },
  { code: 'j1', name: 'J1 여행사', domain: 'j1.com' },
  { code: 'startour', name: '스타투어', domain: 'startour.com' },
  { code: 'happytravel', name: '해피트래블', domain: 'happytravel.com' },
];
const roles = [{ key: 'admin', label: '관리자' }, { key: 'manager', label: '매니저' }, { key: 'user', label: '직원' }];

const lanLogin = process.env.NEXT_PUBLIC_ENTRIP_LAN === 'true';

export default function LoginPage() {
  const login = useAuthStore(state => state.login);
  const [companyCode, setCompanyCode] = useState(lanLogin ? 'entrip' : 'j1');
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState(lanLogin ? '' : 'admin@j1.com');
  const [password, setPassword] = useState(lanLogin ? '' : 'pass1234');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function selectDemo(company: string, selectedRole: string) {
    setCompanyCode(company); setRole(selectedRole);
    setUsername(`${selectedRole}@${companies.find(item => item.code === company)?.domain}`);
    setPassword('pass1234'); setError(null);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      if (await login({ companyCode, username, password })) window.location.assign('/');
      else setError(useAuthStore.getState().error || '로그인에 실패했습니다.');
    } finally { setBusy(false); }
  }
  return <main className="entrip-login min-h-screen flex flex-col lg:flex-row bg-blue-50">
    <div className="entrip-print-only"><div className="entrip-report-brand"><strong>ENTRIP</strong></div><h1>로그인</h1><p>로그인이 필요한 화면입니다.</p></div>
    <section className="entrip-no-print bg-gradient-to-br from-blue-600 to-blue-800 text-white lg:flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
      <h1 className="text-4xl lg:text-6xl font-bold tracking-wider">ENTRIP</h1>
      <p className="mt-4 text-blue-100">여행 업무를 한곳에서</p>
    </section>
    <section className="entrip-no-print flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-blue-900">로그인</h2>
        <p className="mt-2 mb-6 text-sm text-gray-600">{lanLogin ? '회사 계정으로 로그인하세요.' : '회사와 역할을 선택한 후 로그인하세요.'}</p>
        <form onSubmit={submit} className="space-y-5">
          {lanLogin ? <label className="block text-sm font-semibold text-blue-900">회사 코드
            <input name="companyCode" autoComplete="organization" value={companyCode} onChange={event => setCompanyCode(event.target.value)} required disabled={busy} className="mt-2 w-full rounded-lg border border-blue-200 px-3 py-3" />
          </label> : <fieldset disabled={busy} className="rounded-lg bg-blue-50 p-4 space-y-3">
            <legend className="text-sm font-semibold text-blue-900">데모 계정 선택</legend>
            <label className="block text-sm font-medium">회사
              <select aria-label="회사 선택" value={companyCode} onChange={event => selectDemo(event.target.value, role)} className="mt-1 w-full rounded border border-blue-200 bg-white p-2">
                {companies.map(company => <option key={company.code} value={company.code}>{company.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">역할
              <select aria-label="역할 선택" value={role} onChange={event => selectDemo(companyCode, event.target.value)} className="mt-1 w-full rounded border border-blue-200 bg-white p-2">
                {roles.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <p className="text-xs text-gray-500">초기 데모 계정 비밀번호: pass1234</p>
          </fieldset>}
          <label className="block text-sm font-semibold text-blue-900">아이디 (이메일)
            <input name="username" autoComplete="username" type="email" value={username} onChange={event => setUsername(event.target.value)} required disabled={busy} className="mt-2 w-full rounded-lg border border-blue-200 px-3 py-3" />
          </label>
          <label className="block text-sm font-semibold text-blue-900">비밀번호
            <input name="password" autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} className="mt-2 w-full rounded-lg border border-blue-200 px-3 py-3" />
          </label>
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-orange-500 px-4 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50">{busy ? '로그인 중...' : '로그인'}</button>
        </form>
      </div>
    </section>
  </main>;
}
