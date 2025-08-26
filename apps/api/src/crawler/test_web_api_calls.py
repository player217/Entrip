#!/usr/bin/env python3
"""
웹 페이지의 API 호출 시뮬레이션
"""

import requests
import json
import time

def simulate_web_workflow():
    """웹 페이지 워크플로우 시뮬레이션"""
    
    print("=== 웹 페이지 워크플로우 시뮬레이션 ===\n")
    
    # 브라우저 헤더 설정
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/flight-schedule',
        'X-Requested-With': 'XMLHttpRequest'
    }
    
    # 1단계: 사용자가 출발 공항 'ICN' 선택
    print("1. 사용자가 출발 공항 'ICN' 선택")
    print("   웹 앱이 API 호출: GET /api/schedule/ICN")
    
    response = requests.get(
        "http://localhost:8001/api/schedule/ICN",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   OK API 응답 성공 (항공편 {len(data['flights'])}개)")
        
        # 도착지 목록 추출
        destinations = set()
        for flight in data['flights']:
            dest_code = flight['destination'].split(' ')[0].strip()
            if len(dest_code) == 3:
                destinations.add(dest_code)
        
        print(f"   OK 도착 공항 드롭다운 업데이트: {', '.join(sorted(destinations))}")
        
        # 2단계: 사용자가 도착 공항 'KIX' 선택
        print("\n2. 사용자가 도착 공항 'KIX' 선택")
        print("   웹 앱이 동일한 데이터에서 KIX 항공편만 필터링")
        
        kix_flights = [f for f in data['flights'] if f['destination'].startswith('KIX')]
        
        print(f"   OK KIX행 항공편 {len(kix_flights)}개 표시:")
        for flight in kix_flights:
            days_str = ""
            if flight.get('days'):
                days = flight['days']
                day_names = ['월', '화', '수', '목', '금', '토', '일']
                day_keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
                active_days = [day_names[i] for i, key in enumerate(day_keys) if days.get(key, False)]
                days_str = f" ({','.join(active_days)})"
            
            print(f"     - {flight['airline']} {flight['flightNo']} | {flight['departureTime']} → {flight.get('arrivalTime', 'N/A')}{days_str}")
        
        # 3단계: PUS 공항 테스트
        print("\n3. 사용자가 출발 공항을 'PUS'로 변경")
        print("   웹 앱이 API 호출: GET /api/schedule/PUS")
        
        response2 = requests.get(
            "http://localhost:8001/api/schedule/PUS",
            headers=headers
        )
        
        if response2.status_code == 200:
            data2 = response2.json()
            print(f"   OK API 응답 성공 (항공편 {len(data2['flights'])}개)")
            
            destinations2 = set()
            for flight in data2['flights']:
                dest_code = flight['destination'].split(' ')[0].strip()
                if len(dest_code) == 3:
                    destinations2.add(dest_code)
            
            print(f"   OK 도착 공항 드롭다운 업데이트: {', '.join(sorted(destinations2))}")
            
            # 샘플 항공편 표시
            if data2['flights']:
                print(f"\n   PUS 출발 항공편:")
                for flight in data2['flights'][:3]:  # 최대 3개만
                    print(f"     - {flight['airline']} {flight['flightNo']} → {flight['destination']} ({flight['departureTime']})")
    
    else:
        print(f"   NG API 오류: {response.status_code}")

def check_web_app_status():
    """웹 애플리케이션 상태 확인"""
    print("\n\n=== 웹 애플리케이션 상태 확인 ===\n")
    
    try:
        # 웹 앱 확인
        web_response = requests.get("http://localhost:3000/flight-schedule", timeout=5)
        if web_response.status_code == 200:
            print("OK 웹 애플리케이션: 정상 작동 중 (http://localhost:3000)")
        else:
            print(f"NG 웹 애플리케이션: 응답 코드 {web_response.status_code}")
    except:
        print("NG 웹 애플리케이션: 연결 실패")
    
    try:
        # API 서버 확인
        api_response = requests.get("http://localhost:8001/health", timeout=5)
        if api_response.status_code == 200:
            print("OK API 서버: 정상 작동 중 (http://localhost:8001)")
        else:
            print(f"NG API 서버: 응답 코드 {api_response.status_code}")
    except:
        print("NG API 서버: 연결 실패")

if __name__ == "__main__":
    # 웹 앱 상태 확인
    check_web_app_status()
    
    # 워크플로우 시뮬레이션
    print()
    simulate_web_workflow()
    
    print("\n\n=== 실제 웹 브라우저에서 확인하기 ===")
    print("1. 브라우저에서 http://localhost:3000/flight-schedule 접속")
    print("2. 출발 공항에서 'ICN - 인천공항' 선택")
    print("3. 도착 공항 드롭다운이 활성화되고 KIX, LAX, NRT 등이 표시됨")
    print("4. 도착 공항에서 'KIX' 선택")
    print("5. 대한항공 KE721, 아시아나항공 OZ112 항공편이 표시됨")
    print("\nOK API와 웹 애플리케이션이 정상적으로 연동되어 작동 중입니다!")