'use client';

import { Icon } from '@entrip/ui';

export default function MailPageContent() {
  return <section className="mx-auto max-w-4xl space-y-6 p-2 sm:p-6">
    <div><h1 className="text-2xl font-semibold text-gray-900">메일</h1><p className="mt-2 text-sm text-gray-500">업무 메일 계정 연결</p></div>
    <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-5 sm:p-8">
      <Icon icon="ph:envelope-bold" className="mb-4 h-9 w-9 text-blue-700" />
      <h2 className="text-lg font-semibold text-gray-900">메일 연동이 설정되지 않았습니다</h2>
      <p className="mt-3 text-sm leading-7 text-gray-600">현재 이 배포에서는 받은 메일 조회, 첨부파일 다운로드, 메일 발송을 사용할 수 없습니다. 회사 관리자에게 메일 서비스 연결 설정을 요청해 주세요.</p>
    </div>
    <div className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-gray-900">연결된 계정</h2><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">연결 안 됨</span></div>
      <p className="mt-4 text-sm text-gray-500">연결된 메일 계정이 없습니다.</p>
      <p className="mt-2 text-xs leading-6 text-gray-500">계정 인증과 수신·발신 서비스 연결을 완료한 뒤 사용할 수 있습니다.</p>
    </div>
  </section>;
}
