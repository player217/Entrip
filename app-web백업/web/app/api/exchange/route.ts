import { NextResponse } from 'next/server';
import { logger } from '@entrip/shared';

export async function GET() {
  try {
    // Mock 환율 데이터
    const mockData = [
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
      }
    ];
    
    return NextResponse.json(mockData);
  } catch (error) {
    logger.error('Exchange API error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}