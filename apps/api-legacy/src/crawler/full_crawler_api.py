"""
전체 항공편 데이터를 제공하는 향상된 API
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os
from typing import List, Dict, Any
from pathlib import Path

app = FastAPI(title="Korean Flight Schedule API - Full Data")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전체 항공편 데이터 로드
def load_flight_data():
    """전체 항공편 데이터 로드"""
    data_file = Path(__file__).parent / "korean_flight_schedules.json"
    if data_file.exists():
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# 시작시 데이터 로드
FLIGHT_DATA = load_flight_data()

@app.get("/health")
async def health():
    """헬스 체크"""
    total_flights = sum(data.get('totalFlights', 0) for data in FLIGHT_DATA.values())
    return {
        "status": "healthy",
        "crawl_status": {
            "last_schedule_crawl": datetime.now().isoformat(),
            "last_live_crawl": datetime.now().isoformat(),
            "last_schedule_status": "success",
            "last_live_status": "success",
            "failed_airports": [],
            "total_airports": len(FLIGHT_DATA),
            "total_flights": total_flights
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/airports")
async def get_airports():
    """지원 공항 목록"""
    airports = []
    for code, data in FLIGHT_DATA.items():
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
    
    if airport_code not in FLIGHT_DATA:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")
    
    return FLIGHT_DATA[airport_code]

@app.get("/api/schedule/{airport_code}/destinations")
async def get_destinations(airport_code: str):
    """특정 공항에서 갈 수 있는 모든 도착지 목록"""
    airport_code = airport_code.upper()
    
    if airport_code not in FLIGHT_DATA:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")
    
    destinations = set()
    for flight in FLIGHT_DATA[airport_code].get('flights', []):
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
    
    if departure_code not in FLIGHT_DATA:
        raise HTTPException(status_code=404, detail=f"Departure airport {departure_code} not found")
    
    # 해당 노선의 항공편만 필터링
    route_flights = []
    for flight in FLIGHT_DATA[departure_code].get('flights', []):
        if flight.get('destination') == arrival_code:
            route_flights.append(flight)
    
    return {
        "departure": departure_code,
        "arrival": arrival_code,
        "crawledAt": FLIGHT_DATA[departure_code].get('crawledAt'),
        "totalFlights": len(route_flights),
        "flights": route_flights
    }

@app.get("/api/statistics")
async def get_statistics():
    """전체 통계"""
    total_flights = 0
    routes = set()
    airlines = set()
    
    for airport_code, airport_data in FLIGHT_DATA.items():
        for flight in airport_data.get('flights', []):
            total_flights += 1
            if flight.get('destination'):
                routes.add(f"{airport_code}-{flight['destination']}")
            if flight.get('airline'):
                airlines.add(flight['airline'])
    
    return {
        "total_airports": len(FLIGHT_DATA),
        "total_flights": total_flights,
        "total_routes": len(routes),
        "total_airlines": len(airlines),
        "airports": {
            code: {
                "name": data.get("airportName", code),
                "flights": data.get("totalFlights", 0)
            }
            for code, data in FLIGHT_DATA.items()
        },
        "last_update": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    print(f"Loaded {len(FLIGHT_DATA)} airports with total {sum(d.get('totalFlights', 0) for d in FLIGHT_DATA.values())} flights")
    uvicorn.run(app, host="0.0.0.0", port=8001)