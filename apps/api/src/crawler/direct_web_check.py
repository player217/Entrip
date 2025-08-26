#!/usr/bin/env python3
"""
브라우저로 직접 웹 페이지 확인
"""

import asyncio
from playwright.async_api import async_playwright
import time

async def check_web_directly():
    """웹 페이지를 브라우저로 직접 확인"""
    
    async with async_playwright() as p:
        print("브라우저 시작 중...")
        browser = await p.chromium.launch(
            headless=False,  # 화면에 표시
            slow_mo=1000  # 동작을 천천히
        )
        
        page = await browser.new_page()
        
        # 항공편 스케줄 페이지로 이동
        print("\n1. http://localhost:3000/flight-schedule 접속 중...")
        await page.goto("http://localhost:3000/flight-schedule")
        await page.wait_for_timeout(3000)
        
        # 스크린샷 1: 초기 화면
        await page.screenshot(path="./check_1_initial.png")
        print("   스크린샷 저장: check_1_initial.png")
        
        # 출발 공항 선택
        print("\n2. 출발 공항 드롭다운에서 PUS 선택...")
        departure_select = await page.wait_for_selector('select:first-of-type', timeout=5000)
        await departure_select.select_option('PUS')
        await page.wait_for_timeout(2000)
        
        # 스크린샷 2: PUS 선택 후
        await page.screenshot(path="./check_2_pus_selected.png")
        print("   스크린샷 저장: check_2_pus_selected.png")
        
        # 도착 공항 확인
        print("\n3. 도착 공항 드롭다운 확인...")
        arrival_select = await page.wait_for_selector('select:nth-of-type(2)', timeout=5000)
        
        # 도착 공항 옵션들 확인
        options = await arrival_select.query_selector_all('option')
        print(f"   도착 공항 옵션 수: {len(options)}개")
        
        # NRT가 있는지 확인
        nrt_found = False
        for option in options:
            value = await option.get_attribute('value')
            if value == 'NRT':
                nrt_found = True
                break
        
        if nrt_found:
            print("   OK: NRT 옵션 발견!")
            
            # NRT 선택
            print("\n4. NRT 선택...")
            await arrival_select.select_option('NRT')
            await page.wait_for_timeout(3000)
            
            # 스크린샷 3: 결과
            await page.screenshot(path="./check_3_results.png", full_page=True)
            print("   스크린샷 저장: check_3_results.png")
            
            # 테이블 확인
            table_rows = await page.query_selector_all('table tbody tr')
            if table_rows:
                print(f"\n5. 결과: {len(table_rows)}개 항공편 표시됨!")
                
                for i, row in enumerate(table_rows, 1):
                    cells = await row.query_selector_all('td')
                    if len(cells) >= 4:
                        airline = await cells[0].text_content()
                        flight_no = await cells[1].text_content()
                        dep_time = await cells[2].text_content()
                        
                        print(f"   {i}. {airline.strip()} {flight_no.strip()} - {dep_time.strip()}")
            else:
                print("\n5. 문제: 테이블이 표시되지 않음!")
        else:
            print("   문제: NRT 옵션이 없음!")
            
            # 어떤 옵션들이 있는지 확인
            print("\n   현재 도착 공항 옵션:")
            for option in options[:10]:  # 최대 10개만
                value = await option.get_attribute('value')
                text = await option.text_content()
                if value:
                    print(f"   - {value}: {text}")
        
        print("\n브라우저를 10초 후에 닫습니다...")
        await page.wait_for_timeout(10000)
        
        await browser.close()
        print("브라우저 종료됨")

if __name__ == "__main__":
    print("=== 웹 페이지 직접 확인 ===")
    asyncio.run(check_web_directly())