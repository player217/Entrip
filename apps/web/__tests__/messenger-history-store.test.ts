import { useMessengerStore, ChatMessage } from '../src/lib/messenger-store';

const mockHandlers = new Map<string, (...args: any[]) => void>();
const mockSocket = { on: jest.fn((name: string, fn: (...args: any[]) => void) => { mockHandlers.set(name, fn); }), emit: jest.fn(), disconnect: jest.fn() };
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));
const user = { id: 'me', name: '검토자', email: 'me@example.test', companyCode: 'test' };
const rows = (count: number, offset = 0): ChatMessage[] => Array.from({ length: count }, (_, i) => ({
  id: `m${offset + i}`, conversationId: 'room', senderId: 'me', sender: user, content: 'test', type: 'TEXT', isEdited: false, isDeleted: false, createdAt: new Date(1700000000000 + (offset + i) * 1000).toISOString(),
}));
const response = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => data } as Response);

beforeEach(() => {
  useMessengerStore.getState().disconnect(); mockHandlers.clear(); jest.clearAllMocks();
  useMessengerStore.setState({ currentUser: user, activeConversationId: 'room' });
  global.fetch = jest.fn();
});
afterEach(() => { useMessengerStore.getState().disconnect(); jest.useRealTimers(); });

it('marks the final history page exhausted and latest-message polling cannot re-enable it', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 5))).mockResolvedValueOnce(response({}));
  await useMessengerStore.getState().selectConversation('room');
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(true);
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(5)));
  await useMessengerStore.getState().loadMoreMessages('m5');
  expect(useMessengerStore.getState().messages.room).toHaveLength(55);
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 5)));
  await useMessengerStore.getState().loadMoreMessages();
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);
  const requests = (fetch as jest.Mock).mock.calls.length;
  await useMessengerStore.getState().loadMoreMessages('m0');
  expect(fetch).toHaveBeenCalledTimes(requests);
});

it('deduplicates concurrent older-history requests and releases the loading state', async () => {
  useMessengerStore.setState({ messages: { room: rows(50, 5) }, hasOlderMessages: { room: true } });
  let resolve!: (value: Response) => void;
  (fetch as jest.Mock).mockReturnValueOnce(new Promise<Response>(done => { resolve = done; }));
  const first = useMessengerStore.getState().loadMoreMessages('m5');
  await useMessengerStore.getState().loadMoreMessages('m5');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(useMessengerStore.getState().loadingOlderMessages.room).toBe(true);
  resolve(response(rows(5))); await first;
  expect(useMessengerStore.getState().loadingOlderMessages.room).toBe(false);
});

it('keeps history retry available after a failed request', async () => {
  useMessengerStore.setState({ messages: { room: rows(50, 5) }, hasOlderMessages: { room: true } });
  (fetch as jest.Mock).mockResolvedValueOnce(response({ message: '잠시 후 다시 시도하세요.' }, false));
  await useMessengerStore.getState().loadMoreMessages('m5');
  expect(useMessengerStore.getState().loadingOlderMessages.room).toBe(false);
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(true);
  expect(useMessengerStore.getState().error).toBe('잠시 후 다시 시도하세요.');
});

it('does not restore old tenant messages after logout while history is loading', async () => {
  useMessengerStore.setState({ messages: { room: rows(50, 5) }, hasOlderMessages: { room: true } });
  let resolve!: (value: Response) => void;
  (fetch as jest.Mock).mockReturnValueOnce(new Promise<Response>(done => { resolve = done; }));
  const request = useMessengerStore.getState().loadMoreMessages('m5');
  useMessengerStore.getState().disconnect(); resolve(response(rows(5))); await request;
  expect(useMessengerStore.getState().messages).toEqual({});
  expect(useMessengerStore.getState().loadingOlderMessages).toEqual({});
});

it('expires a lost typing-stop signal and clears typing timers on disconnect', async () => {
  jest.useFakeTimers();
  (fetch as jest.Mock).mockImplementation(async (url: string) => response(url.includes('/users?') ? { data: [], totalPages: 1 } : []));
  useMessengerStore.getState().connect();
  mockHandlers.get('typing:status')!({ conversationId: 'room', userId: 'other', isTyping: true });
  expect(useMessengerStore.getState().typingUsers.room).toEqual(['other']);
  jest.advanceTimersByTime(4000);
  expect(useMessengerStore.getState().typingUsers.room).toEqual([]);
  mockHandlers.get('typing:status')!({ conversationId: 'room', userId: 'other', isTyping: true });
  useMessengerStore.getState().disconnect();
  expect(jest.getTimerCount()).toBe(0);
});

it('can stop typing for the previous room without marking the current room', () => {
  useMessengerStore.setState({ socket: mockSocket as any, activeConversationId: 'current' });
  useMessengerStore.getState().setTyping(false, 'previous');
  expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', 'previous');
});

it('fills a gap before the latest page instead of skipping to an older cached cursor', async () => {
  useMessengerStore.setState({ messages: { room: rows(5) }, hasOlderMessages: { room: false } });
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 80)));
  await useMessengerStore.getState().loadMoreMessages();
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(true);
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 30)));
  await useMessengerStore.getState().loadMoreMessages('m0');
  expect((fetch as jest.Mock).mock.calls[1][0]).toContain('?cursor=m80');
  expect(useMessengerStore.getState().olderMessageCursors.room).toBe('m30');
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(30)));
  await useMessengerStore.getState().loadMoreMessages('m0');
  expect((fetch as jest.Mock).mock.calls[2][0]).toContain('?cursor=m30');
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);
  expect(useMessengerStore.getState().messages.room).toHaveLength(130);
});

it.each(['poll', 'select'] as const)('does not let an isolated realtime message hide an offline history gap during %s', async refresh => {
  jest.useFakeTimers();
  let latest = rows(5);
  (fetch as jest.Mock).mockImplementation(async (url: string) => response(
    url.includes('/users?') ? { data: [], totalPages: 1 }
      : url.endsWith('/messages') ? latest
        : url.endsWith('/read') ? {} : [],
  ));
  useMessengerStore.getState().connect();
  await useMessengerStore.getState().selectConversation('room');
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);
  expect(useMessengerStore.getState().historyMessageIds.room).toEqual(rows(5).map(message => message.id));

  // Messages m5..m128 arrived while offline; only m129 was delivered live on
  // reconnect. Its overlap with the latest REST page must not prove continuity.
  mockHandlers.get('message:new')!({ conversationId: 'room', message: rows(1, 129)[0] });
  expect(useMessengerStore.getState().messages.room).toHaveLength(6);
  expect(useMessengerStore.getState().historyMessageIds.room).not.toContain('m129');
  latest = rows(50, 80);
  if (refresh === 'poll') await useMessengerStore.getState().loadMoreMessages();
  else await useMessengerStore.getState().selectConversation('room');
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(true);
  expect(useMessengerStore.getState().olderMessageCursors.room).toBe('m80');

  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 30)));
  await useMessengerStore.getState().loadMoreMessages('m0');
  expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('?cursor=m80'), expect.anything());
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(30)));
  await useMessengerStore.getState().loadMoreMessages('m0');
  expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('?cursor=m30'), expect.anything());
  expect(useMessengerStore.getState().messages.room.map(message => message.id)).toEqual(rows(130).map(message => message.id));
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);

  await useMessengerStore.getState().loadMoreMessages();
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(false);
});

it('keeps the new gap frontier when an older request finishes after a disjoint latest page', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 5))).mockResolvedValueOnce(response({}));
  await useMessengerStore.getState().selectConversation('room');
  let resolve!: (value: Response) => void;
  (fetch as jest.Mock).mockReturnValueOnce(new Promise<Response>(done => { resolve = done; }));
  const oldRequest = useMessengerStore.getState().loadMoreMessages('m5');

  (fetch as jest.Mock).mockResolvedValueOnce(response(rows(50, 80)));
  await useMessengerStore.getState().loadMoreMessages();
  resolve(response(rows(5))); await oldRequest;
  expect(useMessengerStore.getState().messages.room).toHaveLength(105);
  expect(useMessengerStore.getState().hasOlderMessages.room).toBe(true);
  expect(useMessengerStore.getState().olderMessageCursors.room).toBe('m80');
  expect(useMessengerStore.getState().historyMessageIds.room).toEqual(rows(50, 80).map(message => message.id));
});
