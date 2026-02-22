/*
  Minimal free FX microservice
  - Tries providers in order: open.er-api.com -> Frankfurter (ECB) -> Fawaz Ahmed static JSON
  - In-memory cache with TTL
  - Endpoints:
    GET /health
    GET /rates/:base?symbols=USD,EUR,JPY,CNY   // returns base -> { quote: rateInBasePer1Quote }
    GET /exchange?from=USD&to=KRW              // returns single pair rate
    GET /exim?base=KRW&symbols=USD,EUR,JPY,CNY // EXIM-like payload, JPY(100) 처리
*/

const express = require('express');

const app = express();
const PORT = process.env.FX_FREE_PORT || 4010;
const DEFAULT_TTL_SEC = Number(process.env.FX_FREE_TTL_SEC || 3600); // 1h

// ------------------------- Simple in-memory cache -------------------------
const cache = new Map();
function setCache(key, value, ttlSec = DEFAULT_TTL_SEC) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

// ------------------------- Provider helpers ------------------------------
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Provider 1: open.er-api.com (free, no key)
async function fromOpenERAPI(base, symbols) {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const data = await fetchJson(url);
  if (data.result !== 'success' || !data.rates) throw new Error('ERAPI_BAD_RESPONSE');

  // Returned rates are: 1 base -> X quote (e.g., base KRW -> 0.0007 USD)
  // We want: base units per 1 quote (e.g., KRW per 1 USD) => invert
  const wanted = normalizeSymbols(symbols);
  const out = {};
  for (const q of wanted) {
    const r = data.rates[q];
    if (typeof r === 'number' && r > 0) out[q] = 1 / r;
  }
  return { provider: 'open.er-api.com', base, rates: out, timestamp: new Date(data.time_last_update_utc).toISOString() };
}

// Provider 2: Frankfurter (ECB). Supports many currencies including KRW.
async function fromFrankfurter(base, symbols) {
  // Frankfurter only allows certain bases; when base isn't supported,
  // query as EUR and transform using cross rates if needed.
  const wanted = normalizeSymbols(symbols);
  // If base is EUR, ask directly; else request EUR with wanted + base, then cross.
  const set = new Set([base, ...wanted]);
  const querySymbols = Array.from(set).filter(Boolean).join(',');
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(querySymbols)}`;
  const data = await fetchJson(url);
  if (!data.rates) throw new Error('FRANKFURTER_BAD_RESPONSE');

  // Build KRW-per-1-quote style for arbitrary base using EUR cross rates
  // EUR->X = data.rates[X]
  // Convert to base-per-quote: base/quote = (EUR->base) / (EUR->quote)
  // Finally return in base units per 1 quote.
  const eurToBase = base === 'EUR' ? 1 : data.rates[base];
  if (!eurToBase) throw new Error('BASE_UNSUPPORTED_BY_ECB');
  const out = {};
  for (const q of wanted) {
    const eurToQ = data.rates[q];
    if (q === base) { out[q] = 1; continue; }
    if (typeof eurToQ === 'number' && eurToQ > 0) out[q] = eurToBase / eurToQ;
  }
  return { provider: 'frankfurter.app(ECB)', base, rates: out, timestamp: data.date + 'T00:00:00Z' };
}

// Provider 3: Fawaz Ahmed currency JSON (static daily via jsdelivr)
async function fromFawaz(base, symbols) {
  const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${base.toLowerCase()}.json`;
  const data = await fetchJson(url);
  const baseObj = data[base.toLowerCase()];
  if (!baseObj) throw new Error('FAWAZ_BAD_RESPONSE');
  const wanted = normalizeSymbols(symbols);
  const out = {};
  for (const q of wanted) {
    const r = baseObj[q.toLowerCase()];
    // Here r is base->quote. We want base units per 1 quote => invert
    if (typeof r === 'number' && r > 0) out[q] = 1 / r;
  }
  return { provider: 'fawazahmed0/currency-api', base, rates: out, timestamp: data.date ? data.date + 'T00:00:00Z' : null };
}

function normalizeSymbols(symbols) {
  if (!symbols) return ['USD', 'EUR', 'JPY', 'CNY'];
  const arr = Array.isArray(symbols) ? symbols : String(symbols).split(',');
  return arr.map(s => s.trim().toUpperCase()).filter(Boolean);
}

async function getRates(base, symbols) {
  const key = `rates:${base}:${normalizeSymbols(symbols).join(',')}`;
  const cached = getCache(key);
  if (cached) return { ...cached, cache: 'HIT' };

  const providers = [fromOpenERAPI, fromFrankfurter, fromFawaz];
  const errors = [];
  for (const p of providers) {
    try {
      const res = await p(base, symbols);
      if (res && res.rates && Object.keys(res.rates).length) {
        setCache(key, { ...res, cache: 'MISS' });
        return { ...res, cache: 'MISS' };
      }
    } catch (e) {
      errors.push(`${p.name}:${e.message}`);
    }
  }
  const err = new Error('FX_UNAVAILABLE');
  err.details = errors;
  throw err;
}

// ------------------------------- Routes ----------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/rates/:base', async (req, res) => {
  const base = (req.params.base || 'KRW').toUpperCase();
  const symbols = req.query.symbols || 'USD,EUR,JPY,CNY';
  try {
    const result = await getRates(base, symbols);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(503).json({ success: false, error: 'FX_UNAVAILABLE', details: e.details || null });
  }
});

app.get('/exchange', async (req, res) => {
  const from = String(req.query.from || 'USD').toUpperCase();
  const to = String(req.query.to || 'KRW').toUpperCase();
  if (from === to) return res.json({ success: true, rate: 1 });
  try {
    // We standardize getRates(base=to) and read quote=from → rate(to per 1 from)
    const result = await getRates(to, from);
    const rate = result.rates[from];
    if (typeof rate !== 'number') throw new Error('PAIR_NOT_FOUND');
    res.json({ success: true, data: { from, to, rate }, meta: { provider: result.provider, timestamp: result.timestamp, cache: result.cache } });
  } catch (e) {
    res.status(503).json({ success: false, error: 'FX_UNAVAILABLE', message: e.message });
  }
});

// EXIM-like transform for frontend compatibility
app.get('/exim', async (req, res) => {
  const base = String(req.query.base || 'KRW').toUpperCase();
  const symbols = normalizeSymbols(req.query.symbols || 'USD,EUR,JPY,CNY');
  try {
    const { rates, provider, timestamp, cache: cacheState } = await getRates(base, symbols);
    // Build EXIM-like array. Note: JPY(100) 표기 처리
    const payload = symbols.map(sym => {
      if (sym === 'JPY') {
        const jpyPer100 = typeof rates['JPY'] === 'number' ? rates['JPY'] * 100 : null;
        return {
          cur_unit: 'JPY(100)',
          deal_bas_r: jpyPer100 ? jpyPer100.toFixed(2) : null,
          bkpr: jpyPer100 ? Math.round(jpyPer100 * 0.998).toString() : null,
          kftc_bkpr: jpyPer100 ? Math.round(jpyPer100 * 1.002).toString() : null,
          yy_efee_r: null,
          ten_dd_efee_r: null,
          RESULT: 1
        };
      }
      const v = rates[sym];
      return {
        cur_unit: sym,
        deal_bas_r: typeof v === 'number' ? v.toFixed(2) : null,
        bkpr: typeof v === 'number' ? Math.round(v * 0.998).toString() : null,
        kftc_bkpr: typeof v === 'number' ? Math.round(v * 1.002).toString() : null,
        yy_efee_r: null,
        ten_dd_efee_r: null,
        RESULT: 1
      };
    });
    res.json({ success: true, data: payload, meta: { provider, timestamp, cache: cacheState, base } });
  } catch (e) {
    res.status(503).json({ success: false, error: 'FX_UNAVAILABLE' });
  }
});

app.listen(PORT, () => {
  process.stdout.write(`[fx-free] listening on http://localhost:${PORT}\n`);
});
