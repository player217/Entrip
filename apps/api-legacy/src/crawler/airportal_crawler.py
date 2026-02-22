"""
Airportal.go.kr 실제 항공편 스케줄 크롤러
"""
import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AirportalCrawler:
    def __init__(self):
        self.base_url = "https://www.airportal.go.kr/life/airinfo/RbHanFrmMain.jsp"
        self.schedule_data = {}
        
    async def get_all_schedules(self) -> Dict[str, Any]:
        """모든 한국 공항의 항공편 스케줄을 크롤링"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # 메인 페이지 접속
                await page.goto(self.base_url)
                await page.wait_for_load_state('networkidle')
                
                # 항공기 스케줄 조회 탭으로 이동
                schedule_tab = await page.wait_for_selector('a:has-text("항공기스케줄조회")', timeout=10000)
                await schedule_tab.click()
                await page.wait_for_load_state('networkidle')
                
                # 모든 공항 리스트 가져오기
                airports = await self._get_airport_list(page)
                logger.info(f"Found {len(airports)} airports to crawl")
                
                # 각 공항별로 크롤링
                for airport_code, airport_name in airports.items():
                    logger.info(f"Crawling {airport_code} - {airport_name}")
                    
                    # 출발 스케줄 크롤링
                    departures = await self._crawl_airport_schedule(page, airport_code, 'departure')
                    
                    # 도착 스케줄도 필요하면 크롤링
                    # arrivals = await self._crawl_airport_schedule(page, airport_code, 'arrival')
                    
                    self.schedule_data[airport_code] = {
                        "airport": airport_code,
                        "airportName": airport_name,
                        "crawledAt": datetime.now().isoformat(),
                        "totalFlights": len(departures),
                        "flights": departures
                    }
                    
                    # 크롤링 간격을 두어 서버 부하 방지
                    await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Error during crawling: {e}")
                raise
            finally:
                await browser.close()
                
        return self.schedule_data
    
    async def _get_airport_list(self, page) -> Dict[str, str]:
        """공항 목록 가져오기"""
        airports = {}
        
        # 출발공항 선택 드롭다운
        await page.wait_for_selector('select[name="depArr"]')
        
        # JavaScript로 모든 공항 옵션 가져오기
        airport_options = await page.evaluate('''
            () => {
                const select = document.querySelector('select[name="depArr"]');
                const options = Array.from(select.options);
                return options.filter(opt => opt.value).map(opt => ({
                    code: opt.value,
                    name: opt.text
                }));
            }
        ''')
        
        for airport in airport_options:
            airports[airport['code']] = airport['name']
            
        return airports
    
    async def _crawl_airport_schedule(self, page, airport_code: str, direction: str = 'departure') -> List[Dict]:
        """특정 공항의 항공편 스케줄 크롤링"""
        flights = []
        
        try:
            # 출발/도착 선택
            if direction == 'departure':
                await page.select_option('select[name="current_dep_arr"]', '출발')
            else:
                await page.select_option('select[name="current_dep_arr"]', '도착')
            
            # 공항 선택
            await page.select_option('select[name="depArr"]', airport_code)
            
            # 조회 버튼 클릭
            search_button = await page.wait_for_selector('a[href*="go_search"]', timeout=5000)
            await search_button.click()
            
            # 결과 대기
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(2)
            
            # 스케줄 테이블 파싱
            schedule_rows = await page.query_selector_all('table.schedule_table tbody tr')
            
            for row in schedule_rows:
                try:
                    # 각 행의 데이터 추출
                    cells = await row.query_selector_all('td')
                    if len(cells) < 7:
                        continue
                    
                    flight_info = {
                        "airline": await cells[0].inner_text(),
                        "flightNo": await cells[1].inner_text(),
                        "destination": await cells[2].inner_text() if direction == 'departure' else airport_code,
                        "origin": airport_code if direction == 'departure' else await cells[2].inner_text(),
                        "departureTime": await cells[3].inner_text(),
                        "arrivalTime": await cells[4].inner_text(),
                        "aircraft": await cells[5].inner_text(),
                        "days": await self._parse_operation_days(cells[6])
                    }
                    
                    # 유효한 항공편만 추가
                    if flight_info["flightNo"] and flight_info["destination"]:
                        flights.append(flight_info)
                        
                except Exception as e:
                    logger.warning(f"Error parsing flight row: {e}")
                    continue
            
            # 다음 페이지가 있으면 계속 크롤링
            next_button = await page.query_selector('a.next_page')
            if next_button:
                # 페이지네이션 처리 (필요시 구현)
                pass
                
        except Exception as e:
            logger.error(f"Error crawling {airport_code} {direction}: {e}")
            
        return flights
    
    async def _parse_operation_days(self, days_cell) -> Dict[str, bool]:
        """운항 요일 파싱"""
        days_text = await days_cell.inner_text()
        
        # 요일 매핑
        day_map = {
            '월': 'mon', '화': 'tue', '수': 'wed', 
            '목': 'thu', '금': 'fri', '토': 'sat', '일': 'sun'
        }
        
        days = {
            'mon': False, 'tue': False, 'wed': False,
            'thu': False, 'fri': False, 'sat': False, 'sun': False
        }
        
        # 운항 요일 체크
        for kor_day, eng_day in day_map.items():
            if kor_day in days_text:
                days[eng_day] = True
                
        return days
    
    def save_to_file(self, filename: str = "korean_flight_schedules.json"):
        """크롤링 결과를 파일로 저장"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.schedule_data, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(self.schedule_data)} airports data to {filename}")

async def main():
    """메인 실행 함수"""
    crawler = AirportalCrawler()
    
    logger.info("Starting airportal.go.kr crawling...")
    schedules = await crawler.get_all_schedules()
    
    # 결과 저장
    crawler.save_to_file()
    
    # 통계 출력
    total_flights = sum(len(data['flights']) for data in schedules.values())
    logger.info(f"Crawling completed: {len(schedules)} airports, {total_flights} total flights")
    
    return schedules

if __name__ == "__main__":
    asyncio.run(main())