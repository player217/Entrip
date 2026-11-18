import { Router, type Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// Only a configured source is queried. A source outage must never become a
// successful empty schedule or a fabricated "live" schedule.
router.get('/schedule/:airport', async (req, res) => {
  const airport = req.params.airport.toUpperCase();
  if (!/^[A-Z]{3}$/.test(airport)) {
    res.status(400).json({ success: false, message: 'Invalid airport code' });
    return;
  }
  const source = process.env.CRAWLER_API_URL || process.env.INTERNAL_CRAWLER_URL;
  if (!source) {
    res.status(503).json({ success: false, code: 'FLIGHT_SOURCE_UNAVAILABLE', message: '항공편 데이터 제공 서버가 연결되지 않았습니다.' });
    return;
  }
  try {
    const response = await fetch(`${source.replace(/\/$/, '')}/api/schedule/${airport}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const payload = await response.json() as { airport?: string; crawledAt?: string; flights?: unknown[]; source?: string; stale?: boolean };
    if (!Array.isArray(payload.flights) || !payload.crawledAt || !Number.isFinite(Date.parse(payload.crawledAt))) throw new Error('Invalid schedule response');
    if (payload.flights.some((value) => {
      if (!value || typeof value !== 'object') return true;
      const flight = value as Record<string, unknown>;
      return ['airline', 'flightNo', 'destination', 'departureTime'].some(key => typeof flight[key] !== 'string')
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(flight.departureTime));
    })) throw new Error('Invalid flight row');
    const age = Date.now() - Date.parse(payload.crawledAt);
    res.set('Cache-Control', 'no-store').json({ ...payload, airport, source: payload.source || 'crawler', stale: Boolean(payload.stale) || age > 86400000 });
  } catch {
    res.status(503).json({ success: false, code: 'FLIGHT_SOURCE_UNAVAILABLE', message: '항공편 데이터를 갱신하지 못했습니다. 잠시 후 다시 시도하세요.' });
  }
});

export default router;
