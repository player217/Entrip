import { Router, type Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/exim', async (_req, res) => {
  const source = process.env.FX_FREE_URL || process.env.INTERNAL_FX_FREE_URL;
  if (!source) {
    res.status(503).json({ success: false, code: 'FX_SOURCE_UNAVAILABLE', message: '환율 제공 서버가 연결되지 않았습니다.' });
    return;
  }
  try {
    const response = await fetch(`${source.replace(/\/$/, '')}/exim?base=KRW&symbols=USD,EUR,JPY,CNY`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const data = await response.json() as { data?: unknown[] } | unknown[];
    if (!Array.isArray(data) && !Array.isArray(data.data)) throw new Error('Invalid exchange response');
    res.set('Cache-Control', 'no-store').json(data);
  } catch {
    res.status(503).json({ success: false, code: 'FX_SOURCE_UNAVAILABLE', message: '환율을 불러오지 못했습니다.' });
  }
});
export default router;
