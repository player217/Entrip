'use client';

import { Icon } from '@entrip/ui';
import printStyles from '@/components/pages/records-print.module.css';

/** The former canvas was a nonfunctional prototype. Keep its status explicit. */
export function FlowCanvas() {
  return <section className={`mx-auto max-w-4xl space-y-6 p-2 sm:p-6 ${printStyles.integration}`}>
    <div><h1 className="text-2xl font-semibold text-gray-900">업무 자동화</h1><p className="mt-2 text-sm text-gray-500">예약 접수와 후속 업무 연결</p></div>
    <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-5 sm:p-8">
      <Icon icon="ph:flow-arrow-bold" className="entrip-no-print mb-4 h-9 w-9 text-blue-700" />
      <h2 className="text-lg font-semibold text-gray-900">자동화 실행은 아직 사용할 수 없습니다</h2>
      <p className="mt-3 text-sm leading-7 text-gray-600">자동화 설정 저장과 실행 서비스가 연결되지 않았습니다. 예약 등록 후 메일 발송이나 외부 시스템 변경이 자동으로 실행되지 않습니다.</p>
    </div>
    <div className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold text-gray-900">연결 상태</h2>
      <dl className="mt-4 divide-y text-sm">
        <div className="flex flex-wrap justify-between gap-3 py-3"><dt>예약 접수</dt><dd className="text-blue-700">예약관리에서 직접 처리</dd></div>
        <div className="flex flex-wrap justify-between gap-3 py-3"><dt>메일 자동 발송</dt><dd className="text-gray-500">사용 불가</dd></div>
        <div className="flex flex-wrap justify-between gap-3 py-3"><dt>외부 시스템 연동</dt><dd className="text-gray-500">사용 불가</dd></div>
      </dl>
    </div>
  </section>;
}
