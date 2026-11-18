import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import { authService } from '../routes/auth/auth.service';
import { User } from '@prisma/client';

const cookie = (user: User) => `auth-token=${authService.generateTokens(user).accessToken}`;
let admin: User, member: User, third: User, outsider: User;
beforeEach(async () => {
  const create = (name: string, companyCode = 'entrip', role: 'ADMIN' | 'USER' = 'USER') => prisma.user.create({ data: { name, email: `${name}@test.com`, password: 'unused', companyCode, role } });
  [admin, member, third, outsider] = await Promise.all([create('Admin', 'entrip', 'ADMIN'), create('Member'), create('Third'), create('Other', 'j1')]);
});
const as = (user: User) => ({
  get: (path: string) => request(app).get(`/api/v2/${path}`).set('Cookie', cookie(user)),
  post: (path: string, body: object = {}) => request(app).post(`/api/v2/${path}`).set('Cookie', cookie(user)).send(body),
  put: (path: string, body: object) => request(app).put(`/api/v2/${path}`).set('Cookie', cookie(user)).send(body),
  delete: (path: string) => request(app).delete(`/api/v2/${path}`).set('Cookie', cookie(user)),
});

describe('Persistent messaging and tenant authorization', () => {
  it('reuses direct rooms, persists messages and invites into the existing room', async () => {
    const create = await as(admin).post('messages/conversations', { participantIds: [member.id] }).expect(201);
    const room = create.body.id;
    const duplicate = await as(member).post('messages/conversations', { participantIds: [admin.id] }).expect(201);
    expect(duplicate.body.id).toBe(room);
    const sent = await as(admin).post(`messages/conversations/${room}/messages`, { content: '고객 일정 확인 부탁드립니다.' }).expect(201);
    const received = await as(member).get(`messages/conversations/${room}/messages`).expect(200);
    expect(received.body[0].id).toBe(sent.body.id);
    expect(received.body[0].sender.password).toBeUndefined();
    await as(member).post(`messages/conversations/${room}/participants`, { participantIds: [third.id] }).expect(200);
    const history = await as(third).get(`messages/conversations/${room}/messages`).expect(200);
    expect(history.body[0].content).toBe(sent.body.content);
    expect((await prisma.conversation.findUniqueOrThrow({ where: { id: room } })).type).toBe('GROUP');
  });
  it('rejects cross-company access, invitation and forged sender fields', async () => {
    const room = (await as(admin).post('messages/conversations', { participantIds: [member.id] }).expect(201)).body.id;
    await as(outsider).get(`messages/conversations/${room}/messages`).expect(404);
    await as(admin).post(`messages/conversations/${room}/participants`, { participantIds: [outsider.id] }).expect(400);
    await as(admin).post('messages/conversations', { participantIds: [outsider.id] }).expect(400);
    const message = await as(member).post(`messages/conversations/${room}/messages`, { content: 'Actual sender', senderId: admin.id }).expect(201);
    expect(message.body.senderId).toBe(member.id);
    await as(admin).put(`messages/messages/${message.body.id}`, { content: 'forged' }).expect(403);
    await as(admin).delete(`messages/messages/${message.body.id}`).expect(403);
  });
  it('tracks unread messages and hides deleted content', async () => {
    const room = (await as(admin).post('messages/conversations', { participantIds: [member.id] }).expect(201)).body.id;
    const sent = await as(admin).post(`messages/conversations/${room}/messages`, { content: 'First' }).expect(201);
    expect((await as(member).get('messages/conversations').expect(200)).body[0].unreadCount).toBe(1);
    await as(member).post(`messages/conversations/${room}/read`).expect(200);
    expect((await as(member).get('messages/conversations').expect(200)).body[0].unreadCount).toBe(0);
    await as(admin).put(`messages/messages/${sent.body.id}`, { content: 'Edited' }).expect(200);
    await as(admin).delete(`messages/messages/${sent.body.id}`).expect(200);
    const list = await as(member).get(`messages/conversations/${room}/messages`).expect(200);
    expect(list.body[0]).toMatchObject({ isDeleted: true, content: '삭제된 메시지입니다.' });
  });
  it('rejects viewer posting and inactive accounts', async () => {
    const room = (await as(admin).post('messages/conversations', { participantIds: [member.id] }).expect(201)).body.id;
    await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: room, userId: member.id } }, data: { role: 'VIEWER' } });
    await as(member).post(`messages/conversations/${room}/messages`, { content: 'not allowed' }).expect(403);
    await prisma.user.update({ where: { id: member.id }, data: { isActive: false } });
    await as(member).get('messages/conversations').expect(401);
  });
});

describe('Employee account management', () => {
  it('admin creates, edits, deactivates and reactivates same-company users', async () => {
    const created = await as(admin).post('users', { name: 'New staff', email: 'staff@test.com', password: 'testpassword', role: 'USER', companyCode: 'j1' }).expect(201);
    expect(created.body.companyCode).toBe('entrip'); expect(created.body.password).toBeUndefined();
    await as(admin).put(`users/${created.body.id}`, { name: 'Updated staff', department: '운영', role: 'MANAGER' }).expect(200);
    await as(admin).delete(`users/${created.body.id}`).expect(204);
    const all = await as(admin).get('users?isActive=all').expect(200);
    expect(all.body.data.find((u: User) => u.id === created.body.id).isActive).toBe(false);
    await as(admin).post(`users/${created.body.id}/reactivate`).expect(200);
    expect((await as(admin).get(`users/${created.body.id}`).expect(200)).body.department).toBe('운영');
  });
  it('forbids self elevation, self disabling and cross-company editing', async () => {
    await as(member).put(`users/${member.id}`, { role: 'ADMIN' }).expect(403);
    await as(member).put(`users/${member.id}`, { isActive: false }).expect(403);
    await as(admin).put(`users/${admin.id}`, { isActive: false }).expect(400);
    await as(admin).put(`users/${outsider.id}`, { name: 'Other' }).expect(404);
    const renamed = await as(member).put(`users/${member.id}`, { name: 'Own profile', companyCode: 'j1' }).expect(200);
    expect(renamed.body.companyCode).toBe('entrip');
    expect((await as(member).get('users').expect(200)).body.data.some((u: User) => u.id === outsider.id)).toBe(false);
  });
});


describe('Legacy employee Account isolation', () => {
  it('persists legacy employee records without leaking across companies', async () => {
    const created = await as(admin).post('accounts', { name: 'Legacy account', email: 'legacy@test.com', role: 'staff' }).expect(201);
    const id = created.body.data.id;
    expect(await prisma.account.count({ where: { id, companyCode: 'entrip' } })).toBe(1);
    expect((await as(outsider).get('accounts').expect(200)).body.data).toHaveLength(0);
    await as(outsider).get(`accounts/${id}`).expect(404);
    await as(admin).delete(`accounts/${id}`).expect(204);
    expect((await as(admin).get('accounts').expect(200)).body.data).toHaveLength(0);
    expect((await prisma.account.findUniqueOrThrow({ where: { id } })).status).toBe('DELETED');
  });
});
