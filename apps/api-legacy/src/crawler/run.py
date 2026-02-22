#!/usr/bin/env python3
"""
크롤러 실행 스크립트
개발/테스트용
"""

import asyncio
import logging
from scraper import AirportScraper
from storage import Storage
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_single_airport(airport_code: str):
    """단일 공항 테스트"""
    scraper = AirportScraper()
    storage = Storage()
    
    try:
        await scraper.init_browser()
        
        logger.info(f"Testing {airport_code}...")
        
        # 스케줄 크롤링
        schedule_data = await scraper.crawl_schedule(airport_code)
        if schedule_data:
            storage.save_schedule(airport_code, schedule_data)
            logger.info(f"Saved {len(schedule_data['flights'])} flights for {airport_code}")
        
        # 실시간 현황 크롤링
        live_data = await scraper.crawl_live_status(airport_code)
        if live_data:
            storage.save_live_status(airport_code, live_data)
            logger.info(f"Saved live status for {airport_code}")
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        await scraper.close_browser()


async def test_all_airports():
    """모든 공항 테스트"""
    scraper = AirportScraper()
    storage = Storage()
    
    try:
        await scraper.init_browser()
        
        for airport_code in settings.AIRPORTS:
            try:
                logger.info(f"Processing {airport_code}...")
                
                # 스케줄 크롤링
                schedule_data = await scraper.crawl_schedule(airport_code)
                if schedule_data and len(schedule_data.get("flights", [])) >= 1:
                    storage.save_schedule(airport_code, schedule_data)
                    logger.info(f"✓ {airport_code}: {len(schedule_data['flights'])} flights")
                else:
                    logger.warning(f"✗ {airport_code}: No data")
                
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"✗ {airport_code}: {str(e)}")
                
    finally:
        await scraper.close_browser()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        airport = sys.argv[1].upper()
        asyncio.run(test_single_airport(airport))
    else:
        asyncio.run(test_all_airports())