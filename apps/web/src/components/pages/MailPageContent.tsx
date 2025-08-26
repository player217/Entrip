'use client';

import React, { useState } from 'react';
import { Icon } from '@entrip/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'naver' | 'other';
  isConnected: boolean;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  hasAttachment: boolean;
}

export default function MailPageContent() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // 메일 계정 더미 데이터
  const [emailAccounts] = useState<EmailAccount[]>([
    {
      id: '1',
      email: 'admin@entrip.co.kr',
      provider: 'gmail',
      isConnected: true
    },
    {
      id: '2',
      email: 'sales@entrip.co.kr',
      provider: 'outlook',
      isConnected: true
    },
    {
      id: '3',
      email: 'support@entrip.co.kr',
      provider: 'naver',
      isConnected: false
    }
  ]);

  // 이메일 더미 데이터
  const [emails] = useState<Email[]>([
    {
      id: '1',
      from: 'customer@example.com',
      subject: '베트남 다낭 패키지 문의드립니다',
      preview: '안녕하세요. 3박 4일 베트남 다낭 패키지 상품에 대해 문의드리고 싶습니다...',
      timestamp: new Date('2025-07-30T14:30:00'),
      isRead: false,
      isImportant: true,
      hasAttachment: false
    },
    {
      id: '2',
      from: 'partner@travelagency.com',
      subject: '여름 성수기 항공료 협상 건',
      preview: '안녕하세요. 여름 성수기 항공료 할인 협상에 대해 논의하고 싶습니다...',
      timestamp: new Date('2025-07-30T13:45:00'),
      isRead: true,
      isImportant: false,
      hasAttachment: true
    },
    {
      id: '3',
      from: 'hotel@resort.com',
      subject: '2025년 하반기 호텔 예약 계약 건',
      preview: '안녕하세요. 2025년 하반기 호텔 예약 관련 계약서를 첨부하여 보내드립니다...',
      timestamp: new Date('2025-07-30T12:20:00'),
      isRead: true,
      isImportant: false,
      hasAttachment: true
    },
    {
      id: '4',
      from: 'client@company.com',
      subject: '회사 워크샵 견적서 요청',
      preview: '안녕하세요. 직원 50명 규모의 워크샵 견적서를 요청드립니다...',
      timestamp: new Date('2025-07-30T11:15:00'),
      isRead: false,
      isImportant: false,
      hasAttachment: false
    }
  ]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail': return 'ph:google-logo';
      case 'outlook': return 'ph:microsoft-outlook-logo';
      case 'naver': return 'ph:envelope';
      default: return 'ph:envelope';
    }
  };

  const selectedAccountData = selectedAccount ? emailAccounts.find(acc => acc.id === selectedAccount) : null;
  const selectedEmailData = selectedEmail ? emails.find(email => email.id === selectedEmail) : null;

  const handleConnectAccount = (accountId: string) => {
    alert('외부 메일 계정 연동 기능을 구현해야 합니다. (OAuth 2.0 인증 필요)');
  };

  const handleSendEmail = () => {
    alert('메일 발송 기능을 구현해야 합니다.');
    setShowComposeModal(false);
  };

  return (
    <div className="h-full flex bg-white">
      {/* 사이드바 - 계정 목록 */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">메일</h1>
            <button
              onClick={() => setShowComposeModal(true)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Icon icon="ph:plus" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 메일 계정 목록 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">연결된 계정</h3>
            {emailAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  selectedAccount === account.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    icon={getProviderIcon(account.provider)} 
                    className="w-5 h-5 text-gray-600" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        account.isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-xs ${
                        account.isConnected ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {account.isConnected ? '연결됨' : '연결 끊김'}
                      </span>
                    </div>
                  </div>
                  {!account.isConnected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectAccount(account.id);
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      연결
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
              <Icon icon="ph:plus" className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm">계정 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메일 목록 */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {selectedAccountData ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Icon 
                  icon={getProviderIcon(selectedAccountData.provider)} 
                  className="w-6 h-6 text-gray-600" 
                />
                <div>
                  <h2 className="font-medium text-gray-900">{selectedAccountData.email}</h2>
                  <span className="text-sm text-gray-500">받은편지함</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 p-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <Icon icon="ph:arrows-clockwise" className="w-4 h-4 mx-auto" />
                </button>
                <button className="flex-1 p-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <Icon icon="ph:funnel" className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEmail === email.id ? 'bg-blue-50 border-blue-200' : ''
                  } ${!email.isRead ? 'bg-blue-25' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      {email.isImportant && (
                        <Icon icon="ph:star-fill" className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {email.from}
                        </p>
                        <div className="flex items-center gap-1">
                          {email.hasAttachment && (
                            <Icon icon="ph:paperclip" className="w-3 h-3 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500">
                            {format(email.timestamp, 'HH:mm', { locale: ko })}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mb-1 ${!email.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {email.preview}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Icon icon="ph:envelope" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">메일 계정을 선택해주세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 메일 내용 */}
      <div className="flex-1 flex flex-col">
        {selectedEmailData ? (
          <>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedEmailData.subject}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>보낸이: {selectedEmailData.from}</span>
                    <span>{format(selectedEmailData.timestamp, 'yyyy년 M월 d일 HH:mm', { locale: ko })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:star" className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:trash" className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon icon="ph:dots-three-vertical" className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {selectedEmailData.preview}
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  실제 메일 내용이 여기에 표시됩니다. 현재는 더미 데이터로 표시되고 있으며, 
                  실제 구현 시에는 외부 메일 서비스 API를 통해 메일 내용을 가져와야 합니다.
                </p>
                {selectedEmailData.hasAttachment && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">첨부파일</h4>
                    <div className="flex items-center gap-3 p-2 bg-white rounded border">
                      <Icon icon="ph:file-pdf" className="w-6 h-6 text-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">견적서.pdf</p>
                        <p className="text-xs text-gray-500">234 KB</p>
                      </div>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Icon icon="ph:download" className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Icon icon="ph:arrow-bend-up-left" className="w-4 h-4 mr-2 inline" />
                  답장
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Icon icon="ph:arrow-bend-double-up-left" className="w-4 h-4 mr-2 inline" />
                  전체답장
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <Icon icon="ph:arrow-right" className="w-4 h-4 mr-2 inline" />
                  전달
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon icon="ph:envelope-open" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">메일을 선택해주세요</h3>
              <p className="text-gray-500">왼쪽에서 읽을 메일을 선택해주세요.</p>
            </div>
          </div>
        )}
      </div>

      {/* 메일 작성 모달 */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">메일 작성</h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="ph:x" className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">받는이</label>
                <input
                  type="email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="메일 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  rows={10}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="메일 내용을 입력하세요"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Icon icon="ph:paperclip" className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Icon icon="ph:paper-plane-right" className="w-4 h-4 mr-2 inline" />
                  보내기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}