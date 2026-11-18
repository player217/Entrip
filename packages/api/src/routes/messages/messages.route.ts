import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { messageService } from '../../services/message.service';
import { publishConversationEvent } from '../../ws';

const router: Router = Router();
router.use(authMiddleware);
const ids = z.array(z.string().min(1).max(100)).min(1).max(100);
const messageBody = z.object({ content: z.string().trim().min(1).max(10000) });
const run = (handler: (req: AuthRequest) => Promise<unknown>, status = 200): RequestHandler => async (req, res, next) => {
  try { res.status(status).json(await handler(req as AuthRequest)); } catch (error) { next(error); }
};
router.get('/conversations', run(req => messageService.list(req.user!)));
router.post('/conversations', validateBody(z.object({ participantIds: ids, type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'), name: z.string().trim().max(100).optional() })), run(async req => {
  const conversation = await messageService.create(req.user!, req.body.participantIds, req.body.type, req.body.name);
  await publishConversationEvent(conversation.id, 'conversation:updated', { conversationId: conversation.id });
  return conversation;
}, 201));
router.post('/conversations/:id/participants', validateBody(z.object({ participantIds: ids })), run(async req => {
  const conversation = await messageService.invite(req.user!, req.params.id, req.body.participantIds);
  await publishConversationEvent(conversation.id, 'conversation:updated', { conversationId: conversation.id });
  return conversation;
}));
router.get('/conversations/:id/messages', run(req => messageService.messages(req.user!, req.params.id, typeof req.query.cursor === 'string' ? req.query.cursor : undefined)));
router.post('/conversations/:id/messages', validateBody(messageBody), run(async req => {
  const message = await messageService.send(req.user!, req.params.id, req.body.content);
  await publishConversationEvent(message.conversationId, 'message:new', { conversationId: message.conversationId, message });
  return message;
}, 201));
router.post('/conversations/:id/read', run(async req => {
  await messageService.markRead(req.user!, req.params.id);
  return { success: true };
}));
router.put('/messages/:id', validateBody(messageBody), run(async req => {
  const message = await messageService.edit(req.user!, req.params.id, req.body.content);
  await publishConversationEvent(message.conversationId, 'message:updated', { conversationId: message.conversationId, message });
  return message;
}));
router.delete('/messages/:id', run(async req => {
  const message = await messageService.remove(req.user!, req.params.id);
  await publishConversationEvent(message.conversationId, 'message:updated', { conversationId: message.conversationId, message });
  return message;
}));
export default router;
