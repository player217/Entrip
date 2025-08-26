import { PrismaClient, ConversationType, MessageType, ParticipantRole } from '@prisma/client';
import { io } from '../ws';

const prisma = new PrismaClient();

export class MessageService {
  // 대화방 생성 (1:1 또는 그룹)
  async createConversation(
    creatorId: string,
    participantIds: string[],
    type: ConversationType = ConversationType.DIRECT,
    name?: string
  ) {
    // 1:1 대화인 경우 기존 대화방 확인
    if (type === ConversationType.DIRECT && participantIds.length === 1) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          participants: {
            every: {
              userId: {
                in: [creatorId, participantIds[0]]
              }
            }
          }
        },
        include: {
          participants: {
            include: {
              user: true
            }
          },
          lastMessage: {
            include: {
              sender: true
            }
          }
        }
      });

      if (existingConversation) {
        return existingConversation;
      }
    }

    // 새 대화방 생성
    const conversation = await prisma.conversation.create({
      data: {
        type,
        name: type === ConversationType.DIRECT ? null : name,
        participants: {
          create: [
            {
              userId: creatorId,
              role: type === ConversationType.DIRECT ? ParticipantRole.MEMBER : ParticipantRole.OWNER
            },
            ...participantIds.map(userId => ({
              userId,
              role: ParticipantRole.MEMBER
            }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    // 참여자들에게 알림
    const socketIds = await this.getUserSocketIds([creatorId, ...participantIds]);
    socketIds.forEach(socketId => {
      io.to(socketId).emit('conversation:new', conversation);
    });

    return conversation;
  }

  // 대화방 목록 조회
  async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        lastMessage: {
          include: {
            sender: true,
            readBy: true
          }
        },
        messages: {
          where: {
            readBy: {
              none: {
                userId
              }
            }
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        lastActivity: 'desc'
      }
    });

    // 읽지 않은 메시지 수 계산
    const conversationsWithUnread = conversations.map(conv => ({
      ...conv,
      unreadCount: conv.messages.length,
      messages: undefined // messages 배열 제거
    }));

    return conversationsWithUnread;
  }

  // 메시지 전송
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    attachments?: any[],
    replyToId?: string
  ) {
    // 대화방 참여자 확인
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId
        }
      }
    });

    if (!participant) {
      throw new Error('You are not a participant of this conversation');
    }

    // 메시지 생성
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        replyToId,
        attachments: attachments ? {
          create: attachments
        } : undefined,
        readBy: {
          create: {
            userId: senderId
          }
        }
      },
      include: {
        sender: true,
        attachments: true,
        replyTo: {
          include: {
            sender: true
          }
        },
        readBy: true
      }
    });

    // 대화방 lastActivity 및 lastMessage 업데이트
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastActivity: new Date(),
        lastMessageId: message.id
      }
    });

    // 실시간 전송
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds(participants.map(p => p.userId));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('message:new', {
        conversationId,
        message
      });
    });

    return message;
  }

  // 메시지 목록 조회 (페이지네이션)
  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 50
  ) {
    // 참여자 확인
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      throw new Error('You are not a participant of this conversation');
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false
      },
      include: {
        sender: true,
        attachments: true,
        reactions: {
          include: {
            user: true
          }
        },
        readBy: {
          include: {
            user: true
          }
        },
        replyTo: {
          include: {
            sender: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      ...(cursor && {
        cursor: {
          id: cursor
        },
        skip: 1
      })
    });

    // 읽음 처리
    const unreadMessageIds = messages
      .filter(msg => !msg.readBy.some(r => r.userId === userId))
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessageIds.map(messageId => ({
          messageId,
          userId
        })),
        skipDuplicates: true
      });

      // 읽음 상태 브로드캐스트
      const otherParticipants = await prisma.conversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: userId }
        },
        select: { userId: true }
      });

      const socketIds = await this.getUserSocketIds(otherParticipants.map(p => p.userId));
      socketIds.forEach(socketId => {
        io.to(socketId).emit('message:read', {
          conversationId,
          messageIds: unreadMessageIds,
          userId
        });
      });
    }

    // lastReadAt 업데이트
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    return messages.reverse();
  }

  // 메시지 수정
  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!message || message.senderId !== userId) {
      throw new Error('Message not found or unauthorized');
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        sender: true,
        attachments: true
      }
    });

    // 실시간 업데이트
    const socketIds = await this.getUserSocketIds(
      message.conversation.participants.map(p => p.userId)
    );
    socketIds.forEach(socketId => {
      io.to(socketId).emit('message:updated', {
        conversationId: message.conversationId,
        message: updatedMessage
      });
    });

    return updatedMessage;
  }

  // 메시지 삭제
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!message || message.senderId !== userId) {
      throw new Error('Message not found or unauthorized');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // 실시간 업데이트
    const socketIds = await this.getUserSocketIds(
      message.conversation.participants.map(p => p.userId)
    );
    socketIds.forEach(socketId => {
      io.to(socketId).emit('message:deleted', {
        conversationId: message.conversationId,
        messageId
      });
    });

    return { success: true };
  }

  // 메시지 반응 추가/제거
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });

    if (existingReaction) {
      // 반응 제거
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id }
      });
    } else {
      // 반응 추가
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          include: {
            user: true
          }
        },
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    // 실시간 업데이트
    const socketIds = await this.getUserSocketIds(
      message!.conversation.participants.map(p => p.userId)
    );
    socketIds.forEach(socketId => {
      io.to(socketId).emit('message:reaction', {
        conversationId: message!.conversationId,
        messageId,
        reactions: message!.reactions
      });
    });

    return message!.reactions;
  }

  // 타이핑 상태 업데이트
  async updateTypingStatus(conversationId: string, userId: string, isTyping: boolean) {
    await prisma.userPresence.upsert({
      where: { userId },
      update: {
        isTyping,
        typingInConversation: isTyping ? conversationId : null
      },
      create: {
        userId,
        isTyping,
        typingInConversation: isTyping ? conversationId : null,
        status: 'ONLINE'
      }
    });

    // 다른 참여자들에게 알림
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId }
      },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds(participants.map(p => p.userId));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('typing:status', {
        conversationId,
        userId,
        isTyping
      });
    });
  }

  // 사용자 온라인 상태 업데이트
  async updatePresence(userId: string, status: string) {
    const presence = await prisma.userPresence.upsert({
      where: { userId },
      update: {
        status: status as any,
        lastSeen: new Date()
      },
      create: {
        userId,
        status: status as any,
        lastSeen: new Date()
      }
    });

    // 사용자의 모든 대화 참여자들에게 알림
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: {
                userId: { not: userId }
              }
            }
          }
        }
      }
    });

    const allUserIds = new Set<string>();
    conversations.forEach(conv => {
      conv.conversation.participants.forEach(p => {
        allUserIds.add(p.userId);
      });
    });

    const socketIds = await this.getUserSocketIds(Array.from(allUserIds));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('presence:update', {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen
      });
    });

    return presence;
  }

  // 참여자 추가
  async addParticipant(
    conversationId: string,
    userId: string,
    invitedById: string,
    role: ParticipantRole = ParticipantRole.MEMBER
  ) {
    // 권한 체크: OWNER 또는 ADMIN만 추가 가능
    const inviter = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: invitedById
        }
      }
    });

    if (!inviter || (inviter.role !== ParticipantRole.OWNER && inviter.role !== ParticipantRole.ADMIN)) {
      throw new Error('권한이 없습니다');
    }

    const participant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
        role,
        invitedById
      },
      include: {
        user: true,
        invitedBy: true
      }
    });

    // Socket 이벤트
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds(participants.map(p => p.userId));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('participant:added', {
        conversationId,
        participant
      });
    });

    return participant;
  }

  // 참여자 역할 변경 / 뮤트 토글
  async updateParticipant(
    conversationId: string,
    targetUserId: string,
    requesterId: string,
    data: {
      role?: ParticipantRole;
      muted?: boolean;
      nickname?: string;
    }
  ) {
    // 권한 체크
    const requester = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: requesterId
        }
      }
    });

    if (!requester) {
      throw new Error('참여자가 아닙니다');
    }

    // OWNER 변경은 현재 OWNER만 가능
    if (data.role === ParticipantRole.OWNER && requester.role !== ParticipantRole.OWNER) {
      throw new Error('OWNER만 OWNER를 변경할 수 있습니다');
    }

    // 역할 변경은 OWNER/ADMIN만 가능
    if (data.role && requester.role === ParticipantRole.MEMBER) {
      throw new Error('권한이 없습니다');
    }

    const updated = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      },
      data,
      include: {
        user: true
      }
    });

    // Socket 이벤트
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds(participants.map(p => p.userId));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('participant:updated', {
        conversationId,
        userId: targetUserId,
        patch: data
      });
    });

    return updated;
  }

  // 참여자 제거 (나가기/강퇴)
  async removeParticipant(
    conversationId: string,
    targetUserId: string,
    requesterId: string
  ) {
    // 본인 나가기 또는 OWNER/ADMIN의 강퇴
    if (targetUserId !== requesterId) {
      const requester = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: requesterId
          }
        }
      });

      if (!requester || (requester.role !== ParticipantRole.OWNER && requester.role !== ParticipantRole.ADMIN)) {
        throw new Error('권한이 없습니다');
      }
    }

    // OWNER가 나가는 경우, 다른 사람에게 OWNER 위임
    const targetParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      }
    });

    if (targetParticipant?.role === ParticipantRole.OWNER) {
      // 다음 OWNER 선정 (ADMIN > MEMBER > 가장 오래된 참여자)
      const nextOwner = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: { not: targetUserId }
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' }
        ]
      });

      if (nextOwner) {
        await prisma.conversationParticipant.update({
          where: { id: nextOwner.id },
          data: { role: ParticipantRole.OWNER }
        });
      }
    }

    // 참여자 제거
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      }
    });

    // Socket 이벤트
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds([...participants.map(p => p.userId), targetUserId]);
    socketIds.forEach(socketId => {
      io.to(socketId).emit('participant:removed', {
        conversationId,
        userId: targetUserId
      });
    });

    return { success: true };
  }

  // 읽음 포인터 갱신
  async markAsRead(
    conversationId: string,
    userId: string,
    messageId?: string
  ) {
    let lastReadAt = new Date();

    // messageId가 제공된 경우, 해당 메시지의 시간으로 설정
    if (messageId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { createdAt: true }
      });
      if (message) {
        lastReadAt = message.createdAt;
      }
    }

    // 참여자의 lastReadAt 업데이트
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: { lastReadAt }
    });

    // Socket 이벤트
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId }
      },
      select: { userId: true }
    });

    const socketIds = await this.getUserSocketIds(participants.map(p => p.userId));
    socketIds.forEach(socketId => {
      io.to(socketId).emit('conversation:read', {
        conversationId,
        userId,
        lastReadAt
      });
    });

    return { success: true, lastReadAt };
  }

  // 대화방 목록 조회 (unread 카운트 포함)
  async getConversationsWithUnread(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        lastMessage: {
          include: {
            sender: true
          }
        },
        participants: {
          where: { userId },
          select: {
            lastReadAt: true,
            muted: true,
            role: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // unread 카운트 계산
    const result = await Promise.all(conversations.map(async (c) => {
      const participant = c.participants[0];
      const lastReadAt = participant?.lastReadAt || new Date(0);
      
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: userId }
        }
      });

      return {
        ...c,
        unread,
        muted: participant?.muted || false,
        myRole: participant?.role || ParticipantRole.MEMBER
      };
    }));

    return result;
  }

  // Helper: 사용자 소켓 ID 가져오기
  private async getUserSocketIds(userIds: string[]): Promise<string[]> {
    // TODO: Redis나 메모리에서 사용자별 소켓 ID 매핑 관리
    // 현재는 간단히 room 사용
    return userIds.map(userId => `user:${userId}`);
  }
}

export const messageService = new MessageService();