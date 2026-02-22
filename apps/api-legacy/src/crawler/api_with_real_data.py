from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os
from pathlib import Path

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 직접 JSON 파일을 로드 (매 요청마다 다시 로드하도록 함수로 변경)
def load_flight_data():
    data_file = Path(__file__).parent / "korean_flight_schedules.json"
    with open(data_file, 'r', encoding='utf-8') as f:
        return json.load(f)

# 초기 로드
FLIGHT_DATA = load_flight_data()

print(f"[API] Loaded data for {len(FLIGHT_DATA)} airports")
for code, data in FLIGHT_DATA.items():
    flights = data.get('flights', [])
    destinations = set(f['destination'] for f in flights)
    print(f"[API] {code}: {len(flights)} flights to {len(destinations)} destinations")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/schedule/{airport_code}")
async def get_schedule(airport_code: str):
    # 매 요청마다 최신 데이터 로드
    current_data = load_flight_data()
    airport_code = airport_code.upper()
    if airport_code in current_data:
        return current_data[airport_code]
    else:
        raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")

@app.get("/api/airports")
async def get_airports():
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)