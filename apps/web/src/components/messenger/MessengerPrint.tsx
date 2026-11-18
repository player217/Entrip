import type { ChatConversation, ChatMessage, MessengerUser } from '@/lib/messenger-store';
import styles from '../pages/records-print.module.css';

interface MessengerPrintProps {
  mode: 'conversations' | 'directory' | 'invite';
  conversation?: ChatConversation;
  thread: ChatMessage[];
  hasOlder?: boolean;
  loading: boolean;
  error: string;
  search: string;
  conversations: ChatConversation[];
  employees: MessengerUser[];
  title: (conversation: ChatConversation) => string;
}

const dateTime = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

export function MessengerPrint({
  mode, conversation, thread, hasOlder, loading, error, search, conversations, employees, title,
}: MessengerPrintProps) {
  const selected = mode === 'conversations' && conversation;
  const directory = mode !== 'conversations';
  const scope = selected ? title(selected) : directory ? (mode === 'invite' ? '직원 초대 대상' : '조직도') : '대화 목록';
  const count = selected ? `조회한 메시지 ${thread.length}개` : directory ? `직원 ${employees.length}명` : `대화 ${conversations.length}개`;

  return <section className={`entrip-print-only ${styles.sheet}`}>
    <h2>{scope}</h2>
    <p className={styles.summary}>
      {count}
      {!selected && search.trim() && <> · 검색어 {search.trim()}</>}
      {mode === 'invite' && conversation && <> · 대화 {title(conversation)}</>}
    </p>
    {error && <p>조회 안내 · {error}</p>}
    {loading && <p>목록을 불러오는 중입니다.</p>}
    {selected ? <>
      <p className={styles.summary}>참여자 {selected.participants.length}명 · {selected.participants.map(p => p.user.name).join(', ')}</p>
      {hasOlder && <p>앞선 대화가 더 있습니다. 현재 불러온 메시지만 수록했습니다.</p>}
      {thread.map(m => <article className={styles.message} key={m.id}>
        <div className={styles.byline}>
          <strong>{m.sender.name}</strong> · <time dateTime={m.createdAt}>{dateTime.format(new Date(m.createdAt))}</time>
          {m.isEdited && !m.isDeleted && <> · 수정됨</>}
        </div>
        <div className={styles.messageBody}>{m.isDeleted ? '삭제된 메시지입니다.' : m.content}</div>
      </article>)}
      {!loading && !error && !thread.length && <p>이 대화에 표시할 메시지가 없습니다.</p>}
    </> : directory ? <>
      {employees.length > 0 && <table><thead><tr><th scope="col">이름</th><th scope="col">부서</th><th scope="col">이메일</th></tr></thead>
        <tbody>{employees.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.department || '부서 미지정'}</td><td>{u.email}</td></tr>)}</tbody></table>}
      {!loading && !error && !employees.length && <p>표시할 직원이 없습니다.</p>}
    </> : <>
      {conversations.length > 0 && <table><thead><tr><th style={{width:'28%'}} scope="col">대화</th><th scope="col">최근 메시지</th><th style={{width:'15%'}} scope="col">안 읽음</th></tr></thead>
        <tbody>{conversations.map(c => <tr key={c.id}><td>{title(c)}</td><td className={styles.messageBody}>{c.lastMessage?.isDeleted ? '삭제된 메시지입니다.' : c.lastMessage?.content || '새 대화'}</td><td>{c.unreadCount}</td></tr>)}</tbody></table>}
      {!loading && !error && !conversations.length && <p>표시할 대화가 없습니다.</p>}
    </>}
  </section>;
}
