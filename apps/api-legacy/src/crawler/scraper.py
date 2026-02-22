"""
Playwright 기반 항공포털 크롤러
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from playwright.async_api import async_playwright, Page, Browser
from config import settings

logger = logging.getLogger(__name__)


class AirportScraper:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.base_url = "https://www.airportal.go.kr"
        
    async def init_browser(self):
        """브라우저 초기화"""
        if self.browser:
            return
            
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=settings.HEADLESS,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR'
        )
        self.page = await context.new_page()
        
    async def close_browser(self):
        """브라우저 종료"""
        if self.page:
            await self.page.close()
        if self.browser:
            await self.browser.close()
        self.browser = None
        self.page = None
        
    async def crawl_schedule(self, airport_code: str) -> Dict:
        """공항 스케줄 크롤링"""
        try:
            url = f"{self.base_url}/knowledge/airplanSchedule/airplaneSchedule.do"
            await self.page.goto(url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            # 공항 선택
            await self.page.select_option('#airportCode', airport_code)
            await asyncio.sleep(1)
            
            # 조회 버튼 클릭
            await self.page.click('button.btn-search')
            await asyncio.sleep(3)
            
            # 데이터 파싱
            flights = []
            
            # 테이블 행 추출
            rows = await self.page.query_selector_all('table.schedule-table tbody tr')
            
            for row in rows:
                try:
                    cells = await row.query_selector_all('td')
                    if len(cells) < 7:
                        continue
                    
                    # 셀 텍스트 추출
                    airline = await cells[0].inner_text()
                    flight_no = await cells[1].inner_text()
                    destination = await cells[2].inner_text()
                    departure_time = await cells[3].inner_text()
                    arrival_time = await cells[4].inner_text()
                    schedule_text = await cells[5].inner_text()
                    
                    # 요일 파싱
                    days = self._parse_schedule_days(schedule_text)
                    
                    flights.append({
                        "airline": airline.strip(),
                        "flightNo": flight_no.strip(),
                        "destination": destination.strip(),
                        "departureTime": departure_time.strip(),
                        "arrivalTime": arrival_time.strip(),
                        "days": days
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to parse row: {str(e)}")
                    continue
            
            return {
                "airport": airport_code,
                "crawledAt": datetime.now().isoformat(),
                "totalFlights": len(flights),
                "flights": flights
            }
            
        except Exception as e:
            logger.error(f"Schedule crawl error for {airport_code}: {str(e)}")
            raise
            
    async def crawl_live_status(self, airport_code: str) -> Dict:
        """실시간 출도착 현황 크롤링"""
        try:
            url = f"{self.base_url}/knowledge/aircraftInfo/aircraftInfo.do"
            await self.page.goto(url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            # 공항 선택
            await self.page.select_option('#airportCode', airport_code)
            await asyncio.sleep(1)
            
            # 조회 버튼 클릭
            await self.page.click('button.btn-search')
            await asyncio.sleep(3)
            
            # 출발/도착 데이터 파싱
            departures = await self._parse_live_table('div.departure-table table')
            arrivals = await self._parse_live_table('div.arrival-table table')
            
            return {
                "airport": airport_code,
                "crawledAt": datetime.now().isoformat(),
                "departures": departures,
                "arrivals": arrivals
            }
            
        except Exception as e:
            logger.error(f"Live crawl error for {airport_code}: {str(e)}")
            raise
            
    async def _parse_live_table(self, selector: str) -> List[Dict]:
        """실시간 테이블 파싱"""
        flights = []
        
        try:
            table = await self.page.query_selector(selector)
            if not table:
                return flights
                
            rows = await table.query_selector_all('tbody tr')
            
            for row in rows:
                try:
                    cells = await row.query_selector_all('td')
                    if len(cells) < 6:
                        continue
                    
                    flight = {
                        "airline": await cells[0].inner_text(),
                        "flightNo": await cells[1].inner_text(),
                        "destination": await cells[2].inner_text(),
                        "scheduledTime": await cells[3].inner_text(),
                        "estimatedTime": await cells[4].inner_text(),
                        "status": await cells[5].inner_text()
                    }
                    
                    flights.append({k: v.strip() for k, v in flight.items()})
                    
                except Exception as e:
                    logger.warning(f"Failed to parse live row: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Failed to parse live table: {str(e)}")
            
        return flights
        
    async def download_excel(self) -> Optional[Path]:
        """Excel 파일 다운로드"""
        try:
            # 다운로드 대기 설정
            download_promise = self.page.wait_for_event('download')
            
            # Excel 다운로드 버튼 클릭
            await self.page.click('button.btn-excel-download')
            
            # 다운로드 완료 대기
            download = await download_promise
            
            # 임시 경로에 저장
            temp_path = Path(f"/tmp/airportal_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
            await download.save_as(temp_path)
            
            return temp_path
            
        except Exception as e:
            logger.error(f"Excel download error: {str(e)}")
            return None
            
    def _parse_schedule_days(self, schedule_text: str) -> Dict[str, bool]:
        """요일 문자열 파싱"""
        days = {
            "mon": False,
            "tue": False,
            "wed": False,
            "thu": False,
            "fri": False,
            "sat": False,
            "sun": False
        }
        
        # 요일 매핑
        day_map = {
            "월": "mon", "화": "tue", "수": "wed", "목": "thu",
            "금": "fri", "토": "sat", "일": "sun"
        }
        
        for kor, eng in day_map.items():
            if kor in schedule_text:
                days[eng] = True
                
        return days