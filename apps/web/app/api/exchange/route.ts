import { NextResponse } from 'next/server';

interface ExchangeRow { cur_unit: string; deal_bas_r: string; [key: string]: unknown }

export async function GET() {
  const base = process.env.INTERNAL_API_V2_URL || process.env.API_V2_URL || 'http://localhost:4002';
  const urls = [`${base.replace(/\/$/, '')}/api/v2/fx/exim?base=KRW&symbols=USD,EUR,JPY,CNY`];
  if (process.env.INTERNAL_FX_FREE_URL) urls.push(`${process.env.INTERNAL_FX_FREE_URL.replace(/\/$/, '')}/exim?base=KRW&symbols=USD,EUR,JPY,CNY`);
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const payload = await response.json();
      const rows: ExchangeRow[] = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(rows) || !rows.length || rows.some(row => !row.cur_unit || !Number.isFinite(Number(String(row.deal_bas_r).replace(/,/g, ''))) || Number(String(row.deal_bas_r).replace(/,/g, '')) <= 0)) continue;
      return NextResponse.json(rows.map(row => ({ ...row, cur_unit: row.cur_unit === 'CNY' ? 'CNH' : row.cur_unit, yy_efee_r: null, ten_dd_efee_r: null })), { headers: { 'Cache-Control': 'no-store' } });
    } catch { /* Try the next explicitly configured source. */ }
  }
  return NextResponse.json({ success: false, message: '환율 제공 서버에 연결할 수 없습니다.' }, { status: 503 });
}
