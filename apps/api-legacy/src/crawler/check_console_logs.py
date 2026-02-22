#!/usr/bin/env python3
"""
웹 페이지의 콘솔 로그 확인
"""

import asyncio
from playwright.async_api import async_playwright

async def check_console_logs():
    """콘솔 로그를 확인하여 문제 파악"""
    
    async with async_playwright() as p:
        print("브라우저 시작 중...")
        browser = await p.chromium.launch(
            headless=False,
            devtools=True  # 개발자 도구 열기
        )
        
        page = await browser.new_page()
        
        # 콘솔 로그 수집
        console_logs = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        # 네트워크 요청 수집
        network_requests = []
        page.on('request', lambda req: network_requests.append({
            'url': req.url,
            'method': req.method,
            'resource_type': req.resource_type
        }))
        
        # 네트워크 응답 수집
        network_responses = []
        page.on('response', lambda res: network_responses.append({
            'url': res.url,
            'status': res.status,
            'ok': res.ok
        }))
        
        # 페이지 로드
        print("\n1. 페이지 로드 중...")
        await page.goto("http://localhost:3000/flight-schedule")
        await page.wait_for_timeout(3000)
        
        # 콘솔 로그 확인
        print("\n2. 초기 콘솔 로그:")
        for log in console_logs:
            print(f"   {log}")
        
        # PUS 선택
        print("\n3. PUS 선택...")
        departure_select = await page.wait_for_selector('select:first-of-type')
        await departure_select.select_option('PUS')
        await page.wait_for_timeout(3000)
        
        # API 요청 확인
        print("\n4. API 요청 확인:")
        api_requests = [req for req in network_requests if 'api' in req['url'] or '8001' in req['url'] or '8000' in req['url']]
        
        if api_requests:
            for req in api_requests:
                print(f"   요청: {req['method']} {req['url']}")
                
                # 해당 응답 찾기
                response = next((res for res in network_responses if res['url'] == req['url']), None)
                if response:
                    print(f"   응답: {response['status']} {'(성공)' if response['ok'] else '(실패)'}")
        else:
            print("   API 요청이 없습니다!")
        
        # 콘솔 에러 확인
        print("\n5. 콘솔 에러:")
        error_logs = [log for log in console_logs if '[error]' in log.lower()]
        if error_logs:
            for log in error_logs:
                print(f"   {log}")
        else:
            print("   에러 없음")
        
        # 페이지에서 직접 API URL 확인
        print("\n6. 페이지에서 사용 중인 API URL 확인...")
        api_url = await page.evaluate("""
            () => {
                // window 객체에서 확인
                if (window.NEXT_PUBLIC_CRAWLER_API_URL) {
                    return window.NEXT_PUBLIC_CRAWLER_API_URL;
                }
                // 환경 변수에서 확인
                if (process && process.env && process.env.NEXT_PUBLIC_CRAWLER_API_URL) {
                    return process.env.NEXT_PUBLIC_CRAWLER_API_URL;
                }
                return 'Not found';
            }
        """)
        print(f"   API URL: {api_url}")
        
        print("\n15초 대기 중... (개발자 도구 확인)")
        await page.wait_for_timeout(15000)
        
        await browser.close()

if __name__ == "__main__":
    print("=== 웹 페이지 콘솔 로그 확인 ===")
    asyncio.run(check_console_logs())