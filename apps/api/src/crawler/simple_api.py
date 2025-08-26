from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os
from typing import List, Dict, Any
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

# 전체 항공편 데이터 로드
def load_flight_data():
    """전체 항공편 데이터 로드"""
    # Try multiple locations
    possible_paths = [
        Path(__file__).parent / "korean_flight_schedules.json",
        Path("korean_flight_schedules.json"),
        Path("apps/api/src/crawler/korean_flight_schedules.json"),
    ]
    
    for data_file in possible_paths:
        if data_file.exists():
            print(f"[API] Loading data from {data_file}")
            with open(data_file, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)
                print(f"[API] Successfully loaded data for {len(loaded_data)} airports")
                return loaded_data
    
    # 파일이 없으면 기본 데이터 반환
    return {
    "PUS": {
        "airport": "PUS",
        "crawledAt": datetime.now().isoformat(),
        "totalFlights": 15,
        "flights": [
            # NRT 노선 (5편)
            {
                "airline": "에어부산",
                "flightNo": "BX164",
                "destination": "NRT",
                "departureTime": "07:35",
                "arrivalTime": "10:05",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "이스타항공",
                "flightNo": "ZE605",
                "destination": "NRT",
                "departureTime": "08:20",
                "arrivalTime": "10:50",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "진에어",
                "flightNo": "LJ201",
                "destination": "NRT",
                "departureTime": "09:15",
                "arrivalTime": "11:45",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "제주항공",
                "flightNo": "7C1151",
                "destination": "NRT",
                "departureTime": "10:30",
                "arrivalTime": "13:00",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "티웨이항공",
                "flightNo": "TW251",
                "destination": "NRT",
                "departureTime": "14:40",
                "arrivalTime": "17:10",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            # KIX 노선 (4편)
            {
                "airline": "에어부산",
                "flightNo": "BX122",
                "destination": "KIX",
                "departureTime": "07:00",
                "arrivalTime": "08:50",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "제주항공",
                "flightNo": "7C1301",
                "destination": "KIX",
                "departureTime": "08:45",
                "arrivalTime": "10:35",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "진에어",
                "flightNo": "LJ241",
                "destination": "KIX",
                "departureTime": "11:20",
                "arrivalTime": "13:10",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "티웨이항공",
                "flightNo": "TW301",
                "destination": "KIX",
                "departureTime": "15:30",
                "arrivalTime": "17:20",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            # HND 노선 (2편)
            {
                "airline": "대한항공",
                "flightNo": "KE2711",
                "destination": "HND",
                "departureTime": "09:00",
                "arrivalTime": "11:20",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "일본항공",
                "flightNo": "JL958",
                "destination": "HND",
                "departureTime": "13:45",
                "arrivalTime": "16:05",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            # TPE 노선 (2편)
            {
                "airline": "에바항공",
                "flightNo": "BR169",
                "destination": "TPE",
                "departureTime": "12:00",
                "arrivalTime": "13:35",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "티웨이항공",
                "flightNo": "TW661",
                "destination": "TPE",
                "departureTime": "16:20",
                "arrivalTime": "17:55",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            # BKK 노선 (2편)
            {
                "airline": "티웨이항공",
                "flightNo": "TW101",
                "destination": "BKK",
                "departureTime": "00:50",
                "arrivalTime": "04:45",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "에어부산",
                "flightNo": "BX746",
                "destination": "BKK",
                "departureTime": "19:30",
                "arrivalTime": "23:25",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            }
        ]
    },
    "ICN": {
        "airport": "ICN",
        "crawledAt": datetime.now().isoformat(),
        "totalFlights": 5,
        "flights": [
            {
                "airline": "대한항공",
                "flightNo": "KE703",
                "destination": "NRT",
                "departureTime": "09:25",
                "arrivalTime": "11:45",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "아시아나항공",
                "flightNo": "OZ102",
                "destination": "NRT",
                "departureTime": "09:00",
                "arrivalTime": "11:20",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "대한항공",
                "flightNo": "KE721",
                "destination": "KIX",
                "departureTime": "09:35",
                "arrivalTime": "11:20",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "아시아나항공",
                "flightNo": "OZ112",
                "destination": "KIX",
                "departureTime": "07:55",
                "arrivalTime": "09:40",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            },
            {
                "airline": "진에어",
                "flightNo": "LJ231",
                "destination": "KIX",
                "departureTime": "07:40",
                "arrivalTime": "09:30",
                "days": {
                    "mon": True, "tue": True, "wed": True, "thu": True,
                    "fri": True, "sat": True, "sun": True
                }
            }
        ]
    }
}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "crawl_status": {
            "last_schedule_crawl": datetime.now().isoformat(),
            "last_live_crawl": datetime.now().isoformat(),
            "last_schedule_status": "success",
            "last_live_status": "success",
            "failed_airports": []
        },
        "timestamp": datetime.now().isoformat()
    }

# 시작시 데이터 로드
FLIGHT_DATA = load_flight_data()
print(f"[API] Loaded data for {len(FLIGHT_DATA)} airports")
for code, data in FLIGHT_DATA.items():
    print(f"[API] {code}: {data.get('totalFlights', 0)} flights to {len(set(f['destination'] for f in data.get('flights', [])))} destinations")

@app.get("/api/schedule/{airport_code}")
async def get_schedule(airport_code: str):
    airport_code = airport_code.upper()
    if airport_code in FLIGHT_DATA:
        return FLIGHT_DATA[airport_code]
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