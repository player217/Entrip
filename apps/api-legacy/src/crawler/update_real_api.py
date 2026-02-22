"""
현재 실행중인 API의 데이터를 직접 업데이트하는 스크립트
"""
import requests
import json
from pathlib import Path

# 전체 데이터 로드
data_file = Path(__file__).parent / "korean_flight_schedules.json"
if data_file.exists():
    with open(data_file, 'r', encoding='utf-8') as f:
        full_data = json.load(f)
    
    print(f"Loaded data for {len(full_data)} airports")
    
    # PUS 데이터 확인
    if "PUS" in full_data:
        pus_data = full_data["PUS"]
        print(f"PUS has {pus_data['totalFlights']} flights")
        
        # 도착지 목록
        destinations = set()
        for flight in pus_data['flights']:
            destinations.add(flight['destination'])
        
        print(f"PUS destinations ({len(destinations)}): {sorted(destinations)}")
else:
    print("Data file not found!")

# 8003 포트 API 테스트
try:
    response = requests.get("http://localhost:8003/api/schedule/PUS/destinations")
    if response.status_code == 200:
        data = response.json()
        print(f"\n8003 API Response: {data['total']} destinations")
        print(f"Destinations: {data['destinations']}")
except Exception as e:
    print(f"Error testing 8003 API: {e}")