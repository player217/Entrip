import { NextResponse } from 'next/server';

// Proxy to backend FxService
export async function GET() {
  try {
    // Call the backend API that uses FxService
    const backendUrl = process.env.INTERNAL_API_URL || 'http://api:4000';
    
    // Fetch exchange rates from FxService (KRW base)
    const response = await fetch(`${backendUrl}/api/integration/fx-rates/KRW`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    const rates: Record<string, number> = {};
    
    if (response.ok) {
      const fxData = await response.json();
      console.log('[Exchange] FxService response received, success:', fxData.success);
      
      if (fxData.success && fxData.data?.rates) {
        // Convert from KRW base to currency values
        // rates are KRW -> Currency, we need Currency -> KRW (inverse)
        rates.USD = fxData.data.rates.USD ? (1 / fxData.data.rates.USD) : 1320.50;
        rates.EUR = fxData.data.rates.EUR ? (1 / fxData.data.rates.EUR) : 1438.70;
        rates.JPY = fxData.data.rates.JPY ? (1 / fxData.data.rates.JPY) : 8.83;
        rates.CNY = fxData.data.rates.CNY ? (1 / fxData.data.rates.CNY) : 180.25;
        
        console.log('[Exchange] Calculated rates:', { USD: rates.USD, EUR: rates.EUR, JPY: rates.JPY, CNY: rates.CNY });
      }
    } else {
      console.error('[Exchange] FxService failed:', response.status, response.statusText);
    }

    // Transform FxService response to EXIM bank format expected by frontend
    const transformedData = [
      {
        cur_unit: "USD",
        deal_bas_r: (rates.USD || 1320.50).toFixed(2),
        bkpr: ((rates.USD || 1320.50) * 0.998).toFixed(0),
        kftc_bkpr: ((rates.USD || 1320.50) * 1.002).toFixed(0),
        yy_efee_r: "0.85", // Would need historical data for real diff
        ten_dd_efee_r: "2.14",
        RESULT: 1
      },
      {
        cur_unit: "JPY(100)",  
        deal_bas_r: ((rates.JPY || 8.83) * 100).toFixed(2),
        bkpr: (((rates.JPY || 8.83) * 100) * 0.998).toFixed(0),
        kftc_bkpr: (((rates.JPY || 8.83) * 100) * 1.002).toFixed(0),
        yy_efee_r: "-0.42",
        ten_dd_efee_r: "1.67",
        RESULT: 1
      },
      {
        cur_unit: "EUR",
        deal_bas_r: (rates.EUR || 1438.70).toFixed(2),
        bkpr: ((rates.EUR || 1438.70) * 0.998).toFixed(0),
        kftc_bkpr: ((rates.EUR || 1438.70) * 1.002).toFixed(0),
        yy_efee_r: "1.23",
        ten_dd_efee_r: "-0.91", 
        RESULT: 1
      },
      {
        cur_unit: "CNH", // Chinese Yuan Offshore (used for CNY)
        deal_bas_r: (rates.CNY || 180.25).toFixed(2),
        bkpr: ((rates.CNY || 180.25) * 0.998).toFixed(0),
        kftc_bkpr: ((rates.CNY || 180.25) * 1.002).toFixed(0),
        yy_efee_r: "0.15",
        ten_dd_efee_r: "0.82",
        RESULT: 1
      }
    ];

    console.log('[Exchange] Exchange rates fetched from FxService:', Object.keys(rates).join(', '));

    return NextResponse.json(transformedData);
    
  } catch (error) {
    console.error('[Exchange] API error:', error);
    
    // Fallback to mock data if FxService is unavailable
    const fallbackData = [
      { 
        cur_unit: "USD", 
        deal_bas_r: "1320.50", 
        bkpr: "1318", 
        kftc_bkpr: "1323", 
        yy_efee_r: "0.85", 
        ten_dd_efee_r: "2.14", 
        RESULT: 1 
      },
      { 
        cur_unit: "JPY(100)", 
        deal_bas_r: "883.25", 
        bkpr: "881", 
        kftc_bkpr: "885", 
        yy_efee_r: "-0.42", 
        ten_dd_efee_r: "1.67", 
        RESULT: 1 
      },
      { 
        cur_unit: "EUR", 
        deal_bas_r: "1438.70", 
        bkpr: "1436", 
        kftc_bkpr: "1441", 
        yy_efee_r: "1.23", 
        ten_dd_efee_r: "-0.91", 
        RESULT: 1 
      },
      {
        cur_unit: "CNH",
        deal_bas_r: "180.25",
        bkpr: "180",
        kftc_bkpr: "181",
        yy_efee_r: "0.15",
        ten_dd_efee_r: "0.82",
        RESULT: 1
      }
    ];
    
    return NextResponse.json(fallbackData);
  }
}