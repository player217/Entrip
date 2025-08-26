#!/usr/bin/env python3
"""
최종 웹 페이지 확인
"""

import asyncio
from playwright.async_api import async_playwright

async def final_check():
    """웹 페이지 최종 확인"""
    
    async with async_playwright() as p:
        print("브라우저 시작 중...")
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # 페이지 새로고침하여 캐시 클리어
        print("\n1. 페이지 로드 및 새로고침...")
        await page.goto("http://localhost:3000/flight-schedule")
        await page.wait_for_timeout(2000)
        await page.reload()
        await page.wait_for_timeout(3000)
        
        # PUS 선택
        print("\n2. PUS (김해공항) 선택...")
        departure = await page.wait_for_selector('select:first-of-type')
        await departure.select_option('PUS')
        await page.wait_for_timeout(2000)
        
        # 도착 공항 확인
        print("\n3. 도착 공항 옵션 확인...")
        arrival = await page.wait_for_selector('select:nth-of-type(2)')
        
        # 옵션들 확인
        options = await arrival.query_selector_all('option')
        print(f"   도착 공항 옵션 수: {len(options)}개")
        
        destinations = []
        for option in options:
            value = await option.get_attribute('value')
            text = await option.text_content()
            if value:
                destinations.append(value)
                print(f"   - {value}: {text}")
        
        if 'NRT' in destinations:
            print("\n4. NRT 선택...")
            await arrival.select_option('NRT')
            await page.wait_for_timeout(3000)
            
            # 스크린샷
            await page.screenshot(path="./final_result.png", full_page=True)
            print("   스크린샷 저장: final_result.png")
            
            # 테이블 확인
            rows = await page.query_selector_all('table tbody tr')
            if rows:
                print(f"\n5. 성공! {len(rows)}개 항공편 표시됨:")
                
                for i, row in enumerate(rows, 1):
                    cells = await row.query_selector_all('td')
                    if len(cells) >= 4:
                        airline = await cells[0].text_content()
                        flight_no = await cells[1].text_content()
                        dep_time = await cells[2].text_content()
                        arr_time = await cells[3].text_content()
                        
                        print(f"   {i}. {airline.strip()} {flight_no.strip()}")
                        print(f"      출발: {dep_time.strip()} → 도착: {arr_time.strip()}")
            else:
                print("\n5. 문제: 테이블이 표시되지 않음")
                
                # 에러 메시지 확인
                error_msg = await page.query_selector('.text-center.py-8')
                if error_msg:
                    error_text = await error_msg.text_content()
                    print(f"   에러 메시지: {error_text}")
        else:
            print("\n문제: NRT 옵션이 없음!")
        
        print("\n브라우저를 열어둡니다. 직접 확인하세요.")
        print("종료하려면 Ctrl+C를 누르세요...")
        
        try:
            await asyncio.sleep(300)  # 5분 대기
        except KeyboardInterrupt:
            pass
        
        await browser.close()

if __name__ == "__main__":
    print("=== 최종 웹 페이지 확인 ===")
    asyncio.run(final_check())