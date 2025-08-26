import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'VIDEO' | 'LOCATION' | 'SYSTEM';
  attachments?: any[];
  reactions?: any[];
  readBy?: any[];
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  editedAt?: string;
}

interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'CHANNEL';
  name?: string;
  avatar?: string;
  participants: any[];
  lastMessage?: Message;
  unreadCount: number;
  lastActivity: string;
}

interface MessengerState {
  // State
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  onlineUsers: Set<string>;
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, type?: string, attachments?: any[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  createConversation: (participantIds: string[], type?: string, name?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  updatePresence: (status: string) => Promise<void>;
  loadMoreMessages: (cursor?: string) => Promise<void>;
}

// Use consistent API configuration
const isServer = typeof window === 'undefined';
const API_URL = isServer 
  ? (process.env.INTERNAL_API_URL || 'http://api:4000')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001');
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export const useMessengerStore = create<MessengerState>((set, get) => ({
  // Initial state
  socket: null,
  isConnected: false,
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  currentUser: null,
  isLoading: false,
  error: null,

  // Connect to WebSocket
  connect: (token: string) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to messenger');
      set({ isConnected: true, socket });
      get().loadConversations();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from messenger');
      set({ isConnected: false });
    });

    // Message events
    socket.on('message:new', ({ conversationId, message }: any) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), message],
        },
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: message, unreadCount: conv.unreadCount + 1 }
            : conv
        ),
      }));
    });

    socket.on('message:updated', ({ conversationId, message }: any) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((msg) =>
            msg.id === message.id ? message : msg
          ),
        },
      }));
    });

    socket.on('message:deleted', ({ conversationId, messageId }: any) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter(
            (msg) => msg.id !== messageId
          ),
        },
      }));
    });

    // Typing events
    socket.on('typing:status', ({ conversationId, userId, isTyping }: any) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: isTyping
            ? [...(state.typingUsers[conversationId] || []), userId]
            : (state.typingUsers[conversationId] || []).filter((id) => id !== userId),
        },
      }));
    });

    // Presence events
    socket.on('presence:update', ({ userId, status }: any) => {
      set((state) => {
        const onlineUsers = new Set(state.onlineUsers);
        if (status === 'ONLINE') {
          onlineUsers.add(userId);
        } else {
          onlineUsers.delete(userId);
        }
        return { onlineUsers };
      });
    });

    // New conversation
    socket.on('conversation:new', (conversation: Conversation) => {
      set((state) => ({
        conversations: [conversation, ...state.conversations],
      }));
    });

    set({ socket });
  },

  // Disconnect from WebSocket
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Load conversations
  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies for authentication
      });
      const conversations = await response.json();
      set({ conversations, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Select conversation
  selectConversation: async (conversationId: string) => {
    const { socket } = get();
    set({ activeConversationId: conversationId, isLoading: true });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include', // Include cookies for authentication
        }
      );
      const messages = await response.json();

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messages,
        },
        isLoading: false,
      }));

      // Join conversation room
      if (socket) {
        socket.emit('conversation:join', conversationId);
      }

      // Mark as read
      get().markAsRead(conversationId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Send message
  sendMessage: async (content: string, type = 'TEXT', attachments = []) => {
    const { activeConversationId, socket } = get();
    if (!activeConversationId || !socket) return;

    socket.emit('message:send', {
      conversationId: activeConversationId,
      content,
      type,
      attachments,
    });
  },

  // Edit message
  editMessage: async (messageId: string, content: string) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('message:edit', {
      messageId,
      content,
    });
  },

  // Delete message
  deleteMessage: async (messageId: string) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('message:delete', messageId);
  },

  // Toggle reaction
  toggleReaction: async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/messages/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
        credentials: 'include', // Include cookies for authentication
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Mark as read
  markAsRead: async (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
    }));
  },

  // Create conversation
  createConversation: async (participantIds: string[], type = 'DIRECT', name?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds,
          type,
          name,
        }),
        credentials: 'include', // Include cookies for authentication
      });
      const conversation = await response.json();
      
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        activeConversationId: conversation.id,
      }));

      // Load messages for new conversation
      get().selectConversation(conversation.id);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Set typing status
  setTyping: (isTyping: boolean) => {
    const { activeConversationId, socket } = get();
    if (!activeConversationId || !socket) return;

    socket.emit(isTyping ? 'typing:start' : 'typing:stop', activeConversationId);
  },

  // Update presence
  updatePresence: async (status: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/messages/presence`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
        credentials: 'include', // Include cookies for authentication
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Load more messages
  loadMoreMessages: async (cursor?: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${API_URL}/api/messages/conversations/${activeConversationId}/messages`);
      if (cursor) url.searchParams.append('cursor', cursor);
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies for authentication
      });
      const newMessages = await response.json();

      set((state) => ({
        messages: {
          ...state.messages,
          [activeConversationId]: [
            ...newMessages,
            ...(state.messages[activeConversationId] || []),
          ],
        },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));