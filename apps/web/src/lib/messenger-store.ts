import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface MessengerUser { id: string; name: string; email: string; companyCode?: string; department?: string | null; isActive?: boolean; avatar?: string }
export interface ChatMessage { id: string; conversationId: string; senderId: string; sender: MessengerUser; content: string; type: string; isEdited: boolean; isDeleted: boolean; createdAt: string }
export interface ChatConversation { id: string; type: string; name?: string | null; participants: { userId: string; role: string; user: MessengerUser; canInvite?: boolean }[]; lastMessage?: ChatMessage | null; unreadCount: number; lastActivity: string }
interface MessengerState {
  socket: Socket | null; isConnected: boolean; conversations: ChatConversation[]; activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>; hasOlderMessages: Record<string, boolean>; olderMessageCursors: Record<string, string>; historyMessageIds: Record<string, string[]>; loadingOlderMessages: Record<string, boolean>; typingUsers: Record<string, string[]>; onlineUsers: Set<string>;
  currentUser: MessengerUser | null; directory: MessengerUser[]; isDirectoryLoading: boolean; isLoading: boolean; error: string | null;
  initialize: (user: MessengerUser) => void; connect: (token?: string) => void; disconnect: () => void;
  loadConversations: () => Promise<void>; loadDirectory: (signal?: AbortSignal) => Promise<void>; selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, type?: string, attachments?: unknown[]) => Promise<void>;
  editMessage: (id: string, content: string) => Promise<void>; deleteMessage: (id: string) => Promise<void>;
  toggleReaction: (id: string, emoji: string) => Promise<void>; markAsRead: (id: string) => Promise<void>;
  createConversation: (ids: string[], type?: string, name?: string) => Promise<void>; invite: (ids: string[]) => Promise<void>;
  setTyping: (typing: boolean, conversationId?: string) => void; updatePresence: (status: string) => Promise<void>; loadMoreMessages: (cursor?: string) => Promise<void>;
}

export async function messengerRequest<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v2/${path}`, { method, signal, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : `요청 실패 (${response.status})`);
  return data as T;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : '요청에 실패했습니다.';
const merge = (a: ChatMessage[], b: ChatMessage[]) => [...new Map([...a, ...b].map(message => [message.id, message])).values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id));
let session = 0;
let directoryRequest = 0;
let conversationRequest = 0;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const MESSAGE_PAGE_SIZE = 50;

// Only contiguous REST pages prove that history has no holes. Socket events and
// send/edit responses can add isolated cached messages after an offline gap.
const historyPageState = (state: MessengerState, id: string, messages: ChatMessage[], before?: string): Partial<MessengerState> => {
  const verified = state.historyMessageIds[id] || [];
  const pageIds = messages.map(message => message.id);
  if (before) {
    // A newer latest-page fetch may have moved the frontier while this request
    // was in flight. Cache its rows, but do not overwrite that newer frontier.
    if (state.olderMessageCursors[id] && state.olderMessageCursors[id] !== before) return {};
    return {
      historyMessageIds: { ...state.historyMessageIds, [id]: [...new Set([...verified, ...pageIds])] },
      hasOlderMessages: { ...state.hasOlderMessages, [id]: messages.length === MESSAGE_PAGE_SIZE },
      olderMessageCursors: { ...state.olderMessageCursors, [id]: pageIds[0] || before },
    };
  }
  const verifiedIds = new Set(verified);
  const continuesHistory = pageIds.some(messageId => verifiedIds.has(messageId));
  return {
    historyMessageIds: { ...state.historyMessageIds, [id]: continuesHistory ? [...new Set([...verified, ...pageIds])] : pageIds },
    hasOlderMessages: { ...state.hasOlderMessages, [id]: messages.length === MESSAGE_PAGE_SIZE && (!continuesHistory || state.hasOlderMessages[id] !== false) },
    olderMessageCursors: { ...state.olderMessageCursors, ...(pageIds[0] ? { [id]: continuesHistory ? (state.olderMessageCursors[id] || pageIds[0]) : pageIds[0] } : {}) },
  };
};

export const useMessengerStore = create<MessengerState>((set, get) => ({
  socket: null, isConnected: false, conversations: [], activeConversationId: null, messages: {}, hasOlderMessages: {}, olderMessageCursors: {}, historyMessageIds: {}, loadingOlderMessages: {}, typingUsers: {}, onlineUsers: new Set(), currentUser: null, directory: [], isDirectoryLoading: false, isLoading: false, error: null,
  initialize: user => {
    if (get().currentUser?.id === user.id && get().currentUser?.companyCode === user.companyCode && get().socket) return;
    get().disconnect();
    set({ currentUser: user });
    get().connect();
  },
  connect: () => {
    if (get().socket || !get().currentUser) return;
    const ticket = session;
    const host = process.env.NEXT_PUBLIC_WS_URL || (process.env.NODE_ENV === 'development' ? `${window.location.protocol}//${window.location.hostname}:4002` : window.location.origin);
    const socket = io(host, { withCredentials: true, transports: ['websocket', 'polling'], reconnection: true });
    set({ socket });
    socket.on('connect', () => {
      if (ticket !== session) return;
      set({ isConnected: true });
      void get().loadConversations();
      const active = get().activeConversationId;
      if (active) socket.emit('conversation:join', active);
    });
    socket.on('disconnect', reason => {
      if (ticket !== session) return;
      set({ isConnected: false });
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('connect_error', () => { if (ticket === session) set({ isConnected: false }); });
    const receive = async ({ conversationId, message }: { conversationId: string; message: ChatMessage }) => {
      if (ticket !== session || !message?.id) return;
      set(state => ({ messages: { ...state.messages, [conversationId]: merge(state.messages[conversationId] || [], [message]) } }));
      if (get().activeConversationId === conversationId) await get().markAsRead(conversationId);
      if (ticket === session) await get().loadConversations();
    };
    socket.on('message:new', receive); socket.on('message:updated', receive);
    socket.on('conversation:updated', () => { if (ticket === session) void get().loadConversations(); });
    socket.on('typing:status', ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (ticket !== session || userId === get().currentUser?.id) return;
      const key = `${conversationId}:${userId}`;
      clearTimeout(typingTimeouts.get(key)); typingTimeouts.delete(key);
      set(state => ({ typingUsers: { ...state.typingUsers, [conversationId]: isTyping ? [...new Set([...(state.typingUsers[conversationId] || []), userId])] : (state.typingUsers[conversationId] || []).filter(id => id !== userId) } }));
      // A closed browser may never send typing:stop. Expire only the visual hint.
      if (isTyping) typingTimeouts.set(key, setTimeout(() => {
        typingTimeouts.delete(key);
        if (ticket === session) set(state => ({ typingUsers: { ...state.typingUsers, [conversationId]: (state.typingUsers[conversationId] || []).filter(id => id !== userId) } }));
      }, 4000));
    });
    void get().loadConversations(); void get().loadDirectory();
    refreshTimer = setInterval(() => { if (ticket !== session) return; void get().loadConversations(); const id = get().activeConversationId; if (id) void get().loadMoreMessages(); }, 15000);
  },
  disconnect: () => {
    session++; clearInterval(refreshTimer); get().socket?.disconnect();
    typingTimeouts.forEach(timer => clearTimeout(timer)); typingTimeouts.clear();
    set({ socket: null, isConnected: false, currentUser: null, conversations: [], messages: {}, hasOlderMessages: {}, olderMessageCursors: {}, historyMessageIds: {}, loadingOlderMessages: {}, directory: [], isDirectoryLoading: false, activeConversationId: null, error: null, isLoading: false, typingUsers: {}, onlineUsers: new Set() });
  },
  loadDirectory: async signal => {
    const ticket = session;
    const request = ++directoryRequest;
    const current = () => ticket === session && request === directoryRequest && !signal?.aborted;
    set({ isDirectoryLoading: true });
    try {
      let page = 1;
      const users: MessengerUser[] = [];
      while (current()) {
        const result = await messengerRequest<{ data: MessengerUser[]; totalPages: number }>(
          `users?isActive=true&limit=100&page=${page}`, 'GET', undefined, signal
        );
        users.push(...result.data);
        if (page >= result.totalPages) break;
        page++;
      }
      if (current()) set({ directory: users });
    } catch (error) {
      if (current()) set({ error: errorText(error) });
    } finally {
      if (ticket === session && request === directoryRequest) set({ isDirectoryLoading: false });
    }
  },
  loadConversations: async () => {
    const ticket = session;
    const request = ++conversationRequest;
    const current = () => ticket === session && request === conversationRequest;
    try {
      const conversations = await messengerRequest<ChatConversation[]>('messages/conversations');
      if (current()) set({ conversations });
    } catch (error) {
      if (current()) set({ error: errorText(error) });
    }
  },
  selectConversation: async id => {
    const ticket = session;
    const previous = get().activeConversationId;
    if (previous) { get().socket?.emit('typing:stop', previous); get().socket?.emit('conversation:leave', previous); }
    set({ activeConversationId: id || null, error: null, isLoading: Boolean(id) });
    if (!id) return;
    try {
      const messages = await messengerRequest<ChatMessage[]>(`messages/conversations/${encodeURIComponent(id)}/messages`);
      if (ticket !== session) return;
      set(state => {
        const cached = state.messages[id] || [];
        return {
          messages: { ...state.messages, [id]: merge(cached, messages) },
          ...historyPageState(state, id, messages),
          ...(state.activeConversationId === id ? { isLoading: false } : {}),
        };
      });
      if (get().activeConversationId === id) { get().socket?.emit('conversation:join', id); await get().markAsRead(id); }
    } catch (error) { if (ticket === session && get().activeConversationId === id) set({ error: errorText(error), isLoading: false }); }
  },
  sendMessage: async content => {
    const id = get().activeConversationId, ticket = session;
    if (!id) throw new Error('대화방을 선택하세요.');
    try {
      const message = await messengerRequest<ChatMessage>(`messages/conversations/${encodeURIComponent(id)}/messages`, 'POST', { content });
      if (ticket !== session) return;
      set(state => ({ error: null, messages: { ...state.messages, [id]: merge(state.messages[id] || [], [message]) } })); await get().loadConversations();
    } catch (error) { if (ticket === session) set({ error: errorText(error) }); throw error; }
  },
  editMessage: async (id, content) => {
    const ticket = session; const message = await messengerRequest<ChatMessage>(`messages/messages/${encodeURIComponent(id)}`, 'PUT', { content });
    if (ticket === session) set(state => ({ messages: { ...state.messages, [message.conversationId]: merge(state.messages[message.conversationId] || [], [message]) } }));
  },
  deleteMessage: async id => {
    const ticket = session; const message = await messengerRequest<ChatMessage>(`messages/messages/${encodeURIComponent(id)}`, 'DELETE');
    if (ticket === session) set(state => ({ messages: { ...state.messages, [message.conversationId]: merge(state.messages[message.conversationId] || [], [message]) } }));
  },
  toggleReaction: async () => { throw new Error('반응 기능은 아직 연결되지 않았습니다.'); },
  markAsRead: async id => {
    const ticket = session;
    try { await messengerRequest(`messages/conversations/${encodeURIComponent(id)}/read`, 'POST'); if (ticket === session) set(state => ({ conversations: state.conversations.map(c => c.id === id ? { ...c, unreadCount: 0 } : c) })); }
    catch (error) { if (ticket === session) set({ error: errorText(error) }); }
  },
  createConversation: async (participantIds, type = 'DIRECT', name) => {
    const ticket = session;
    try {
      const conversation = await messengerRequest<ChatConversation>('messages/conversations', 'POST', { participantIds, type, name });
      if (ticket !== session) return;
      await get().loadConversations(); await get().selectConversation(conversation.id);
    } catch (error) { if (ticket === session) set({ error: errorText(error) }); throw error; }
  },
  invite: async participantIds => {
    const id = get().activeConversationId, ticket = session;
    if (!id) return;
    await messengerRequest(`messages/conversations/${encodeURIComponent(id)}/participants`, 'POST', { participantIds });
    if (ticket === session) await get().loadConversations();
  },
  setTyping: (typing, conversationId) => { const id = conversationId || get().activeConversationId; if (id) get().socket?.emit(typing ? 'typing:start' : 'typing:stop', id); },
  updatePresence: async () => {},
  loadMoreMessages: async cursor => {
    const id = get().activeConversationId, ticket = session;
    if (!id || (cursor && (get().loadingOlderMessages[id] || get().hasOlderMessages[id] === false))) return;
    const before = cursor ? get().olderMessageCursors[id] || cursor : undefined;
    if (cursor) set(state => ({ loadingOlderMessages: { ...state.loadingOlderMessages, [id]: true } }));
    try {
      const messages = await messengerRequest<ChatMessage[]>(`messages/conversations/${encodeURIComponent(id)}/messages${before ? `?cursor=${encodeURIComponent(before)}` : ''}`);
      if (ticket === session) set(state => {
        const cached = state.messages[id] || [];
        return {
          messages: { ...state.messages, [id]: merge(cached, messages) },
          ...historyPageState(state, id, messages, before),
          error: null,
        };
      });
    } catch (error) { if (ticket === session) set({ error: errorText(error) }); }
    finally { if (cursor && ticket === session) set(state => ({ loadingOlderMessages: { ...state.loadingOlderMessages, [id]: false } })); }
  },
}));
