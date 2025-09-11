import express, { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * Test Outbox functionality
 * Development only endpoint
 */
router.post('/test', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { topic = 'booking:created', payload = { bookingId: 'test123' } } = req.body;
    
    // Create test outbox message
    const message = await prisma.outbox.create({
      data: {
        topic,
        payload
      }
    });

    res.json({
      success: true,
      message: 'Test outbox message created',
      data: message
    });
  } catch (error) {
    console.error('Error creating test outbox message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test message'
    });
  }
});

/**
 * Get Outbox status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [pending, delivered, failed, total] = await Promise.all([
      prisma.outbox.count({
        where: { deliveredAt: null, attempts: { lt: 5 } }
      }),
      prisma.outbox.count({
        where: { deliveredAt: { not: null } }
      }),
      prisma.outbox.count({
        where: { deliveredAt: null, attempts: { gte: 5 } }
      }),
      prisma.outbox.count()
    ]);

    res.json({
      success: true,
      stats: {
        pending,
        delivered,
        failed,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get outbox status'
    });
  }
});

export default router;