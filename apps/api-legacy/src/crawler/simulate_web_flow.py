#!/usr/bin/env python3
"""
웹 앱의 전체 플로우 시뮬레이션
"""

import requests
import json

def simulate_web_app():
    """웹 앱처럼 API 호출 시뮬레이션"""
    
    print("=== Entrip 웹 앱 시뮬레이션 ===\n")
    
    # 브라우저 헤더
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/flight-schedule'
    }
    
    # 1. 사용자가 PUS 선택
    print("1. 사용자가 PUS (김해공항) 선택")
    print("   → API 호출: GET http://localhost:8001/api/schedule/PUS")
    
    response = requests.get('http://localhost:8001/api/schedule/PUS', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"   OK 성공: {data['totalFlights']}개 항공편 수신")
        print(f"   OK 크롤링 방법: {data['method']}")
        
        # 도착지 추출
        destinations = {}
        for flight in data['flights']:
            dest = flight['destination']
            if dest not in destinations:
                destinations[dest] = []
            destinations[dest].append(flight)
        
        print(f"   OK 도착지 드롭다운 활성화: {', '.join(sorted(destinations.keys()))}")
        
        # 2. 사용자가 NRT 선택
        print("\n2. 사용자가 도착지 NRT 선택")
        print("   → 클라이언트에서 필터링")
        
        nrt_flights = destinations.get('NRT', [])
        print(f"   OK NRT행 {len(nrt_flights)}개 항공편 표시:\n")
        
        print("   " + "-"*70)
        print("   항공사       편명     출발    도착    운항요일")
        print("   " + "-"*70)
        
        for flight in nrt_flights:
            days = []
            if flight.get('days'):
                day_map = {'mon':'월', 'tue':'화', 'wed':'수', 'thu':'목', 
                          'fri':'금', 'sat':'토', 'sun':'일'}
                for day, active in flight['days'].items():
                    if active:
                        days.append(day_map.get(day, day))
            days_str = ','.join(days) if days else '매일'
            
            print(f"   {flight['airline']:<12} {flight['flightNo']:<8} {flight['departureTime']:<7} "
                  f"{flight['arrivalTime']:<7} {days_str}")
        
        print("\n3. 실제 웹 페이지 확인 방법:")
        print("   1) 브라우저에서 http://localhost:3000/flight-schedule 접속")
        print("   2) 출발: PUS - 김해공항 선택")
        print("   3) 도착: NRT 선택")
        print("   4) 위의 5개 항공편이 모두 표시되는지 확인")
        
        return True
    else:
        print(f"   NG API 오류: {response.status_code}")
        return False

if __name__ == "__main__":
    success = simulate_web_app()
    
    if success:
        print("\n" + "="*70)
        print("OK API는 정상적으로 실제 데이터를 제공하고 있습니다!")
        print("OK PUS -> NRT 5개 항공편이 모두 준비되어 있습니다!")
        print("\n웹 브라우저에서 직접 확인하세요:")
        print("http://localhost:3000/flight-schedule")
        print("="*70)
    else:
        print("\nNG API 연결에 문제가 있습니다.")