'use client';
import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MessengerPrint } from './MessengerPrint';
import { ChatConversation, ChatMessage, useMessengerStore } from '@/lib/messenger-store';

const emptyThread: ChatMessage[] = [];
interface ScrollPosition { conversationId: string | null; firstId?: string; lastId?: string; anchorId?: string; anchorOffset: number; top: number; nearBottom: boolean }

export function MessengerWorkspace() {
  const { conversations, activeConversationId, messages, hasOlderMessages, loadingOlderMessages, currentUser, directory, isDirectoryLoading, error, isConnected, isLoading, typingUsers,
    selectConversation, createConversation, invite, sendMessage, editMessage, deleteMessage, loadMoreMessages, setTyping } = useMessengerStore();
  const [mode, setMode] = useState<'conversations' | 'directory' | 'invite'>('conversations');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const messageList = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef<ScrollPosition | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);
  const lastTypingSignal = useRef(0);
  useEffect(() => { setDrafts({}); setMode('conversations'); setSearch(''); setActionError(''); }, [currentUser?.id, currentUser?.companyCode]);
  const conversation = conversations.find(c => c.id === activeConversationId);
  const thread = messages[activeConversationId || ''] || emptyThread;
  const title = (c: ChatConversation) => c.name || c.participants.filter(p => p.userId !== currentUser?.id).map(p => p.user.name).join(', ') || '대화';
  const content = drafts[activeConversationId || ''] || '';
  const query = search.trim().toLowerCase();
  const visibleConversations = conversations.filter(c => title(c).toLowerCase().includes(query));
  const eligibleEmployees = directory.filter(u => u.id !== currentUser?.id && (mode !== 'invite' || !conversation?.participants.some(p => p.userId === u.id)));
  const visibleEmployees = eligibleEmployees.filter(u => `${u.name} ${u.department || ''} ${u.email}`.toLowerCase().includes(query));
  const rememberViewport = useCallback(() => {
    const list = messageList.current;
    if (!list || !list.clientHeight) return;
    const bounds = list.getBoundingClientRect();
    const anchor = Array.from(list.querySelectorAll<HTMLElement>('[data-message-id]')).find(row => {
      const rect = row.getBoundingClientRect();
      return rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    scrollPosition.current = {
      conversationId: activeConversationId, firstId: thread[0]?.id, lastId: thread[thread.length - 1]?.id,
      anchorId: anchor?.dataset.messageId, anchorOffset: anchor ? anchor.getBoundingClientRect().top - bounds.top : 0,
      top: list.scrollTop, nearBottom: list.scrollHeight - list.scrollTop - list.clientHeight < 80,
    };
  }, [activeConversationId, thread]);
  useLayoutEffect(() => {
    const list = messageList.current;
    if (!list || !list.clientHeight) return;
    const previous = scrollPosition.current;
    const firstId = thread[0]?.id;
    const lastId = thread[thread.length - 1]?.id;
    const prepended = previous?.firstId && firstId !== previous.firstId && thread.some(message => message.id === previous.firstId);
    if (!previous || previous.conversationId !== activeConversationId || (!previous.lastId && lastId)) {
      list.scrollTop = list.scrollHeight;
    } else if (!prepended && lastId !== previous.lastId && previous.nearBottom) {
      list.scrollTop = list.scrollHeight;
    } else {
      // Restore the visible message, not the bottom of the thread. This also avoids
      // jumping when an earlier message is edited or its deleted placeholder shrinks.
      const anchor = Array.from(list.querySelectorAll<HTMLElement>('[data-message-id]')).find(row => row.dataset.messageId === previous.anchorId);
      if (anchor) list.scrollTop += anchor.getBoundingClientRect().top - list.getBoundingClientRect().top - previous.anchorOffset;
      else list.scrollTop = previous.top;
    }
    rememberViewport();
  }, [activeConversationId, thread, mode, rememberViewport]);
  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    if (typingActive.current && activeConversationId) setTyping(false, activeConversationId);
    typingActive.current = false;
  }, [activeConversationId, setTyping]);
  useEffect(() => stopTyping, [stopTyping, currentUser?.id]);
  const changeDraft = (value: string) => {
    if (!activeConversationId) return;
    setDrafts(d => ({ ...d, [activeConversationId]: value }));
    if (!value.trim()) { stopTyping(); return; }
    const now = Date.now();
    if (!typingActive.current || now - lastTypingSignal.current >= 1000) {
      setTyping(true, activeConversationId); lastTypingSignal.current = now;
    }
    typingActive.current = true;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1500);
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setActionError('');
    try { await fn(); } catch (e) { setActionError(e instanceof Error ? e.message : '처리하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || busy || !activeConversationId) return;
    const id = activeConversationId;
    stopTyping();
    await act(async () => { await sendMessage(content); setDrafts(d => ({ ...d, [id]: '' })); });
  };
  return <>
    <MessengerPrint mode={mode} conversation={conversation} thread={thread}
      hasOlder={conversation && hasOlderMessages[conversation.id]}
      loading={mode === 'conversations' ? isLoading : isDirectoryLoading}
      error={error || ''} search={search} conversations={visibleConversations} employees={visibleEmployees} title={title} />
    <section className="entrip-no-print flex h-full min-h-0 flex-col overflow-hidden bg-white" aria-label="업무 메신저">
    <header className="flex items-center justify-between border-b px-4 py-3"><h1 className="font-semibold text-gray-900">메신저</h1><span className="text-xs text-gray-500">{isConnected ? '실시간 연결됨' : '재연결 중 · 15초마다 갱신'}</span></header>
    {(error || actionError) && <div role="alert" className="border-b bg-red-50 px-4 py-2 text-sm text-red-700">{actionError || error}</div>}
    <div className="flex min-h-0 flex-1">
      <aside className={`${conversation && mode === 'conversations' ? 'hidden md:flex' : 'flex'} w-full flex-col border-r md:w-72 md:shrink-0`}>
        <div className="flex gap-2 border-b p-3"><button onClick={() => setMode('conversations')} className={`rounded px-3 py-1 text-sm ${mode === 'conversations' ? 'bg-blue-50 text-blue-700' : ''}`}>대화</button><button onClick={() => { setMode('directory'); void useMessengerStore.getState().loadDirectory(); }} className={`rounded px-3 py-1 text-sm ${mode !== 'conversations' ? 'bg-blue-50 text-blue-700' : ''}`}>{mode === 'invite' ? '직원 초대' : '조직도'}</button></div>
        <input aria-label="대화 또는 직원 검색" placeholder={mode === 'conversations' ? '대화 이름 검색' : '이름·부서·이메일 검색'} className="m-3 rounded border p-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === 'conversations' ? visibleConversations.map(c => <button key={c.id} onClick={() => { void selectConversation(c.id); setMode('conversations'); }} className={`flex w-full items-center gap-3 border-b p-4 text-left hover:bg-gray-50 ${c.id === activeConversationId ? 'bg-blue-50' : ''}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">{title(c).slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title(c)}</strong><span className="block truncate text-xs text-gray-500">{c.lastMessage?.content || '새 대화'}</span></span>{c.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 text-xs text-white">{c.unreadCount}</span>}</button>) : visibleEmployees.map(u => <div key={u.id} className="flex items-center gap-2 border-b p-3"><span className="min-w-0 flex-1"><strong className="block text-sm">{u.name}</strong><span className="block truncate text-xs text-gray-500">{u.department || '부서 미지정'} · {u.email}</span></span><button disabled={busy} onClick={() => void act(async () => { if (mode === 'invite') await invite([u.id]); else await createConversation([u.id]); setSearch(''); setMode('conversations'); })} className="shrink-0 rounded border px-2 py-1 text-xs text-blue-700">{mode === 'invite' ? '초대' : '1:1 대화'}</button></div>)}
          {mode === 'conversations' && !visibleConversations.length && <p role="status" className="p-6 text-sm text-gray-500">{query ? '검색 조건에 맞는 대화가 없습니다.' : '조직도에서 직원을 선택해 첫 대화를 시작하세요.'}</p>}
          {mode !== 'conversations' && isDirectoryLoading && <p role="status" className="p-6 text-sm text-gray-500">직원 목록을 불러오는 중…</p>}
          {mode !== 'conversations' && !isDirectoryLoading && !visibleEmployees.length && <p role="status" className="p-6 text-sm text-gray-500">{query ? '검색 조건에 맞는 직원이 없습니다.' : mode === 'invite' ? '초대할 수 있는 직원이 없습니다. 현재 직원이 모두 참여 중입니다.' : '대화할 수 있는 직원이 없습니다.'}</p>}
        </div>
      </aside>
      {conversation ? <main className={`${mode !== 'conversations' ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col`}>
        <div className="flex items-center gap-2 border-b p-3"><button aria-label="대화 목록" className="rounded border px-2 py-1 md:hidden" onClick={() => void selectConversation('')}>←</button><div className="min-w-0 flex-1"><h2 className="truncate font-medium">{title(conversation)}</h2><p className="text-xs text-gray-500">참여자 {conversation.participants.length}명{(typingUsers[conversation.id] || []).length ? ' · 입력 중…' : ''}</p></div><button onClick={() => { setMode('invite'); setSearch(''); void useMessengerStore.getState().loadDirectory(); }} className="rounded border px-3 py-1 text-sm text-blue-700">직원 초대</button></div>
        <div ref={messageList} role="region" aria-label="대화 메시지" tabIndex={0} onScroll={rememberViewport} style={{ overflowAnchor: 'none' }} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {hasOlderMessages[conversation.id] && <button disabled={loadingOlderMessages[conversation.id]} onClick={() => { rememberViewport(); void loadMoreMessages(thread[0]?.id); }} className="mx-auto block rounded border bg-white px-3 py-1 text-xs disabled:opacity-50">{loadingOlderMessages[conversation.id] ? '이전 메시지 불러오는 중…' : '이전 메시지'}</button>}
          {hasOlderMessages[conversation.id] === false && thread.length >= 50 && <p className="text-center text-xs text-gray-500">처음 메시지까지 확인했습니다.</p>}
          {isLoading && <p role="status" className="text-sm text-gray-500">대화 불러오는 중…</p>}
          {thread.map(message => <div key={message.id} data-message-id={message.id} className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}><div className="max-w-[85%]"><div className="mb-1 text-xs text-gray-500">{message.sender.name}</div><p className={`whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm ${message.senderId === currentUser?.id ? 'bg-blue-600 text-white' : 'border bg-white'}`}>{message.content}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>{message.isEdited && <span>수정됨</span>}{message.senderId === currentUser?.id && !message.isDeleted && <><button onClick={() => { const value = window.prompt('메시지 수정', message.content); if (value?.trim()) void act(() => editMessage(message.id, value)); }}>수정</button><button onClick={() => { if (window.confirm('이 메시지를 삭제할까요?')) void act(() => deleteMessage(message.id)); }}>삭제</button></>}</div></div></div>)}
        </div>
        <form className="flex items-end gap-2 border-t p-3" onSubmit={submit}><textarea aria-label="메시지" value={content} maxLength={10000} placeholder="메시지 입력 · Enter 전송 / Shift+Enter 줄바꿈" rows={2} className="min-w-0 flex-1 resize-none rounded border p-2 text-sm" onChange={e => changeDraft(e.target.value)} onBlur={stopTyping} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(e); } }} /><button disabled={busy || !content.trim()} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? '전송 중' : '전송'}</button></form>
      </main> : <div className="hidden flex-1 items-center justify-center p-6 text-sm text-gray-500 md:flex">대화를 선택하거나 조직도에서 새 대화를 시작하세요.</div>}
    </div>
  </section></>;
}
