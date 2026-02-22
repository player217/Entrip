#!/usr/bin/env python3
"""
간단한 크롤링 테스트 (기본 라이브러리만 사용)
"""

import requests
import json
import time
from datetime import datetime
from pathlib import Path

def test_airportal_basic():
    """기본 HTTP 요청으로 테스트"""
    print("Testing airportal with basic HTTP requests...")
    
    # 항공포털 메인 페이지 접근 테스트
    try:
        response = requests.get("https://www.airportal.go.kr", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Content length: {len(response.text)}")
        
        if "항공" in response.text or "공항" in response.text:
            print("OK 한국어 콘텐츠 확인됨")
        else:
            print("NG 한국어 콘텐츠를 찾을 수 없음")
            
    except Exception as e:
        print(f"NG 접속 실패: {str(e)}")

def create_sample_data():
    """샘플 데이터 생성"""
    print("\nCreating sample data...")
    
    # 출력 디렉토리 생성
    out_dir = Path("./out")
    latest_dir = out_dir / "latest"
    archive_dir = out_dir / "archive"
    
    latest_dir.mkdir(parents=True, exist_ok=True)
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    # PUS 공항 샘플 데이터
    sample_schedule = {
        "airport": "PUS",
        "crawledAt": datetime.now().isoformat(),
        "totalFlights": 3,
        "flights": [
            {
                "airline": "티웨이항공",
                "flightNo": "TW301",
                "destination": "KIX",
                "departureTime": "08:00",
                "arrivalTime": "09:50",
                "days": {
                    "mon": True,
                    "tue": True,
                    "wed": True,
                    "thu": True,
                    "fri": True,
                    "sat": True,
                    "sun": True
                }
            },
            {
                "airline": "진에어",
                "flightNo": "LJ241",
                "destination": "KIX",
                "departureTime": "08:10",
                "arrivalTime": "10:00",
                "days": {
                    "mon": True,
                    "tue": True,
                    "wed": True,
                    "thu": True,
                    "fri": True,
                    "sat": True,
                    "sun": True
                }
            },
            {
                "airline": "에어부산",
                "flightNo": "BX164",
                "destination": "NRT",
                "departureTime": "07:35",
                "arrivalTime": "10:05",
                "days": {
                    "mon": True,
                    "tue": True,
                    "wed": True,
                    "thu": True,
                    "fri": True,
                    "sat": True,
                    "sun": True
                }
            }
        ]
    }
    
    # JSON 파일 저장
    with open(latest_dir / "schedule_PUS.json", 'w', encoding='utf-8') as f:
        json.dump(sample_schedule, f, ensure_ascii=False, indent=2)
    
    print(f"OK 샘플 데이터 저장: {latest_dir / 'schedule_PUS.json'}")
    
    # ICN 공항 샘플 데이터
    sample_schedule_icn = {
        "airport": "ICN",
        "crawledAt": datetime.now().isoformat(),
        "totalFlights": 2,
        "flights": [
            {
                "airline": "대한항공",
                "flightNo": "KE721",
                "destination": "KIX",
                "departureTime": "09:35",
                "arrivalTime": "11:20",
                "days": {
                    "mon": True,
                    "tue": True,
                    "wed": True,
                    "thu": True,
                    "fri": True,
                    "sat": True,
                    "sun": True
                }
            },
            {
                "airline": "아시아나항공",
                "flightNo": "OZ112",
                "destination": "KIX",
                "departureTime": "07:55",
                "arrivalTime": "09:40",
                "days": {
                    "mon": True,
                    "tue": True,
                    "wed": True,
                    "thu": True,
                    "fri": True,
                    "sat": True,
                    "sun": True
                }
            }
        ]
    }
    
    with open(latest_dir / "schedule_ICN.json", 'w', encoding='utf-8') as f:
        json.dump(sample_schedule_icn, f, ensure_ascii=False, indent=2)
    
    print(f"OK 샘플 데이터 저장: {latest_dir / 'schedule_ICN.json'}")

def start_simple_api_server():
    """간단한 API 서버 시작"""
    print("\nStarting simple API server...")
    
    try:
        from http.server import HTTPServer, BaseHTTPRequestHandler
        import urllib.parse
        import os
        
        class APIHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                # CORS 헤더 추가
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                
                # URL 파싱
                parsed = urllib.parse.urlparse(self.path)
                path = parsed.path
                
                if path.startswith('/api/schedule/'):
                    airport = path.split('/')[-1].upper()
                    json_file = f"./out/latest/schedule_{airport}.json"
                    
                    if os.path.exists(json_file):
                        with open(json_file, 'r', encoding='utf-8') as f:
                            self.wfile.write(f.read().encode('utf-8'))
                    else:
                        error_response = {"error": "Airport data not found"}
                        self.wfile.write(json.dumps(error_response).encode('utf-8'))
                        
                elif path == '/health':
                    health_response = {
                        "status": "healthy",
                        "timestamp": datetime.now().isoformat(),
                        "crawl_status": {
                            "last_schedule_crawl": datetime.now().isoformat(),
                            "last_live_crawl": None,
                            "last_schedule_status": "success",
                            "last_live_status": "pending",
                            "failed_airports": []
                        }
                    }
                    self.wfile.write(json.dumps(health_response, ensure_ascii=False).encode('utf-8'))
                    
                elif path == '/api/airports':
                    airports_response = {
                        "airports": ["ICN", "GMP", "PUS", "CJU", "TAE"],
                        "total": 5
                    }
                    self.wfile.write(json.dumps(airports_response).encode('utf-8'))
                    
                else:
                    error_response = {"error": "Not found"}
                    self.wfile.write(json.dumps(error_response).encode('utf-8'))
            
            def do_OPTIONS(self):
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
            
            def log_message(self, format, *args):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")
        
        server = HTTPServer(('localhost', 8000), APIHandler)
        print("OK API server starting on http://localhost:8000")
        print("  Endpoints:")
        print("  - GET /api/schedule/PUS")
        print("  - GET /api/schedule/ICN") 
        print("  - GET /health")
        print("  - GET /api/airports")
        print("\nPress Ctrl+C to stop")
        
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\nServer stopped")
    except Exception as e:
        print(f"NG Server error: {str(e)}")

if __name__ == "__main__":
    print("=== Flight Data Crawler Test ===\n")
    
    # 1. 네트워크 연결 테스트
    test_airportal_basic()
    
    # 2. 샘플 데이터 생성
    create_sample_data()
    
    # 3. API 서버 시작
    start_simple_api_server()