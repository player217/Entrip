#!/usr/bin/env python3
"""
실제 항공포털 크롤링 테스트
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

async def test_airportal_crawl():
    """항공포털 실제 크롤링 테스트"""
    
    async with async_playwright() as p:
        try:
            print("브라우저 시작 중...")
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # User Agent 설정
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            })
            
            print("항공포털 스케줄 페이지 접속 중...")
            url = "https://www.airportal.go.kr/knowledge/airplanSchedule/airplaneSchedule.do"
            
            await page.goto(url, wait_until='networkidle', timeout=30000)
            print(f"페이지 로드 완료: {await page.title()}")
            
            # 페이지 내용 확인
            content = await page.content()
            if "항공편" in content or "스케줄" in content:
                print("OK 스케줄 페이지 접근 성공")
            else:
                print("NG 스케줄 페이지 내용을 찾을 수 없음")
            
            # 공항 선택 (PUS - 김해공항)
            print("공항 선택 시도 중 (PUS)...")
            
            # 공항 선택 요소 찾기
            airport_selectors = [
                "select[name='sch_apt_cd']",
                "#sch_apt_cd", 
                "select[id*='airport']",
                "select[id*='apt']"
            ]
            
            airport_element = None
            for selector in airport_selectors:
                try:
                    airport_element = await page.wait_for_selector(selector, timeout=5000)
                    if airport_element:
                        print(f"OK 공항 선택 요소 발견: {selector}")
                        break
                except:
                    continue
            
            if airport_element:
                # PUS 선택 시도
                try:
                    await page.select_option(airport_element, value="PUS")
                    print("OK PUS 공항 선택됨")
                    
                    # 잠시 대기 후 검색 버튼 클릭
                    await page.wait_for_timeout(1000)
                    
                    # 검색 버튼 찾기
                    search_selectors = [
                        "input[type='submit']",
                        "button[type='submit']",
                        "button:has-text('검색')",
                        ".btn_search"
                    ]
                    
                    for selector in search_selectors:
                        try:
                            search_btn = await page.query_selector(selector)
                            if search_btn:
                                await search_btn.click()
                                print("OK 검색 버튼 클릭됨")
                                break
                        except:
                            continue
                    
                    # 결과 로딩 대기
                    await page.wait_for_timeout(3000)
                    
                    # 결과 테이블 확인
                    table_selectors = [
                        "table",
                        ".schedule_table",
                        "#schedule_table",
                        "tbody tr"
                    ]
                    
                    for selector in table_selectors:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            print(f"OK 테이블 요소 발견: {selector} ({len(elements)}개)")
                            
                            # 첫 번째 테이블의 내용 샘플링
                            if len(elements) > 0:
                                sample_text = await elements[0].text_content()
                                print(f"테이블 샘플: {sample_text[:200]}...")
                            break
                    
                    # 페이지 전체 텍스트에서 항공편 정보 찾기
                    full_text = await page.text_content("body")
                    
                    flight_keywords = ["KE", "OZ", "TW", "LJ", "BX", "7C", "ZE"]
                    found_flights = []
                    
                    for keyword in flight_keywords:
                        if keyword in full_text:
                            found_flights.append(keyword)
                    
                    if found_flights:
                        print(f"OK 항공편 코드 발견: {', '.join(found_flights)}")
                        
                        # 간단한 데이터 추출 시도
                        flights_data = {
                            "airport": "PUS",
                            "crawledAt": datetime.now().isoformat(),
                            "method": "real_crawl",
                            "found_airlines": found_flights,
                            "page_title": await page.title(),
                            "content_length": len(full_text)
                        }
                        
                        # 결과 저장
                        out_dir = Path("./out/latest")
                        out_dir.mkdir(parents=True, exist_ok=True)
                        
                        with open(out_dir / "real_crawl_test.json", 'w', encoding='utf-8') as f:
                            json.dump(flights_data, f, ensure_ascii=False, indent=2)
                        
                        print(f"OK 실제 크롤링 결과 저장: {out_dir / 'real_crawl_test.json'}")
                        
                    else:
                        print("NG 항공편 정보를 찾을 수 없음")
                    
                except Exception as e:
                    print(f"NG 공항 선택/검색 중 오류: {str(e)}")
            else:
                print("NG 공항 선택 요소를 찾을 수 없음")
                
                # 페이지 구조 분석을 위해 form 요소들 출력
                forms = await page.query_selector_all("form")
                print(f"페이지에서 발견된 form 개수: {len(forms)}")
                
                selects = await page.query_selector_all("select")
                print(f"페이지에서 발견된 select 개수: {len(selects)}")
                
                if selects:
                    for i, select in enumerate(selects[:3]):  # 처음 3개만
                        select_text = await select.text_content()
                        print(f"Select {i+1}: {select_text[:100]}...")
            
        except Exception as e:
            print(f"NG 크롤링 중 오류 발생: {str(e)}")
            
        finally:
            await browser.close()
            print("브라우저 종료됨")

if __name__ == "__main__":
    print("=== 실제 항공포털 크롤링 테스트 ===\n")
    asyncio.run(test_airportal_crawl())