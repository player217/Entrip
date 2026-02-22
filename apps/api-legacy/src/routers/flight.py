import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
import httpx
from pydantic import BaseModel

# 테스트용 키 하드코딩 (prod 전 환경변수로 이동 필요)
OD_API_KEY = "fbbYsG27DtQ4lJN8eeOAZrsZVrrAJLKEYwCg9OitJmmqBdtr7vnqJvzLLmsSr9aFGxD9RyRItLaaP+04Kz3V6A=="
OD_BASE = "https://api.odcloud.kr/api"
UDDI_DOM_ROUTE = "15002707/v1/uddi:36a1b1ac-597a-4db5-93cd-84ee87f14798"
UDDI_DOM_SCHED = "15043890/v1/uddi:57dcf102-1447-49e9-bd2b-cfb32e869d5c"
KAC_XML_BASE = "https://openapi.airport.co.kr/service"

router = APIRouter(prefix="/flight", tags=["flight"])

# Response models
class Airport(BaseModel):
    code: str
    name: str
    city: str
    
class Route(BaseModel):
    departure: str
    arrival: str
    airlines: List[str]
    duration: int  # minutes
    
class FlightSchedule(BaseModel):
    flightNo: str
    airline: str
    departure: str
    arrival: str
    scheduledDep: str
    scheduledArr: str
    avgDelay: Optional[int] = None  # minutes
    status: Optional[str] = None
    aircraft: Optional[str] = None
    
class FlightStatus(BaseModel):
    flightNo: str
    status: str
    actualDep: Optional[str] = None
    actualArr: Optional[str] = None
    gate: Optional[str] = None
    delay: Optional[int] = None

# 한국 주요 공항 하드코딩
KOREAN_AIRPORTS = [
    {"code": "ICN", "name": "인천국제공항", "city": "인천"},
    {"code": "GMP", "name": "김포국제공항", "city": "서울"},
    {"code": "PUS", "name": "김해국제공항", "city": "부산"},
    {"code": "CJU", "name": "제주국제공항", "city": "제주"},
    {"code": "TAE", "name": "대구국제공항", "city": "대구"},
    {"code": "CJJ", "name": "청주국제공항", "city": "청주"},
    {"code": "KWJ", "name": "광주공항", "city": "광주"},
    {"code": "RSU", "name": "여수공항", "city": "여수"},
    {"code": "USN", "name": "울산공항", "city": "울산"},
    {"code": "MWX", "name": "무안국제공항", "city": "무안"},
    {"code": "KPO", "name": "포항공항", "city": "포항"},
    {"code": "WJU", "name": "원주공항", "city": "원주"},
    {"code": "YNY", "name": "양양국제공항", "city": "양양"},
    {"code": "HIN", "name": "사천공항", "city": "사천"},
    {"code": "KUV", "name": "군산공항", "city": "군산"},
    {"code": "NRT", "name": "나리타국제공항", "city": "도쿄"},
    {"code": "KIX", "name": "간사이국제공항", "city": "오사카"},
    {"code": "PEK", "name": "베이징수도국제공항", "city": "베이징"}
]

@router.get("/airports", response_model=List[Airport])
async def get_airports():
    """한국 주요 공항 목록 반환"""
    return [Airport(**airport) for airport in KOREAN_AIRPORTS]

@router.get("/routes", response_model=List[Route])
async def get_routes(departure: str = Query(..., description="출발 공항 코드")):
    """특정 공항에서 출발하는 노선 목록"""
    # 임시 하드코딩 데이터
    routes_data = {
        "ICN": [
            {"departure": "ICN", "arrival": "NRT", "airlines": ["KE", "OZ", "JL", "NH"], "duration": 150},
            {"departure": "ICN", "arrival": "KIX", "airlines": ["KE", "OZ", "JL"], "duration": 120},
            {"departure": "ICN", "arrival": "PEK", "airlines": ["KE", "OZ", "CA", "MU"], "duration": 140},
            {"departure": "ICN", "arrival": "PUS", "airlines": ["KE", "OZ", "BX", "7C"], "duration": 60},
            {"departure": "ICN", "arrival": "CJU", "airlines": ["KE", "OZ", "BX", "7C", "LJ"], "duration": 70},
        ],
        "GMP": [
            {"departure": "GMP", "arrival": "CJU", "airlines": ["KE", "OZ", "7C"], "duration": 65},
            {"departure": "GMP", "arrival": "PUS", "airlines": ["KE", "OZ", "BX"], "duration": 55},
            {"departure": "GMP", "arrival": "KIX", "airlines": ["KE", "OZ"], "duration": 110},
        ]
    }
    
    routes = routes_data.get(departure.upper(), [])
    if not routes:
        raise HTTPException(status_code=404, detail=f"No routes found for {departure}")
    
    return [Route(**route) for route in routes]

@router.get("/timetable", response_model=List[FlightSchedule])
async def get_timetable(
    dep: Optional[str] = Query(None, description="출발 공항"),
    arr: Optional[str] = Query(None, description="도착 공항"),
    date: Optional[str] = Query(None, description="날짜 YYYY-MM-DD")
):
    """항공편 시간표 조회 (오늘 기준)"""
    if not dep and not arr:
        raise HTTPException(status_code=400, detail="dep 또는 arr 중 하나는 필수")
    
    # 날짜 처리
    target_date = datetime.now().strftime("%Y%m%d") if not date else date.replace("-", "")
    
    # 임시 데이터 생성 (실제로는 ODcloud API 호출)
    schedules = []
    base_time = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
    
    airlines = ["KE", "OZ", "7C", "BX", "LJ", "JL", "NH", "CA", "MU"]
    statuses = ["ON TIME", "DELAYED", "BOARDING", "DEPARTED", "ARRIVED"]
    
    for i in range(25):  # 25개 항공편 생성
        dep_time = base_time.replace(hour=(6 + i) % 24)
        arr_time = dep_time.replace(hour=(dep_time.hour + 2) % 24)
        
        flight = FlightSchedule(
            flightNo=f"{airlines[i % len(airlines)]}{100 + i * 17}",
            airline=airlines[i % len(airlines)],
            departure=dep or "ICN",
            arrival=arr or "NRT",
            scheduledDep=dep_time.strftime("%Y-%m-%d %H:%M"),
            scheduledArr=arr_time.strftime("%Y-%m-%d %H:%M"),
            avgDelay=i % 5 * 5,  # 0, 5, 10, 15, 20분 지연
            status=statuses[i % len(statuses)],
            aircraft="B737" if i % 3 == 0 else "A320"
        )
        schedules.append(flight)
    
    return schedules

@router.get("/delay/{flight_no}")
async def get_flight_delay(flight_no: str):
    """특정 항공편의 평균 지연 시간"""
    # 임시 데이터
    delay_data = {
        "flightNo": flight_no.upper(),
        "avgDelay": 12,  # minutes
        "delayRate": 0.23,  # 23%
        "onTimeRate": 0.77,
        "samples": 145,
        "lastUpdated": datetime.now().isoformat()
    }
    return delay_data

@router.get("/status/{flight_no}", response_model=FlightStatus)
async def get_flight_status(flight_no: str):
    """특정 항공편의 실시간 상태"""
    # 임시 실시간 상태
    now = datetime.now()
    status_options = ["SCHEDULED", "BOARDING", "DEPARTED", "IN FLIGHT", "ARRIVED", "DELAYED", "CANCELLED"]
    
    status = FlightStatus(
        flightNo=flight_no.upper(),
        status=status_options[hash(flight_no) % len(status_options)],
        actualDep=now.strftime("%Y-%m-%d %H:%M") if hash(flight_no) % 3 == 0 else None,
        actualArr=(now.replace(hour=(now.hour + 2) % 24)).strftime("%Y-%m-%d %H:%M") if hash(flight_no) % 3 == 1 else None,
        gate=f"G{(hash(flight_no) % 20) + 1}",
        delay=hash(flight_no) % 30 if hash(flight_no) % 4 == 0 else None
    )
    
    return status