import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { app } from '../index';
import prisma from '../lib/prisma';
import { financeService } from '../routes/finance/finance.service';
import { approvalsService } from '../routes/approvals/approvals.service';

let creator: User;
let reviewer: User;
let finalReviewer: User;
let outsider: User;
let accountId: string;
const companyCode = 'j1';
const transactionInput = () => ({
  type: 'income' as const,
  category: 'Deposit',
  amount: 1250.5,
  currency: 'KRW',
  exchangeRate: 1,
  occurredAt: '2026-11-17T00:00:00.000Z',
  accountId,
});
const approvalInput = (targetId?: string) => ({
  title: 'Travel payment',
  content: 'Review the itinerary deposit.',
  targetType: targetId ? ('finance' as const) : ('custom' as const),
  targetId,
  currency: 'KRW',
  steps: [
    { approverId: reviewer.id, order: 0 },
    { approverId: finalReviewer.id, order: 1 },
  ],
});

beforeEach(async () => {
  const password = await bcrypt.hash('finance-test-pass', 4);
  [creator, reviewer, finalReviewer, outsider] = await Promise.all([
    prisma.user.create({
      data: { email: 'creator@test.com', name: 'Requester', password, companyCode, role: 'ADMIN' },
    }),
    prisma.user.create({
      data: {
        email: 'reviewer@test.com',
        name: 'Reviewer',
        password,
        companyCode,
        role: 'MANAGER',
      },
    }),
    prisma.user.create({
      data: {
        email: 'final@test.com',
        name: 'Final reviewer',
        password,
        companyCode,
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        email: 'outsider@test.com',
        name: 'Other company',
        password,
        companyCode: 'OTHER',
        role: 'ADMIN',
      },
    }),
  ]);
  accountId = (
    await prisma.bankAccount.create({
      data: {
        companyCode,
        accountName: 'Operations',
        bankName: 'Test bank',
        accountNumber: '123',
        holderName: 'Travel',
        currency: 'KRW',
        openingBalance: 100,
        createdBy: creator.id,
      },
    })
  ).id;
});

test('bank balances include approved transactions only and persist edited pending amounts', async () => {
  const record = await financeService.createFinanceRecord(
    companyCode,
    creator.id,
    transactionInput()
  );
  const agent = request.agent(app);
  await agent
    .post('/api/v2/auth/login')
    .send({ email: creator.email, password: 'finance-test-pass', companyCode })
    .expect(200);
  let response = await agent.get('/api/v2/bank-accounts').expect(200);
  expect(Number(response.body.data[0].balance)).toBe(100);
  await financeService.updateFinanceRecord(record.id, companyCode, { amount: 300 }, creator.id);
  expect(Number((await financeService.findById(record.id, companyCode)).amount)).toBe(300);
  await expect(
    financeService.approveFinanceRecord(record.id, companyCode, creator.id, { status: 'approved' })
  ).rejects.toMatchObject({ statusCode: 403 });
  await financeService.approveFinanceRecord(record.id, companyCode, finalReviewer.id, {
    status: 'approved',
  });
  response = await agent.get('/api/v2/bank-accounts').expect(200);
  expect(Number(response.body.data[0].balance)).toBe(400);
  await expect(financeService.delete(record.id, companyCode)).rejects.toMatchObject({
    statusCode: 409,
  });
});

test('bank account history flag matches immutable-value guards, including deleted transactions', async () => {
  const agent = request.agent(app);
  await agent.post('/api/v2/auth/login')
    .send({ email: creator.email, password: 'finance-test-pass', companyCode })
    .expect(200);
  let response = await agent.get('/api/v2/bank-accounts').expect(200);
  expect(response.body.data[0].hasTransactions).toBe(false);
  expect(response.body.data[0]).not.toHaveProperty('_count');
  const record = await financeService.createFinanceRecord(companyCode, creator.id, transactionInput());
  response = await agent.get('/api/v2/bank-accounts').expect(200);
  expect(response.body.data[0].hasTransactions).toBe(true);
  await financeService.delete(record.id, companyCode);
  response = await agent.get('/api/v2/bank-accounts').expect(200);
  expect(response.body.data[0].hasTransactions).toBe(true);
  await agent.put(`/api/v2/bank-accounts/${accountId}`).send({
    accountName: 'Operations', bankName: 'Test bank', accountNumber: '123',
    holderName: 'Travel', currency: 'USD', openingBalance: 100,
  }).expect(409);
});

test('denies cross-company links and mismatched bank currency', async () => {
  await expect(
    financeService.createFinanceRecord('OTHER', outsider.id, transactionInput())
  ).rejects.toMatchObject({ statusCode: 404 });
  await expect(
    financeService.createFinanceRecord(companyCode, creator.id, {
      ...transactionInput(),
      currency: 'USD',
    })
  ).rejects.toMatchObject({ statusCode: 400 });
});

test('sequential approval enforces designated reviewers and finalizes finance exactly once', async () => {
  const record = await financeService.createFinanceRecord(
    companyCode,
    creator.id,
    transactionInput()
  );
  const approval = await approvalsService.create(approvalInput(record.id), creator);
  await expect(
    approvalsService.action(approval.id, { action: 'approve' }, finalReviewer)
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    approvalsService.action(approval.id, { action: 'approve' }, creator)
  ).rejects.toMatchObject({ statusCode: 403 });
  const outcomes = await Promise.allSettled([
    approvalsService.action(approval.id, { action: 'approve' }, reviewer),
    approvalsService.action(approval.id, { action: 'approve' }, reviewer),
  ]);
  expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect((await approvalsService.findById(approval.id, companyCode)).currentStep).toBe(1);
  expect((await financeService.findById(record.id, companyCode)).status).toBe('PENDING');
  await expect(
    approvalsService.update(approval.id, { status: 'cancelled' }, creator)
  ).rejects.toMatchObject({ statusCode: 409 });
  const done = await approvalsService.action(approval.id, { action: 'approve' }, finalReviewer);
  expect(done.status).toBe('approved');
  expect((await financeService.findById(record.id, companyCode)).status).toBe('APPROVED');
  await expect(
    approvalsService.action(approval.id, { action: 'approve' }, finalReviewer)
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(
    await prisma.notification.count({ where: { userId: creator.id, type: 'APPROVAL_APPROVED' } })
  ).toBe(1);
});

test('active approval locks transaction content and blocks duplicate requests or direct bypass', async () => {
  const record = await financeService.createFinanceRecord(
    companyCode,
    creator.id,
    transactionInput()
  );
  await approvalsService.create(approvalInput(record.id), creator);
  await expect(approvalsService.create(approvalInput(record.id), creator)).rejects.toMatchObject({
    statusCode: 409,
  });
  await expect(
    financeService.updateFinanceRecord(record.id, companyCode, { amount: 1 }, creator.id)
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    financeService.approveFinanceRecord(record.id, companyCode, finalReviewer.id, {
      status: 'approved',
    })
  ).rejects.toMatchObject({ statusCode: 409 });
});

test('cancellation before first action unlocks transaction editing and tenant access stays isolated', async () => {
  const record = await financeService.createFinanceRecord(
    companyCode,
    creator.id,
    transactionInput()
  );
  const approval = await approvalsService.create(approvalInput(record.id), creator);
  await expect(approvalsService.findById(approval.id, 'OTHER')).rejects.toMatchObject({
    statusCode: 404,
  });
  expect((await approvalsService.list({ page: 1, limit: 20 }, 'OTHER')).data).toHaveLength(0);
  await expect(
    approvalsService.update(approval.id, { status: 'cancelled' }, reviewer)
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(
    (await approvalsService.update(approval.id, { status: 'cancelled' }, creator)).status
  ).toBe('cancelled');
  expect(
    Number(
      (
        await financeService.updateFinanceRecord(
          record.id,
          companyCode,
          { amount: 200 },
          creator.id
        )
      ).amount
    )
  ).toBe(200);
});

test('rejects foreign, inactive, duplicate, self and transaction-creator approvers', async () => {
  await expect(
    approvalsService.create(
      { ...approvalInput(), steps: [{ approverId: outsider.id, order: 0 }] },
      creator
    )
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(
    approvalsService.create(
      { ...approvalInput(), steps: [{ approverId: creator.id, order: 0 }] },
      creator
    )
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(
    approvalsService.create(
      {
        ...approvalInput(),
        steps: [
          { approverId: reviewer.id, order: 0 },
          { approverId: reviewer.id, order: 1 },
        ],
      },
      creator
    )
  ).rejects.toMatchObject({ statusCode: 400 });
  await prisma.user.update({ where: { id: reviewer.id }, data: { isActive: false } });
  await expect(approvalsService.create(approvalInput(), creator)).rejects.toMatchObject({
    statusCode: 400,
  });
  const record = await financeService.createFinanceRecord(
    companyCode,
    finalReviewer.id,
    transactionInput()
  );
  await expect(
    approvalsService.create(
      { ...approvalInput(record.id), steps: [{ approverId: finalReviewer.id, order: 0 }] },
      creator
    )
  ).rejects.toMatchObject({ statusCode: 400 });
});

test('rejection is final and never changes account balance', async () => {
  const record = await financeService.createFinanceRecord(
    companyCode,
    creator.id,
    transactionInput()
  );
  const approval = await approvalsService.create(approvalInput(record.id), creator);
  const rejected = await approvalsService.action(
    approval.id,
    { action: 'reject', comment: 'Missing receipt' },
    reviewer
  );
  expect(rejected.status).toBe('rejected');
  expect((await financeService.findById(record.id, companyCode)).status).toBe('REJECTED');
  expect((await financeService.getStatsByMonth(companyCode, 2026, 11)).byCurrency).toEqual({});
});

test('bank HTTP CRUD uses persistent ids, keeps employee Account intact, and rejects edits after ledger use', async () => {
  const agent = request.agent(app);
  await agent
    .post('/api/v2/auth/login')
    .send({ email: creator.email, password: 'finance-test-pass', companyCode })
    .expect(200);
  const body = {
    accountName: 'New bank',
    bankName: 'Test',
    accountNumber: '456',
    holderName: 'Office',
    currency: 'USD',
    openingBalance: 25,
  };
  const created = await agent.post('/api/v2/bank-accounts').send(body).expect(201);
  const id = created.body.data.id;
  await agent
    .put(`/api/v2/bank-accounts/${id}`)
    .send({ ...body, accountName: 'Renamed bank' })
    .expect(200);
  expect((await prisma.bankAccount.findUniqueOrThrow({ where: { id } })).accountName).toBe(
    'Renamed bank'
  );
  expect(await prisma.account.count()).toBe(0);
  const other = request.agent(app);
  await other
    .post('/api/v2/auth/login')
    .send({ email: outsider.email, password: 'finance-test-pass', companyCode: 'OTHER' })
    .expect(200);
  await other.put(`/api/v2/bank-accounts/${id}`).send(body).expect(404);
  await other.delete(`/api/v2/bank-accounts/${id}`).expect(404);
  await agent.delete(`/api/v2/bank-accounts/${id}`).expect(204);
  expect((await prisma.bankAccount.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  await financeService.createFinanceRecord(companyCode, creator.id, transactionInput());
  const existing = {
    accountName: 'Operations',
    bankName: 'Test bank',
    accountNumber: '123',
    holderName: 'Travel',
    currency: 'KRW',
    openingBalance: 100,
  };
  await agent
    .put(`/api/v2/bank-accounts/${accountId}`)
    .send({ ...existing, openingBalance: 200 })
    .expect(409);
  await agent.delete(`/api/v2/bank-accounts/${accountId}`).expect(409);
});

test('monthly totals keep currencies separate and sum decimal amounts without floating drift', async () => {
  const usd = await prisma.bankAccount.create({
    data: {
      companyCode,
      accountName: 'USD',
      bankName: 'Test',
      accountNumber: 'usd',
      holderName: 'Travel',
      currency: 'USD',
      createdBy: creator.id,
    },
  });
  const entries = [
    { ...transactionInput(), amount: 0.1 },
    { ...transactionInput(), amount: 0.2, occurredAt: '2026-11-30T23:59:59.000Z' },
    {
      ...transactionInput(),
      accountId: usd.id,
      currency: 'USD',
      type: 'expense' as const,
      amount: 0.1,
    },
    { ...transactionInput(), amount: 9999, occurredAt: '2026-12-01T00:00:00.000Z' },
  ];
  for (const entry of entries) {
    const record = await financeService.createFinanceRecord(companyCode, creator.id, entry);
    await financeService.approveFinanceRecord(record.id, companyCode, finalReviewer.id, {
      status: 'approved',
    });
  }
  expect((await financeService.getStatsByMonth(companyCode, 2026, 11)).byCurrency).toEqual({
    KRW: { income: 0.3, expense: 0, balance: 0.3 },
    USD: { income: 0, expense: 0.1, balance: -0.1 },
  });
});
