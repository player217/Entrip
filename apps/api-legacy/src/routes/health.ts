import { Router } from 'express';

const router: Router = Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     operationId: getHealth
 *     tags: [Health]
 *     summary: 서버 헬스 체크
 *     description: API 서버가 정상적으로 작동하는지 확인합니다.
 *     security: []
 *     responses:
 *       200:
 *         description: 서버가 정상적으로 작동 중
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-28T12:00:00.000Z"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;