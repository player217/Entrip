"""
데이터 저장 및 관리
"""

import json
import csv
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from config import settings


class Storage:
    def __init__(self):
        self.base_dir = Path(settings.OUTPUT_DIR)
        self.latest_dir = self.base_dir / "latest"
        self.archive_dir = self.base_dir / "archive"
        
        # 디렉토리 생성
        self.latest_dir.mkdir(parents=True, exist_ok=True)
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
    def save_schedule(self, airport_code: str, data: Dict):
        """스케줄 데이터 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        
        # Archive에 저장
        archive_subdir = self.archive_dir / timestamp
        archive_subdir.mkdir(exist_ok=True)
        
        # JSON 저장
        json_path = archive_subdir / f"schedule_{airport_code}.json"
        self.save_json(json_path, data)
        
        # CSV 저장
        csv_path = archive_subdir / f"schedule_{airport_code}.csv"
        self.save_schedule_csv(csv_path, data)
        
        # Latest로 복사
        latest_json = self.latest_dir / f"schedule_{airport_code}.json"
        latest_csv = self.latest_dir / f"schedule_{airport_code}.csv"
        
        shutil.copy2(json_path, latest_json)
        shutil.copy2(csv_path, latest_csv)
        
    def save_live_status(self, airport_code: str, data: Dict):
        """실시간 현황 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        
        # Archive에 저장
        archive_subdir = self.archive_dir / timestamp
        archive_subdir.mkdir(exist_ok=True)
        
        # JSON 저장
        json_path = archive_subdir / f"live_{airport_code}.json"
        self.save_json(json_path, data)
        
        # CSV 저장
        csv_path = archive_subdir / f"live_{airport_code}.csv"
        self.save_live_csv(csv_path, data)
        
        # Latest로 복사
        latest_json = self.latest_dir / f"live_{airport_code}.json"
        latest_csv = self.latest_dir / f"live_{airport_code}.csv"
        
        shutil.copy2(json_path, latest_json)
        shutil.copy2(csv_path, latest_csv)
        
    def save_json(self, path: Path, data: Dict):
        """JSON 파일 저장"""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    def load_json(self, path: Path) -> Dict:
        """JSON 파일 로드"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
            
    def save_schedule_csv(self, path: Path, data: Dict):
        """스케줄 CSV 저장"""
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            
            # 헤더
            writer.writerow([
                '항공사', '편명', '도착지', '출발시간', '도착시간',
                '월', '화', '수', '목', '금', '토', '일'
            ])
            
            # 데이터
            for flight in data.get('flights', []):
                days = flight.get('days', {})
                writer.writerow([
                    flight.get('airline', ''),
                    flight.get('flightNo', ''),
                    flight.get('destination', ''),
                    flight.get('departureTime', ''),
                    flight.get('arrivalTime', ''),
                    'O' if days.get('mon') else '',
                    'O' if days.get('tue') else '',
                    'O' if days.get('wed') else '',
                    'O' if days.get('thu') else '',
                    'O' if days.get('fri') else '',
                    'O' if days.get('sat') else '',
                    'O' if days.get('sun') else ''
                ])
                
    def save_live_csv(self, path: Path, data: Dict):
        """실시간 현황 CSV 저장"""
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            
            # 출발 데이터
            writer.writerow(['=== 출발 ==='])
            writer.writerow(['항공사', '편명', '도착지', '예정시간', '예상시간', '상태'])
            
            for flight in data.get('departures', []):
                writer.writerow([
                    flight.get('airline', ''),
                    flight.get('flightNo', ''),
                    flight.get('destination', ''),
                    flight.get('scheduledTime', ''),
                    flight.get('estimatedTime', ''),
                    flight.get('status', '')
                ])
            
            writer.writerow([])  # 빈 줄
            
            # 도착 데이터
            writer.writerow(['=== 도착 ==='])
            writer.writerow(['항공사', '편명', '출발지', '예정시간', '예상시간', '상태'])
            
            for flight in data.get('arrivals', []):
                writer.writerow([
                    flight.get('airline', ''),
                    flight.get('flightNo', ''),
                    flight.get('destination', ''),  # 도착 테이블에서는 출발지
                    flight.get('scheduledTime', ''),
                    flight.get('estimatedTime', ''),
                    flight.get('status', '')
                ])
                
    def archive_excel(self, source_path: Path):
        """Excel 파일 아카이브"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        dest_path = self.archive_dir / f"항공기출도착_{timestamp}.xlsx"
        shutil.move(str(source_path), str(dest_path))
        
    def get_latest_schedule_path(self, airport_code: str, format: str) -> Optional[Path]:
        """최신 스케줄 파일 경로"""
        path = self.latest_dir / f"schedule_{airport_code}.{format}"
        return path if path.exists() else None
        
    def get_latest_live_path(self, airport_code: str, format: str) -> Optional[Path]:
        """최신 실시간 파일 경로"""
        path = self.latest_dir / f"live_{airport_code}.{format}"
        return path if path.exists() else None