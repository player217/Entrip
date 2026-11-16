import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface MessengerUser { id: string; name: string; email: string; companyCode?: string; department?: string | null; isActive?: boolean; avatar?: string }
export interface ChatMessage { id: string; conversationId: string; senderId: string; sender: MessengerUser; content: string; type: string; isEdited: boolean; isDeleted: boolean; createdAt: string }
export interface ChatConversation { id: string; type: string; name?: string | null; participants: { userId: string; role: string; user: MessengerUser; canInvite?: boolean }[]; lastMessage?: ChatMessage | null; unreadCount: number; lastActivity: string }
interface MessengerState {
  socket: Socket | null; isConnected: boolean; conversations: ChatConversation[]; activeConversationId: string | null;
  messages: Record<string, ChatMessage[]>; typingUsers: Record<string, string[]>; onlineUsers: Set<string>;
  currentUser: MessengerUser | null; directory: MessengerUser[]; isLoading: boolean; error: string | null;
  initialize: (user: MessengerUser) => void; connect: (token?: string) => void; disconnect: () => void;
  loadConversations: () => Promise<void>; loadDirectory: () => Promise<void>; selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, type?: string, attachments?: unknown[]) => Promise<void>;
  editMessage: (id: string, content: string) => Promise<void>; deleteMessage: (id: string) => Promise<void>;
  toggleReaction: (id: string, emoji: string) => Promise<void>; markAsRead: (id: string) => Promise<void>;
  createConversation: (ids: string[], type?: string, name?: string) => Promise<void>; invite: (ids: string[]) => Promise<void>;
  setTyping: (typing: boolean) => void; updatePresence: (status: string) => Promise<void>; loadMoreMessages: (cursor?: string) => Promise<void>;
}

export async function messengerRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v2/${path}`, { method, credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : `요청 실패 (${response.status})`);
  return data as T;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : '요청에 실패했습니다.';
const merge = (a: ChatMessage[], b: ChatMessage[]) => [...new Map([...a, ...b].map(message => [message.id, message])).values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id));
let session = 0;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

export const useMessengerStore = create<MessengerState>((set, get) => ({
  socket: null, isConnected: false, conversations: [], activeConversationId: null, messages: {}, typingUsers: {}, onlineUsers: new Set(), currentUser: null, directory: [], isLoading: false, error: null,
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
    socket.on('connect', () => { if (ticket !== session) return; set({ isConnected: true }); void get().loadConversations(); });
    socket.on('disconnect', () => { if (ticket === session) set({ isConnected: false }); });
    socket.on('connect_error', () => { if (ticket === session) set({ isConnected: false }); });
    const receive = ({ conversationId, message }: { conversationId: string; message: ChatMessage }) => {
      if (ticket !== session || !message?.id) return;
      set(state => ({ messages: { ...state.messages, [conversationId]: merge(state.messages[conversationId] || [], [message]) } }));
      if (get().activeConversationId === conversationId) void get().markAsRead(conversationId);
      void get().loadConversations();
    };
    socket.on('message:new', receive); socket.on('message:updated', receive);
    socket.on('conversation:updated', () => { if (ticket === session) void get().loadConversations(); });
    socket.on('typing:status', ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (ticket !== session || userId === get().currentUser?.id) return;
      set(state => ({ typingUsers: { ...state.typingUsers, [conversationId]: isTyping ? [...new Set([...(state.typingUsers[conversationId] || []), userId])] : (state.typingUsers[conversationId] || []).filter(id => id !== userId) } }));
    });
    void get().loadConversations(); void get().loadDirectory();
    refreshTimer = setInterval(() => { if (ticket !== session) return; void get().loadConversations(); const id = get().activeConversationId; if (id) void get().loadMoreMessages(); }, 15000);
  },
  disconnect: () => {
    session++; clearInterval(refreshTimer); get().socket?.disconnect();
    set({ socket: null, isConnected: false, currentUser: null, conversations: [], messages: {}, directory: [], activeConversationId: null, error: null, isLoading: false, typingUsers: {}, onlineUsers: new Set() });
  },
  loadDirectory: async () => {
    const ticket = session;
    try {
      let page = 1; let pages = 1; const users: MessengerUser[] = [];
      do { const result = await messengerRequest<{ data: MessengerUser[]; totalPages: number }>(`users?isActive=true&limit=100&page=${page}`); users.push(...result.data); pages = result.totalPages; page++; } while (page <= pages);
      if (ticket === session) set({ directory: users });
    } catch (error) { if (ticket === session) set({ error: errorText(error) }); }
  },
  loadConversations: async () => {
    const ticket = session;
    try { const conversations = await messengerRequest<ChatConversation[]>('messages/conversations'); if (ticket === session) set({ conversations }); }
    catch (error) { if (ticket === session) set({ error: errorText(error) }); }
  },
  selectConversation: async id => {
    const ticket = session;
    const previous = get().activeConversationId;
    if (previous) get().socket?.emit('conversation:leave', previous);
    set({ activeConversationId: id || null, error: null, isLoading: Boolean(id) });
    if (!id) return;
    try {
      const messages = await messengerRequest<ChatMessage[]>(`messages/conversations/${encodeURIComponent(id)}/messages`);
      if (ticket !== session) return;
      set(state => ({ messages: { ...state.messages, [id]: merge(messages, state.messages[id] || []) }, isLoading: false }));
      get().socket?.emit('conversation:join', id); await get().markAsRead(id);
    } catch (error) { if (ticket === session) set({ error: errorText(error), isLoading: false }); }
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
  setTyping: typing => { const id = get().activeConversationId; if (id) get().socket?.emit(typing ? 'typing:start' : 'typing:stop', id); },
  updatePresence: async () => {},
  loadMoreMessages: async cursor => {
    const id = get().activeConversationId, ticket = session;
    if (!id) return;
    try { const messages = await messengerRequest<ChatMessage[]>(`messages/conversations/${encodeURIComponent(id)}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`); if (ticket === session) set(state => ({ messages: { ...state.messages, [id]: merge(state.messages[id] || [], messages) } })); }
    catch (error) { if (ticket === session) set({ error: errorText(error) }); }
  },
}));
