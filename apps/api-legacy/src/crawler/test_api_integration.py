#!/usr/bin/env python3
"""
웹 앱과 API 통합 테스트
"""

import requests
import json
import time

def test_api_endpoints():
    """API 엔드포인트 테스트"""
    base_url = "http://localhost:8001"
    
    print("=== API 엔드포인트 테스트 시작 ===\n")
    
    # 1. Health Check
    print("1. Health Check 테스트...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   서버 상태: {data['status']}")
            print(f"   마지막 크롤링: {data['crawl_status']['last_schedule_crawl']}")
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 2. 공항 목록 조회
    print("\n2. 공항 목록 조회...")
    try:
        response = requests.get(f"{base_url}/api/airports")
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   지원 공항: {', '.join(data['airports'])}")
            print(f"   총 {data['total']}개 공항")
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 3. ICN 공항 스케줄 조회
    print("\n3. ICN 공항 스케줄 조회...")
    try:
        response = requests.get(f"{base_url}/api/schedule/ICN")
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   공항: {data['airport']}")
            print(f"   항공편 수: {len(data['flights'])}개")
            print(f"   크롤링 시간: {data['crawledAt']}")
            
            # 첫 번째 항공편 정보 출력
            if data['flights']:
                flight = data['flights'][0]
                print(f"\n   샘플 항공편:")
                print(f"   - 항공사: {flight['airline']}")
                print(f"   - 편명: {flight['flightNo']}")
                print(f"   - 목적지: {flight['destination']}")
                print(f"   - 출발: {flight['departureTime']}")
                print(f"   - 도착: {flight.get('arrivalTime', 'N/A')}")
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 4. PUS 공항 스케줄 조회
    print("\n4. PUS 공항 스케줄 조회...")
    try:
        response = requests.get(f"{base_url}/api/schedule/PUS")
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   공항: {data['airport']}")
            print(f"   항공편 수: {len(data['flights'])}개")
            print(f"   크롤링 방법: {data.get('method', 'N/A')}")
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 5. CORS 헤더 확인
    print("\n5. CORS 헤더 확인...")
    try:
        response = requests.options(f"{base_url}/api/schedule/ICN")
        print(f"   상태 코드: {response.status_code}")
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        for header, value in cors_headers.items():
            print(f"   {header}: {value}")
    except Exception as e:
        print(f"   오류: {str(e)}")

def simulate_browser_request():
    """브라우저 요청 시뮬레이션"""
    print("\n\n=== 브라우저 요청 시뮬레이션 ===\n")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/'
    }
    
    # ICN 공항 데이터 요청 (브라우저에서 하는 것처럼)
    print("브라우저에서 ICN 공항 데이터 요청 시뮬레이션...")
    try:
        response = requests.get(
            "http://localhost:8001/api/schedule/ICN",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("OK API 응답 성공!")
            print(f"   받은 항공편 수: {len(data['flights'])}개")
            
            # 도착지 추출 (프론트엔드가 하는 것처럼)
            destinations = set()
            for flight in data['flights']:
                dest = flight['destination'].split(' ')[0].strip()
                if len(dest) == 3:
                    destinations.add(dest)
            
            print(f"   가능한 도착지: {', '.join(sorted(destinations))}")
            
            # 특정 도착지로 필터링
            kix_flights = [f for f in data['flights'] if f['destination'].startswith('KIX')]
            print(f"\n   KIX(간사이) 행 항공편: {len(kix_flights)}개")
            for flight in kix_flights:
                print(f"   - {flight['airline']} {flight['flightNo']} ({flight['departureTime']})")
        
    except Exception as e:
        print(f"NG 요청 실패: {str(e)}")

if __name__ == "__main__":
    # API 엔드포인트 테스트
    test_api_endpoints()
    
    # 브라우저 요청 시뮬레이션
    simulate_browser_request()
    
    print("\n\nOK 모든 테스트 완료!")
    print("웹 애플리케이션(http://localhost:3000/flight-schedule)에서")
    print("출발 공항으로 'ICN' 또는 'PUS'를 선택하면 실제 데이터가 표시됩니다.")