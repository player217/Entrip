import { Router, Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

const router: Router = Router();

// 모든 메시지 라우트는 인증 필요
router.use(authMiddleware);

// 대화방 생성
const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  type: z.enum(['DIRECT', 'GROUP', 'CHANNEL']).optional(),
  name: z.string().optional()
});

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const validated = createConversationSchema.parse(req.body);
    const userId = (req as any).user.id;
    
    const conversation = await messageService.createConversation(
      userId,
      validated.participantIds,
      validated.type as any,
      validated.name
    );
    
    res.json(conversation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 대화방 목록 조회
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversations = await messageService.getConversations(userId);
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 메시지 전송
const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'VIDEO', 'LOCATION']).optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    thumbnailUrl: z.string().optional()
  })).optional(),
  replyToId: z.string().optional()
});

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const validated = sendMessageSchema.parse(req.body);
    const conversationId = req.params.id;
    const userId = (req as any).user.id;
    
    const message = await messageService.sendMessage(
      conversationId,
      userId,
      validated.content,
      validated.type as any,
      validated.attachments,
      validated.replyToId
    );
    
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 메시지 목록 조회
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = (req as any).user.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const messages = await messageService.getMessages(
      conversationId,
      userId,
      cursor,
      limit
    );
    
    res.json(messages);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 메시지 수정
router.put('/messages/:id', async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;
    const userId = (req as any).user.id;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const message = await messageService.editMessage(messageId, userId, content);
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 메시지 삭제
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;
    const userId = (req as any).user.id;
    
    const result = await messageService.deleteMessage(messageId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 메시지 반응 토글
router.post('/messages/:id/reactions', async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;
    const userId = (req as any).user.id;
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    const reactions = await messageService.toggleReaction(messageId, userId, emoji);
    res.json(reactions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 타이핑 상태 업데이트
router.post('/conversations/:id/typing', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = (req as any).user.id;
    const { isTyping } = req.body;
    
    await messageService.updateTypingStatus(conversationId, userId, isTyping);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 온라인 상태 업데이트
router.put('/presence', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.body;
    
    if (!['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const presence = await messageService.updatePresence(userId, status);
    res.json(presence);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========== 참여자 관리 API ==========

// 참여자 추가
const addParticipantSchema = z.object({
  userIds: z.array(z.string()).min(1),
  invitedById: z.string().optional()
});

router.post('/conversations/:id/participants', async (req: Request, res: Response) => {
  try {
    const validated = addParticipantSchema.parse(req.body);
    const conversationId = req.params.id;
    const requesterId = (req as any).user.id;
    
    // Add participants one by one (service method expects single userId)
    const participants = [];
    for (const userId of validated.userIds) {
      const participant = await messageService.addParticipant(
        conversationId,
        userId,
        validated.invitedById || requesterId
        // role defaults to MEMBER in the service method
      );
      participants.push(participant);
    }
    
    res.json(participants);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 참여자 정보 수정
const updateParticipantSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).optional(),
  muted: z.boolean().optional(),
  nickname: z.string().optional()
});

router.patch('/conversations/:id/participants/:userId', async (req: Request, res: Response) => {
  try {
    const validated = updateParticipantSchema.parse(req.body);
    const conversationId = req.params.id;
    const targetUserId = req.params.userId;
    const requesterId = (req as any).user.id;
    
    const participant = await messageService.updateParticipant(
      conversationId,
      targetUserId,
      requesterId,
      validated
    );
    
    res.json(participant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 참여자 제거
router.delete('/conversations/:id/participants/:userId', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const targetUserId = req.params.userId;
    const requesterId = (req as any).user.id;
    
    const result = await messageService.removeParticipant(
      conversationId,
      targetUserId,
      requesterId
    );
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 메시지 읽음 처리
router.post('/conversations/:id/read', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = (req as any).user.id;
    const { messageId } = req.body; // 선택적: 특정 메시지까지 읽음 처리
    
    const result = await messageService.markAsRead(
      conversationId,
      userId,
      messageId
    );
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// unread count 포함 대화방 목록 조회
router.get('/conversations/unread', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversations = await messageService.getConversationsWithUnread(userId);
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;