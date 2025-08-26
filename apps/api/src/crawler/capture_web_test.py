#!/usr/bin/env python3
"""
웹 애플리케이션 동작 캡처
"""

import asyncio
from playwright.async_api import async_playwright
import time

async def capture_flight_schedule():
    """항공편 스케줄 페이지 캡처"""
    
    async with async_playwright() as p:
        try:
            print("브라우저 시작 중...")
            browser = await p.chromium.launch(
                headless=False,
                args=['--disable-web-security']
            )
            
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800}
            )
            
            page = await context.new_page()
            
            # 1. 항공편 스케줄 페이지 접속
            print("항공편 스케줄 페이지 접속 중...")
            await page.goto("http://localhost:3000/flight-schedule", wait_until='networkidle')
            await page.wait_for_timeout(2000)
            
            # 초기 페이지 스크린샷
            await page.screenshot(path="./flight_schedule_1_initial.png")
            print("스크린샷 저장: flight_schedule_1_initial.png")
            
            # 2. 출발 공항 선택 (ICN)
            print("출발 공항 선택 중 (ICN)...")
            departure_select = await page.query_selector('select:first-of-type')
            if departure_select:
                await departure_select.select_option('ICN')
                await page.wait_for_timeout(1500)
                
                # API 호출 대기
                await page.wait_for_timeout(1000)
                
                # 출발 공항 선택 후 스크린샷
                await page.screenshot(path="./flight_schedule_2_departure_selected.png")
                print("스크린샷 저장: flight_schedule_2_departure_selected.png")
                
                # 3. 도착 공항 선택 (KIX)
                print("도착 공항 선택 중 (KIX)...")
                arrival_select = await page.query_selector('select:nth-of-type(2)')
                if arrival_select:
                    # 도착 공항 옵션이 로드될 때까지 대기
                    await page.wait_for_timeout(500)
                    
                    try:
                        await arrival_select.select_option('KIX')
                        await page.wait_for_timeout(1500)
                        
                        # 결과 표시 대기
                        await page.wait_for_timeout(1000)
                        
                        # 최종 결과 스크린샷
                        await page.screenshot(path="./flight_schedule_3_results.png", full_page=True)
                        print("스크린샷 저장: flight_schedule_3_results.png")
                        
                    except Exception as e:
                        print(f"도착 공항 선택 중 오류: {str(e)}")
                        # 도착 공항 드롭다운 내용 확인
                        options = await arrival_select.query_selector_all('option')
                        print(f"도착 공항 옵션 개수: {len(options)}")
                        for i, option in enumerate(options[:5]):
                            value = await option.get_attribute('value')
                            text = await option.text_content()
                            print(f"  옵션 {i+1}: value='{value}', text='{text}'")
                
                # 4. 네트워크 로그 확인
                print("\n네트워크 활동 확인 중...")
                
                # 콘솔 로그 출력
                console_logs = []
                page.on('console', lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))
                
                # 페이지 새로고침하여 네트워크 활동 관찰
                await page.reload()
                await page.wait_for_timeout(2000)
                
                if console_logs:
                    print("콘솔 로그:")
                    for log in console_logs[-10:]:  # 마지막 10개만
                        print(f"  {log}")
            
            # 5초 대기 (브라우저 확인용)
            print("\n5초 대기 중... 브라우저에서 확인하세요")
            await page.wait_for_timeout(5000)
            
        except Exception as e:
            print(f"오류 발생: {str(e)}")
            
        finally:
            await browser.close()
            print("브라우저 종료됨")

if __name__ == "__main__":
    print("=== 웹 애플리케이션 동작 캡처 ===\n")
    asyncio.run(capture_flight_schedule())