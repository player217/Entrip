import useSWR from 'swr';

export type Rate = { 
  unit: 'USD' | 'EUR' | 'JPY' | 'CNY'; 
  rate: number; 
  diff: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch exchange rates');
  return res.json();
};

export const useExchangeRates = () => {
  const { data, error, isLoading } = useSWR<Rate[]>(
    '/api/exchange',
    async (url) => {
      interface ExchangeRateRow {
        cur_unit: string;
        deal_bas_r: string;
        yy_efee_r?: string;
      }
      const rows = await fetcher(url) as ExchangeRateRow[];
      
      // EXIM uses CNH for CNY, and JPY(100) for JPY
      const pick = ['USD', 'EUR', 'JPY(100)', 'CNH'];
      
      const filtered = rows.filter(r => pick.includes(r.cur_unit));
      
      const result = filtered.map(r => {
        const unit = r.cur_unit.replace('(100)', '').replace('CNH', 'CNY') as Rate['unit'];
        let rate = Number(r.deal_bas_r.replace(/,/g, ''));
        
        // JPY는 100엔 기준이므로 100으로 나눔
        if (r.cur_unit === 'JPY(100)') {
          rate = rate / 100;
        }
        
        return {
          unit,
          rate,
          diff: Number(r.yy_efee_r || 0) // 전일 대비 %
        };
      });
      
      // Sort to match original order: USD, EUR, JPY, CNY
      const sortOrder = ['USD', 'EUR', 'JPY', 'CNY'];
      const sorted = result.sort((a, b) => {
        return sortOrder.indexOf(a.unit) - sortOrder.indexOf(b.unit);
      });
      
      return sorted;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 1000 * 60 * 60, // 1 hour
    }
  );

  return {
    data,
    error,
    isLoading,
  };
};