#!/usr/bin/env python3
"""
Simple API server startup script
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import os
import json
from datetime import datetime

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        if path.startswith('/api/schedule/'):
            airport = path.split('/')[-1].upper()
            
            # 실제 크롤링 데이터 우선 확인
            real_json_file = f'./out/latest/schedule_{airport}_real.json'
            fallback_json_file = f'./out/latest/schedule_{airport}.json'
            
            json_file = real_json_file if os.path.exists(real_json_file) else fallback_json_file
            
            if os.path.exists(json_file):
                with open(json_file, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            else:
                error_response = {'error': 'Airport data not found'}
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                
        elif path == '/health':
            health_response = {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'crawl_status': {
                    'last_schedule_crawl': datetime.now().isoformat(),
                    'last_live_crawl': None,
                    'last_schedule_status': 'success',
                    'last_live_status': 'pending',
                    'failed_airports': []
                }
            }
            self.wfile.write(json.dumps(health_response, ensure_ascii=False).encode('utf-8'))
            
        elif path == '/api/airports':
            airports_response = {
                'airports': ['ICN', 'GMP', 'PUS', 'CJU', 'TAE'],
                'total': 5
            }
            self.wfile.write(json.dumps(airports_response).encode('utf-8'))
            
        else:
            error_response = {'error': 'Not found'}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
    
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] {format % args}")

if __name__ == "__main__":
    try:
        server = HTTPServer(('localhost', 8001), APIHandler)
        print("API server starting on http://localhost:8001")
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
        print(f"Server error: {str(e)}")