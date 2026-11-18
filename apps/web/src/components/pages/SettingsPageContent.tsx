'use client';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { messengerRequest } from '@/lib/messenger-store';
import printStyles from './records-print.module.css';

interface Employee { id: string; name: string; email: string; department: string | null; role: 'ADMIN' | 'MANAGER' | 'USER'; isActive: boolean; createdAt: string }
const roles = { ADMIN: '관리자', MANAGER: '매니저', USER: '직원' };
const initialForm = { name: '', email: '', department: '', password: '', role: 'USER' as Employee['role'] };

export default function SettingsPageContent() {
  const scrollHelpId = useId();
  const user = useAuthStore(state => state.user);
  const admin = user?.role === 'ADMIN';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [form, setForm] = useState(initialForm);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let page = 1, pages = 1; const rows: Employee[] = [];
      do {
        const result = await messengerRequest<{ data: Employee[]; totalPages: number }>(`users?isActive=${admin ? 'all' : 'true'}&page=${page}&limit=100`);
        rows.push(...result.data); pages = result.totalPages; page++;
      } while (page <= pages);
      setEmployees(rows);
    } catch (e) { setError(e instanceof Error ? e.message : '직원을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, [admin, user?.companyCode]);
  useEffect(() => { setEmployees([]); setEditing(null); setError(''); setSuccess(''); void load(); }, [load]);
  const open = (employee?: Employee) => {
    setEditing(employee || 'new'); setError(''); setSuccess('');
    setForm(employee ? { name: employee.name, email: employee.email, department: employee.department || '', password: '', role: employee.role } : initialForm);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!editing) return;
    setBusy(true); setError('');
    try {
      const { password, email, ...changes } = form;
      if (editing === 'new') await messengerRequest('users', 'POST', { ...changes, email, password });
      else await messengerRequest(`users/${editing.id}`, 'PUT', changes);
      setEditing(null); setSuccess(editing === 'new' ? '직원을 추가했습니다.' : '직원 정보를 저장했습니다.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const toggle = async (employee: Employee) => {
    if (!window.confirm(`${employee.name} 계정을 ${employee.isActive ? '비활성화' : '재활성화'}할까요?`)) return;
    setBusy(true); setError('');
    try {
      await messengerRequest(`users/${employee.id}${employee.isActive ? '' : '/reactivate'}`, employee.isActive ? 'DELETE' : 'POST');
      setSuccess(employee.isActive ? '계정을 비활성화했습니다.' : '계정을 재활성화했습니다.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : '변경하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const visible = employees.filter(e => (!activeOnly || e.isActive) && `${e.name} ${e.email} ${e.department || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className={`h-full overflow-auto bg-gray-50 p-4 md:p-6 ${printStyles.sheet}`}>
    <div className={editing ? 'entrip-no-print' : undefined}>
      <div className="entrip-print-only">
        <h2>직원 명부</h2>
        <p className={printStyles.summary}>{user?.companyCode} · {activeOnly || !admin ? '활성 직원' : '전체 직원'} · 조회 {visible.length}명{search && <> · 검색어 “{search}”</>}</p>
      </div>
      <div className="entrip-no-print mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-gray-900">설정</h1><p className="mt-1 text-sm text-gray-500">{user?.companyCode} · 직원 및 접근 권한 관리</p></div>{admin && <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white" onClick={() => open()}>직원 추가</button>}</div>
      <div className="entrip-no-print mb-4 flex flex-wrap items-center gap-3"><input aria-label="직원 검색" className="min-w-0 flex-1 rounded-lg border bg-white p-2" placeholder="이름, 이메일, 부서 검색" value={search} onChange={e => setSearch(e.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />활성 직원만</label><button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => void load()}>새로고침</button></div>
      {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="entrip-no-print mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{success}</p>}
      {!admin && <p className="entrip-no-print mb-3 text-sm text-gray-500">직원 정보를 조회할 수 있습니다. 계정 변경은 관리자에게 요청하세요.</p>}
      <p id={scrollHelpId} className="entrip-no-print mb-2 text-xs text-gray-500">표를 좌우로 스크롤해 직원 정보를 확인하세요. 이름 열은 고정됩니다.</p>
      <div className="overflow-x-auto rounded-lg border bg-white" role="region" aria-label="직원 목록 표" aria-describedby={scrollHelpId} tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>{['이름', '이메일', '부서', '권한', '상태', '작업'].map((h, index) => <th scope="col" className={`whitespace-nowrap p-3 font-medium ${h === '작업' ? 'entrip-no-print' : ''} ${index === 0 ? 'sticky left-0 z-10 border-r bg-gray-50' : ''}`} key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>{visible.map(employee => <tr key={employee.id} className="border-b last:border-0">
            <th scope="row" className="sticky left-0 z-10 min-w-[7rem] max-w-[9rem] break-words border-r bg-white p-3 font-medium [overflow-wrap:anywhere]">{employee.name}</th>
            <td className="p-3 text-gray-600">{employee.email}</td>
            <td className="whitespace-nowrap p-3">{employee.department || '미지정'}</td>
            <td className="whitespace-nowrap p-3">{roles[employee.role]}</td>
            <td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${employee.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{employee.isActive ? '활성' : '비활성'}</span></td>
            <td className="entrip-no-print p-3">{admin && <div className="flex gap-3 whitespace-nowrap">{employee.isActive && <button disabled={busy} onClick={() => open(employee)} className="text-blue-700">편집</button>}<button disabled={busy || employee.id === user?.id} onClick={() => void toggle(employee)} className="text-gray-600 disabled:opacity-30">{employee.isActive ? '비활성화' : '재활성화'}</button></div>}</td>
          </tr>)}</tbody>
        </table>
        {loading && <p role="status" className="p-6 text-center text-sm text-gray-500">불러오는 중…</p>}
        {!loading && !visible.length && <p className="p-6 text-center text-sm text-gray-500">조건에 맞는 직원이 없습니다.</p>}
      </div>
    </div>
    {editing && <section className="entrip-print-only" aria-label="직원 입력 내용">
      <h2>{editing === 'new' ? '신규 직원' : '직원 정보'}</h2>
      <p className={printStyles.summary}>{user?.companyCode} · 현재 입력 내용 · 저장 전</p>
      <table><tbody>
        <tr><th scope="row">이름</th><td>{form.name || '미입력'}</td></tr>
        <tr><th scope="row">이메일</th><td>{form.email || '미입력'}</td></tr>
        <tr><th scope="row">부서</th><td>{form.department || '미지정'}</td></tr>
        <tr><th scope="row">권한</th><td>{roles[form.role]}</td></tr>
        {editing !== 'new' && <tr><th scope="row">상태</th><td>{editing.isActive ? '활성' : '비활성'}</td></tr>}
      </tbody></table>
    </section>}
    {editing && <div className="entrip-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label={editing === 'new' ? '직원 추가' : '직원 편집'} onSubmit={save} className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-6 shadow-xl"><h2 className="mb-4 text-xl font-semibold">{editing === 'new' ? '직원 추가' : '직원 편집'}</h2><div className="space-y-3"><label className="block text-sm">이름<input required minLength={2} maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 block w-full rounded border p-2" /></label><label className="block text-sm">이메일<input required type="email" disabled={editing !== 'new'} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 block w-full rounded border p-2 disabled:bg-gray-50" /></label><label className="block text-sm">부서<input maxLength={100} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="mt-1 block w-full rounded border p-2" /></label><label className="block text-sm">권한<select aria-label="권한" disabled={editing !== 'new' && editing.id === user?.id} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Employee['role'] })} className="mt-1 block w-full rounded border p-2">{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{editing === 'new' && <label className="block text-sm">초기 비밀번호<input required type="password" minLength={6} maxLength={100} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1 block w-full rounded border p-2" /></label>}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="mr-auto rounded border px-4 py-2 text-sm">인쇄</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded border px-4 py-2 text-sm">취소</button><button disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">{busy ? '저장 중…' : '저장'}</button></div></form></div>}
  </div>;
}
