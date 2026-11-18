import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MessengerWorkspace } from '../src/components/messenger/MessengerWorkspace';
import type { ChatMessage, ChatConversation } from '../src/lib/messenger-store';

let mockState: any;
jest.mock('../src/lib/messenger-store', () => ({
  useMessengerStore: Object.assign(() => mockState, { getState: () => mockState }),
}));

const user = { id: 'me', name: '검토자', email: 'me@example.test', companyCode: 'test' };
const colleague = { id: 'other', name: '동료', email: 'other@example.test', department: '예약팀' };
const room = (id: string): ChatConversation => ({ id, type: 'DIRECT', participants: [user, colleague].map(u => ({ userId: u.id, user: u, role: 'MEMBER' })), unreadCount: 0, lastActivity: '2026-01-01T00:00:00Z' });
const message = (id: number, content = `message ${id}`): ChatMessage => ({ id: `m${id}`, conversationId: 'room', senderId: colleague.id, sender: colleague, content, type: 'TEXT', isEdited: false, isDeleted: false, createdAt: `2026-01-01T00:00:${String(id).padStart(2, '0')}Z` });
const listSelector = '[role="region"][aria-label="대화 메시지"]';
const rowHeight = (row: Element) => row.textContent?.includes('TALL') ? 200 : 100;
const rectangles = (top: number, height: number) => ({ x: 0, y: top, left: 0, right: 300, top, bottom: top + height, width: 300, height, toJSON: () => ({}) });
let positions: WeakMap<HTMLElement, number>;
let originalTop: PropertyDescriptor | undefined;
let originalHeight: PropertyDescriptor | undefined;
let originalClient: PropertyDescriptor | undefined;
let rectSpy: jest.SpyInstance;

beforeAll(() => {
  originalTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
  originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
  originalClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.matches(listSelector) ? 300 : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() {
    if (!this.matches(listSelector)) return 0;
    return 30 + Array.from(this.querySelectorAll('[data-message-id]') as NodeListOf<HTMLElement>).reduce((sum, row) => sum + rowHeight(row), 0);
  } });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, get() { return positions.get(this) || 0; }, set(value: number) { positions.set(this, Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight))); } });
  rectSpy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.matches(listSelector)) return rectangles(0, 300);
    if (this.dataset.messageId) {
      const list = this.closest(listSelector) as HTMLElement;
      const rows = Array.from(list.querySelectorAll('[data-message-id]'));
      const index = rows.indexOf(this);
      const top = 30 + rows.slice(0, index).reduce((sum, row) => sum + rowHeight(row), 0) - list.scrollTop;
      return rectangles(top, rowHeight(this));
    }
    return rectangles(0, 0);
  });
});
afterAll(() => {
  rectSpy.mockRestore();
  for (const [name, value] of [['scrollTop', originalTop], ['scrollHeight', originalHeight], ['clientHeight', originalClient]] as const) {
    if (value) Object.defineProperty(HTMLElement.prototype, name, value);
    else delete (HTMLElement.prototype as any)[name];
  }
});
beforeEach(() => {
  positions = new WeakMap();
  mockState = {
    conversations: [room('room')], activeConversationId: 'room', messages: { room: [10, 11, 12, 13, 14, 15].map(id => message(id)) },
    hasOlderMessages: { room: true }, loadingOlderMessages: {}, currentUser: user, directory: [user, colleague], isDirectoryLoading: false,
    error: null, isConnected: true, isLoading: false, typingUsers: {},
    selectConversation: jest.fn(), createConversation: jest.fn(), invite: jest.fn(), sendMessage: jest.fn().mockResolvedValue(undefined),
    editMessage: jest.fn(), deleteMessage: jest.fn(), loadMoreMessages: jest.fn(), loadDirectory: jest.fn(), setTyping: jest.fn(),
  };
});
afterEach(() => { jest.useRealTimers(); });

it('keeps the same message at the same visual offset after older history is prepended', () => {
  const view = render(<MessengerWorkspace />);
  const list = screen.getByRole('region', { name: '대화 메시지' });
  list.scrollTop = 150; fireEvent.scroll(list);
  const before = view.container.querySelector('[data-message-id="m11"]')!.getBoundingClientRect().top;
  fireEvent.click(screen.getByRole('button', { name: '이전 메시지', exact: true }));
  expect(mockState.loadMoreMessages).toHaveBeenCalledWith('m10');
  mockState.messages = { room: [7, 8, 9, 10, 11, 12, 13, 14, 15].map(id => message(id)) };
  view.rerender(<MessengerWorkspace />);
  expect(list.scrollTop).toBe(450);
  expect(view.container.querySelector('[data-message-id="m11"]')!.getBoundingClientRect().top).toBe(before);
});

it('follows appended messages only when the reader was near the bottom', () => {
  const view = render(<MessengerWorkspace />);
  const list = screen.getByRole('region', { name: '대화 메시지' });
  expect(list.scrollTop).toBe(330);
  mockState.messages = { room: [...mockState.messages.room, message(16)] };
  view.rerender(<MessengerWorkspace />);
  expect(list.scrollTop).toBe(430);
  list.scrollTop = 150; fireEvent.scroll(list);
  mockState.messages = { room: [...mockState.messages.room, message(17)] };
  view.rerender(<MessengerWorkspace />);
  expect(list.scrollTop).toBe(150);
});

it('preserves the reading anchor when an earlier message changes height', () => {
  const view = render(<MessengerWorkspace />);
  const list = screen.getByRole('region', { name: '대화 메시지' });
  list.scrollTop = 150; fireEvent.scroll(list);
  const before = view.container.querySelector('[data-message-id="m11"]')!.getBoundingClientRect().top;
  mockState.messages = { room: [message(10, 'TALL edited message'), ...mockState.messages.room.slice(1)] };
  view.rerender(<MessengerWorkspace />);
  expect(list.scrollTop).toBe(250);
  expect(view.container.querySelector('[data-message-id="m11"]')!.getBoundingClientRect().top).toBe(before);
});

it('opens a different room at its newest messages instead of applying the old room offset', () => {
  const view = render(<MessengerWorkspace />);
  const list = screen.getByRole('region', { name: '대화 메시지' });
  list.scrollTop = 20; fireEvent.scroll(list);
  mockState.conversations.push(room('second'));
  mockState.activeConversationId = 'second';
  mockState.messages = { ...mockState.messages, second: [20, 21, 22, 23, 24, 25, 26].map(id => message(id)) };
  view.rerender(<MessengerWorkspace />);
  expect(list.scrollTop).toBe(430);
});

it('shows explicit no-match feedback in both conversation and employee searches', () => {
  render(<MessengerWorkspace />);
  fireEvent.change(screen.getByLabelText('대화 또는 직원 검색'), { target: { value: '없음' } });
  expect(screen.getByText('검색 조건에 맞는 대화가 없습니다.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '조직도', exact: true }));
  expect(screen.getByText('검색 조건에 맞는 직원이 없습니다.')).toBeVisible();
});

it('explains why there are no eligible employees to invite', () => {
  render(<MessengerWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: '직원 초대', exact: true }));
  expect(screen.getByText('초대할 수 있는 직원이 없습니다. 현재 직원이 모두 참여 중입니다.')).toBeVisible();
});

it('hides the history action when the store has exhausted older messages', () => {
  mockState.hasOlderMessages.room = false;
  render(<MessengerWorkspace />);
  expect(screen.queryByRole('button', { name: '이전 메시지', exact: true })).not.toBeInTheDocument();
});

it('stops typing after inactivity and clears the pending timer on unmount', () => {
  jest.useFakeTimers();
  const view = render(<MessengerWorkspace />);
  fireEvent.change(screen.getByLabelText('메시지', { exact: true }), { target: { value: '작성 중' } });
  expect(mockState.setTyping).toHaveBeenLastCalledWith(true, 'room');
  act(() => { jest.advanceTimersByTime(1500); });
  expect(mockState.setTyping).toHaveBeenLastCalledWith(false, 'room');
  fireEvent.change(screen.getByLabelText('메시지', { exact: true }), { target: { value: '다시 작성' } });
  view.unmount();
  expect(mockState.setTyping).toHaveBeenLastCalledWith(false, 'room');
  const calls = mockState.setTyping.mock.calls.length;
  act(() => { jest.advanceTimersByTime(5000); });
  expect(mockState.setTyping).toHaveBeenCalledTimes(calls);
});

it('sends typing stop for the old room when switching conversations', () => {
  jest.useFakeTimers();
  const view = render(<MessengerWorkspace />);
  fireEvent.change(screen.getByLabelText('메시지', { exact: true }), { target: { value: '작성 중' } });
  mockState.conversations.push(room('second')); mockState.activeConversationId = 'second';
  mockState.messages = { ...mockState.messages, second: [] };
  view.rerender(<MessengerWorkspace />);
  expect(mockState.setTyping).toHaveBeenLastCalledWith(false, 'room');
  const calls = mockState.setTyping.mock.calls.length;
  act(() => { jest.advanceTimersByTime(5000); });
  expect(mockState.setTyping).toHaveBeenCalledTimes(calls);
});
