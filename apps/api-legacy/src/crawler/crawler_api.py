"""
향상된 크롤러 API - 실제 airportal 데이터 사용
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import json
import os
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging
from airportal_crawler import AirportalCrawler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Korean Flight Schedule Crawler API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터 저장 경로
DATA_DIR = Path("flight_data")
DATA_DIR.mkdir(exist_ok=True)

# 전역 변수로 캐시된 데이터
cached_data = {}
last_crawl_time = None

async def load_or_crawl_data():
    """저장된 데이터를 로드하거나 없으면 크롤링"""
    global cached_data, last_crawl_time
    
    # 최근 크롤링 데이터 파일 확인
    data_file = DATA_DIR / "korean_flight_schedules.json"
    
    # 파일이 있고 24시간 이내면 로드
    if data_file.exists():
        file_time = datetime.fromtimestamp(data_file.stat().st_mtime)
        if datetime.now() - file_time < timedelta(hours=24):
            with open(data_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                last_crawl_time = file_time
                logger.info(f"Loaded cached data from {file_time}")
                return
    
    # 새로 크롤링
    logger.info("Starting new crawl...")
    crawler = AirportalCrawler()
    cached_data = await crawler.get_all_schedules()
    
    # 파일로 저장
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(cached_data, f, ensure_ascii=False, indent=2)
    
    last_crawl_time = datetime.now()
    logger.info("Crawling completed and saved")

@app.on_event("startup")
async def startup_event():
    """앱 시작시 데이터 로드"""
    await load_or_crawl_data()

@app.get("/health")
async def health():
    """헬스 체크"""
    return {
        "status": "healthy",
        "crawl_status": {
            "last_schedule_crawl": last_crawl_time.isoformat() if last_crawl_time else None,
            "last_live_crawl": None,
            "last_schedule_status": "success" if cached_data else "pending",
            "last_live_status": "not_implemented",
            "failed_airports": [],
            "total_airports": len(cached_data),
            "total_flights": sum(len(data.get('flights', [])) for data in cached_data.values())
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/airports")
async def get_airports():
    """지원 공항 목록"""
    airports = []
    for code, data in cached_data.items():
        airports.append({
            "code": code,
            "name": data.get("airportName", code),
            "totalFlights": data.get("totalFlights", 0)
        })
    
    return {
        "airports": airports,
        "total": len(airports)
    }

@app.get("/api/schedule/{airport_code}")
async def get_schedule(airport_code: str):
    """특정 공항의 전체 항공편 스케줄"""
    airport_code = airport_code.upper()
    
    if airport_code not in cached_data:
        # 캐시에 없으면 다시 로드 시도
        await load_or_crawl_data()
        
    if airport_code not in cached_data:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")
    
    return cached_data[airport_code]

@app.get("/api/schedule/{airport_code}/destinations")
async def get_destinations(airport_code: str):
    """특정 공항에서 갈 수 있는 모든 도착지 목록"""
    airport_code = airport_code.upper()
    
    if airport_code not in cached_data:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")
    
    destinations = set()
    for flight in cached_data[airport_code].get('flights', []):
        if flight.get('destination'):
            destinations.add(flight['destination'])
    
    return {
        "airport": airport_code,
        "destinations": sorted(list(destinations)),
        "total": len(destinations)
    }

@app.get("/api/schedule/{departure_code}/{arrival_code}")
async def get_route_schedule(departure_code: str, arrival_code: str):
    """특정 노선의 항공편 스케줄"""
    departure_code = departure_code.upper()
    arrival_code = arrival_code.upper()
    
    if departure_code not in cached_data:
        raise HTTPException(status_code=404, detail=f"Departure airport {departure_code} not found")
    
    # 해당 노선의 항공편만 필터링
    route_flights = []
    for flight in cached_data[departure_code].get('flights', []):
        if flight.get('destination') == arrival_code:
            route_flights.append(flight)
    
    return {
        "departure": departure_code,
        "arrival": arrival_code,
        "crawledAt": cached_data[departure_code].get('crawledAt'),
        "totalFlights": len(route_flights),
        "flights": route_flights
    }

@app.post("/api/crawl/schedule")
async def trigger_schedule_crawl(background_tasks: BackgroundTasks):
    """수동으로 스케줄 크롤링 트리거"""
    background_tasks.add_task(load_or_crawl_data)
    return {
        "message": "Schedule crawl triggered",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/statistics")
async def get_statistics():
    """전체 통계"""
    total_flights = 0
    routes = set()
    airlines = set()
    
    for airport_data in cached_data.values():
        for flight in airport_data.get('flights', []):
            total_flights += 1
            if flight.get('destination'):
                routes.add(f"{airport_data['airport']}-{flight['destination']}")
            if flight.get('airline'):
                airlines.add(flight['airline'])
    
    return {
        "total_airports": len(cached_data),
        "total_flights": total_flights,
        "total_routes": len(routes),
        "total_airlines": len(airlines),
        "last_update": last_crawl_time.isoformat() if last_crawl_time else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)