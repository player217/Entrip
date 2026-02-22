"""
크롤러 테스트 - PUS 공항만 우선 크롤링
"""
import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def crawl_pus_airport():
    """PUS(김해공항) 항공편만 크롤링"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 디버깅을 위해 헤드리스 모드 끔
        page = await browser.new_page()
        
        flights = []
        
        try:
            # 항공기 출도착 조회 페이지로 직접 이동
            url = "https://www.airportal.go.kr/life/airinfo/RaSkeFrmMain.jsp"
            logger.info(f"Navigating to {url}")
            await page.goto(url)
            await page.wait_for_load_state('networkidle')
            
            # 출발 선택
            await page.select_option('select[name="current_dep_arr"]', '출발')
            await asyncio.sleep(1)
            
            # 김해공항(PUS) 선택
            await page.select_option('select[name="depArr"]', 'PUS')
            await asyncio.sleep(1)
            
            # 조회 버튼 클릭
            search_button = await page.query_selector('input[type="image"][alt="조회"]')
            if search_button:
                await search_button.click()
            else:
                # JavaScript로 검색 함수 직접 호출
                await page.evaluate('go_search()')
            
            # 결과 대기
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(3)
            
            # 테이블 찾기
            tables = await page.query_selector_all('table')
            logger.info(f"Found {len(tables)} tables")
            
            # 스케줄 테이블 찾기 (보통 3번째 또는 4번째 테이블)
            for i, table in enumerate(tables):
                rows = await table.query_selector_all('tr')
                logger.info(f"Table {i} has {len(rows)} rows")
                
                if len(rows) > 5:  # 항공편 데이터가 있는 테이블
                    # 헤더 행 건너뛰기
                    for j, row in enumerate(rows[1:], 1):
                        cells = await row.query_selector_all('td')
                        if len(cells) >= 7:
                            try:
                                flight = {
                                    "airline": (await cells[0].inner_text()).strip(),
                                    "flightNo": (await cells[1].inner_text()).strip(),
                                    "destination": (await cells[2].inner_text()).strip(),
                                    "departureTime": (await cells[3].inner_text()).strip(),
                                    "arrivalTime": (await cells[4].inner_text()).strip(),
                                    "aircraft": (await cells[5].inner_text()).strip() if len(cells) > 5 else "",
                                    "days": {
                                        "mon": True, "tue": True, "wed": True, 
                                        "thu": True, "fri": True, "sat": True, "sun": True
                                    }  # 일단 매일 운항으로 설정
                                }
                                
                                # 유효한 항공편만 추가
                                if flight["flightNo"] and flight["destination"] and "항공사" not in flight["airline"]:
                                    flights.append(flight)
                                    logger.info(f"Found flight: {flight['flightNo']} to {flight['destination']}")
                                    
                            except Exception as e:
                                logger.warning(f"Error parsing row {j}: {e}")
            
            logger.info(f"Total flights found: {len(flights)}")
            
        except Exception as e:
            logger.error(f"Error during crawling: {e}")
            # 스크린샷 저장
            await page.screenshot(path="error_screenshot.png")
        finally:
            await asyncio.sleep(5)  # 결과 확인을 위해 잠시 대기
            await browser.close()
        
        return flights

async def main():
    """메인 실행"""
    logger.info("Starting PUS airport crawling test...")
    flights = await crawl_pus_airport()
    
    # 결과를 파일로 저장
    result = {
        "PUS": {
            "airport": "PUS",
            "airportName": "김해국제공항",
            "crawledAt": datetime.now().isoformat(),
            "totalFlights": len(flights),
            "flights": flights
        }
    }
    
    with open("pus_flights_test.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Saved {len(flights)} flights to pus_flights_test.json")
    
    # 도착지별 통계
    destinations = {}
    for flight in flights:
        dest = flight['destination']
        if dest in destinations:
            destinations[dest] += 1
        else:
            destinations[dest] = 1
    
    logger.info("Destinations summary:")
    for dest, count in sorted(destinations.items()):
        logger.info(f"  {dest}: {count} flights")

if __name__ == "__main__":
    asyncio.run(main())