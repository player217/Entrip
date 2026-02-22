#!/usr/bin/env python3
"""
웹에서 실제 데이터 표시 확인
"""

import asyncio
from playwright.async_api import async_playwright
import time

async def verify_web_display():
    """웹에서 실제로 데이터가 표시되는지 확인"""
    
    async with async_playwright() as p:
        print("브라우저 시작 중...")
        browser = await p.chromium.launch(
            headless=False,  # 화면에 표시
            args=['--disable-web-security']
        )
        
        page = await browser.new_page()
        
        # 항공편 스케줄 페이지 접속
        print("\n1. 항공편 스케줄 페이지 접속...")
        await page.goto("http://localhost:3000/flight-schedule")
        await page.wait_for_timeout(3000)
        
        # 현재 페이지 제목 확인
        title = await page.title()
        print(f"   페이지 제목: {title}")
        
        # 출발 공항 선택 요소 찾기
        print("\n2. 출발 공항 드롭다운 확인...")
        departure_select = await page.query_selector('select:first-of-type')
        if departure_select:
            # 옵션들 확인
            options = await departure_select.query_selector_all('option')
            print(f"   출발 공항 옵션 수: {len(options)}개")
            
            # PUS 선택
            print("\n3. PUS (김해공항) 선택...")
            await departure_select.select_option('PUS')
            await page.wait_for_timeout(2000)
            
            # 네트워크 요청 로그
            print("\n4. API 요청 확인...")
            
            # 도착 공항 드롭다운 확인
            arrival_select = await page.query_selector('select:nth-of-type(2)')
            if arrival_select:
                await page.wait_for_timeout(1000)
                
                # 도착 공항 옵션들 확인
                arrival_options = await arrival_select.query_selector_all('option')
                print(f"   도착 공항 옵션 수: {len(arrival_options)}개")
                
                # 옵션 내용 확인
                print("\n   도착 공항 목록:")
                for i, option in enumerate(arrival_options):
                    value = await option.get_attribute('value')
                    text = await option.text_content()
                    if value:  # 빈 값이 아닌 경우만
                        print(f"   - {value}: {text}")
                
                # NRT 선택
                print("\n5. NRT 선택...")
                try:
                    await arrival_select.select_option('NRT')
                    await page.wait_for_timeout(2000)
                    
                    # 결과 테이블 확인
                    print("\n6. 항공편 테이블 확인...")
                    table_rows = await page.query_selector_all('table tbody tr')
                    
                    if table_rows:
                        print(f"   표시된 항공편 수: {len(table_rows)}개")
                        
                        print("\n   항공편 상세:")
                        for i, row in enumerate(table_rows, 1):
                            cells = await row.query_selector_all('td')
                            if len(cells) >= 4:
                                airline = await cells[0].text_content()
                                flight_no = await cells[1].text_content()
                                dep_time = await cells[2].text_content()
                                arr_time = await cells[3].text_content()
                                print(f"   {i}. {airline} {flight_no} - {dep_time} → {arr_time}")
                    else:
                        print("   NG 테이블이 표시되지 않음")
                        
                        # 페이지 내용 확인
                        content = await page.text_content('body')
                        if "해당 노선의 운항 스케줄이 없습니다" in content:
                            print("   오류: '운항 스케줄이 없습니다' 메시지 표시됨")
                        elif "로딩" in content or "Loading" in content:
                            print("   오류: 로딩 중 상태")
                        else:
                            print("   오류: 알 수 없는 상태")
                    
                except Exception as e:
                    print(f"   NRT 선택 오류: {str(e)}")
            else:
                print("   NG 도착 공항 드롭다운을 찾을 수 없음")
        else:
            print("   NG 출발 공항 드롭다운을 찾을 수 없음")
        
        # 스크린샷 저장
        await page.screenshot(path="./web_verification.png", full_page=True)
        print("\n스크린샷 저장: web_verification.png")
        
        # 10초 대기 (확인용)
        print("\n10초 대기 중... 브라우저에서 확인하세요")
        await page.wait_for_timeout(10000)
        
        await browser.close()

if __name__ == "__main__":
    print("=== 웹 페이지 실제 확인 ===")
    asyncio.run(verify_web_display())