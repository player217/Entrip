import { ConversationType, ParticipantRole, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';

const publicUser = { id: true, name: true, email: true, department: true, isActive: true } as const;
const messageInclude = { sender: { select: publicUser }, reactions: true, reads: true } as const;
const participantsInclude = { where: { isActive: true }, include: { user: { select: publicUser } } } as const;
type Actor = { id: string; companyCode: string };

export class MessageService {
  private scope(actor: Actor): Prisma.ConversationWhereInput {
    return {
      companyCode: actor.companyCode, deletedAt: null,
      participants: { some: { userId: actor.id, isActive: true }, none: { user: { companyCode: { not: actor.companyCode } } } },
    };
  }

  async requireMember(actor: Actor, id: string, write = false) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, ...this.scope(actor) }, include: { participants: participantsInclude },
    });
    const member = conversation?.participants.find(p => p.userId === actor.id);
    if (!conversation || !member?.user.isActive) throw new ApiError(404, '대화방을 찾을 수 없습니다.');
    if (write && member.role === ParticipantRole.VIEWER) throw new ApiError(403, '읽기 전용 참여자입니다.');
    return conversation;
  }

  async list(actor: Actor) {
    const conversations = await prisma.conversation.findMany({
      where: this.scope(actor), include: { participants: participantsInclude, messages: { orderBy: { createdAt: 'desc' }, take: 1, include: messageInclude } },
      orderBy: { lastActivity: 'desc' },
    });
    return Promise.all(conversations.map(async ({ messages, ...conversation }) => {
      const member = conversation.participants.find(p => p.userId === actor.id)!;
      const unreadCount = await prisma.message.count({ where: {
        conversationId: conversation.id, senderId: { not: actor.id }, deletedAt: null,
        ...(member.lastReadAt ? { createdAt: { gt: member.lastReadAt } } : {}),
      } });
      return { ...conversation, lastMessage: messages[0] ? this.serialize(messages[0]) : null, unreadCount };
    }));
  }

  async create(actor: Actor, participantIds: string[], type: ConversationType, name?: string) {
    const ids = [...new Set([actor.id, ...participantIds])];
    if (ids.length < 2 || ids.length > 100 || (type === 'DIRECT' && ids.length !== 2)) throw new ApiError(400, '참여자를 확인하세요.');
    const users = await prisma.user.count({ where: { id: { in: ids }, companyCode: actor.companyCode, isActive: true } });
    if (users !== ids.length) throw new ApiError(400, '같은 회사의 활성 직원만 참여할 수 있습니다.');
    const result = await prisma.$transaction(async tx => {
      if (type === 'DIRECT') {
        // Serialize creation of the same pair without locking unrelated conversations.
        const key = `${actor.companyCode}:${[...ids].sort().join(':')}`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        const existing = await tx.conversation.findFirst({ where: {
          companyCode: actor.companyCode, type: 'DIRECT', deletedAt: null,
          AND: ids.map(id => ({ participants: { some: { userId: id, isActive: true } } })),
          participants: { none: { userId: { notIn: ids } } },
        }, include: { participants: participantsInclude } });
        if (existing) return existing;
      }
      return tx.conversation.create({ data: {
        companyCode: actor.companyCode, type, name: name?.trim() || null, createdBy: actor.id,
        participants: { create: ids.map(userId => ({ userId, role: userId === actor.id ? 'OWNER' : 'MEMBER', canInvite: true, canManage: userId === actor.id })) },
      }, include: { participants: participantsInclude } });
    });
    return { ...result, unreadCount: 0, lastMessage: null };
  }

  async invite(actor: Actor, conversationId: string, participantIds: string[]) {
    const conversation = await this.requireMember(actor, conversationId, true);
    const member = conversation.participants.find(p => p.userId === actor.id)!;
    if (!conversation.allowInvites || !(member.canInvite || member.role === 'OWNER' || member.role === 'ADMIN')) throw new ApiError(403, '초대 권한이 없습니다.');
    const ids = [...new Set(participantIds)];
    if (!ids.length || ids.length > 100) throw new ApiError(400, '초대할 직원을 선택하세요.');
    const users = await prisma.user.count({ where: { id: { in: ids }, companyCode: actor.companyCode, isActive: true } });
    if (users !== ids.length) throw new ApiError(400, '같은 회사의 활성 직원만 초대할 수 있습니다.');
    await prisma.$transaction(async tx => {
      for (const userId of ids) await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId, invitedBy: actor.id, canInvite: true },
        update: { isActive: true, leftAt: null },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { type: 'GROUP', lastActivity: new Date() } });
    });
    return this.requireMember(actor, conversationId);
  }

  serialize<T extends { deletedAt: Date | null; content: string }>(message: T) {
    return { ...message, content: message.deletedAt ? '삭제된 메시지입니다.' : message.content, isDeleted: Boolean(message.deletedAt) };
  }

  async messages(actor: Actor, conversationId: string, cursor?: string) {
    await this.requireMember(actor, conversationId);
    const before = cursor ? await prisma.message.findFirst({ where: { id: cursor, conversationId } }) : null;
    if (cursor && !before) throw new ApiError(400, '잘못된 메시지 커서입니다.');
    const messages = await prisma.message.findMany({ where: {
      conversationId, ...(before ? { OR: [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }] } : {}),
    }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, include: messageInclude });
    return messages.reverse().map(message => this.serialize(message));
  }

  async send(actor: Actor, conversationId: string, content: string) {
    await this.requireMember(actor, conversationId, true);
    const text = content.trim();
    if (!text || text.length > 10000) throw new ApiError(400, '메시지는 1~10,000자까지 입력할 수 있습니다.');
    const message = await prisma.$transaction(async tx => {
      const result = await tx.message.create({ data: { conversationId, senderId: actor.id, content: text }, include: messageInclude });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastActivity: result.createdAt } });
      await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: actor.id } }, data: { lastReadAt: result.createdAt } });
      return result;
    });
    return this.serialize(message);
  }

  async edit(actor: Actor, messageId: string, content: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new ApiError(404, '메시지를 찾을 수 없습니다.');
    await this.requireMember(actor, message.conversationId, true);
    if (message.senderId !== actor.id) throw new ApiError(403, '본인의 메시지만 수정할 수 있습니다.');
    if (message.deletedAt || !content.trim() || content.length > 10000) throw new ApiError(400, '수정할 메시지를 확인하세요.');
    return this.serialize(await prisma.message.update({ where: { id: messageId }, data: { content: content.trim(), isEdited: true, editedAt: new Date() }, include: messageInclude }));
  }

  async remove(actor: Actor, messageId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new ApiError(404, '메시지를 찾을 수 없습니다.');
    await this.requireMember(actor, message.conversationId, true);
    if (message.senderId !== actor.id) throw new ApiError(403, '본인의 메시지만 삭제할 수 있습니다.');
    return this.serialize(await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), status: 'DELETED' }, include: messageInclude }));
  }

  async markRead(actor: Actor, conversationId: string) {
    await this.requireMember(actor, conversationId);
    await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: actor.id } }, data: { lastReadAt: new Date() } });
  }
}

export const messageService = new MessageService();
