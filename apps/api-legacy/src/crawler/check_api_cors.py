#!/usr/bin/env python3
"""
API CORS 및 연결 테스트
"""

import requests

def check_api_from_browser():
    """브라우저처럼 API 호출 테스트"""
    
    print("=== 브라우저 환경 API 테스트 ===\n")
    
    # 브라우저 헤더
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/'
    }
    
    # 1. OPTIONS 요청 (CORS preflight)
    print("1. CORS Preflight 테스트...")
    try:
        response = requests.options('http://localhost:8001/api/schedule/PUS', headers=headers)
        print(f"   상태 코드: {response.status_code}")
        print(f"   CORS 헤더:")
        print(f"   - Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        print(f"   - Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods')}")
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 2. GET 요청
    print("\n2. 실제 데이터 요청...")
    try:
        response = requests.get('http://localhost:8001/api/schedule/PUS', headers=headers)
        print(f"   상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   데이터 수신 성공!")
            print(f"   - 항공편 수: {data.get('totalFlights', 0)}개")
            print(f"   - 크롤링 방법: {data.get('method', 'N/A')}")
            
            # 도착지 추출
            destinations = set()
            for flight in data.get('flights', []):
                dest = flight.get('destination', '')
                if dest:
                    destinations.add(dest)
            
            print(f"   - 도착지: {', '.join(sorted(destinations))}")
        else:
            print(f"   오류 응답: {response.text[:200]}")
            
    except Exception as e:
        print(f"   오류: {str(e)}")
    
    # 3. API 서버 상태
    print("\n3. API 서버 상태 확인...")
    try:
        response = requests.get('http://localhost:8001/health')
        if response.status_code == 200:
            print("   API 서버: 정상 작동 중")
        else:
            print(f"   API 서버: 응답 코드 {response.status_code}")
    except:
        print("   API 서버: 연결 실패")
    
    # 4. 포트 8000 확인 (혹시 잘못된 포트?)
    print("\n4. 포트 8000 확인...")
    try:
        response = requests.get('http://localhost:8000/health', timeout=2)
        if response.status_code == 200:
            print("   주의: 포트 8000에도 서버가 실행 중!")
    except:
        print("   포트 8000: 연결 안됨 (정상)")

if __name__ == "__main__":
    check_api_from_browser()
    
    print("\n" + "="*60)
    print("웹 앱이 API와 통신하지 못하는 경우:")
    print("1. 브라우저 개발자 도구(F12) > Network 탭 확인")
    print("2. Console 탭에서 에러 메시지 확인")
    print("3. flightApi.ts의 CRAWLER_API_URL이 8001인지 확인")
    print("="*60)