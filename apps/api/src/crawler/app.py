#!/usr/bin/env python3
"""
항공편 크롤링 및 API 서버
- 1일 1회: 전체 공항 스케줄 크롤링
- 10분마다: 실시간 출도착 현황 크롤링
- FastAPI로 간단한 REST API 제공
"""

import os
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from scraper import AirportScraper
from storage import Storage
from config import settings

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(title="Entrip Flight API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 변수
scraper: Optional[AirportScraper] = None
storage: Optional[Storage] = None
scheduler: Optional[AsyncIOScheduler] = None

# 크롤링 상태
crawl_status = {
    "last_schedule_crawl": None,
    "last_live_crawl": None,
    "last_schedule_status": "pending",
    "last_live_status": "pending",
    "failed_airports": []
}


async def crawl_all_schedules():
    """전체 공항 스케줄 크롤링 (1일 1회)"""
    global crawl_status
    logger.info("Starting daily schedule crawl")
    crawl_status["last_schedule_status"] = "running"
    crawl_status["failed_airports"] = []
    
    try:
        await scraper.init_browser()
        
        for airport_code in settings.AIRPORTS:
            try:
                logger.info(f"Crawling schedule for {airport_code}")
                
                # 스케줄 크롤링
                schedule_data = await scraper.crawl_schedule(airport_code)
                
                if schedule_data and len(schedule_data.get("flights", [])) >= 10:
                    # 데이터 저장
                    storage.save_schedule(airport_code, schedule_data)
                    logger.info(f"Saved {len(schedule_data['flights'])} flights for {airport_code}")
                else:
                    logger.warning(f"Insufficient data for {airport_code}")
                    crawl_status["failed_airports"].append(airport_code)
                
                # 요청 간 대기
                await asyncio.sleep(1.0)
                
            except Exception as e:
                logger.error(f"Failed to crawl {airport_code}: {str(e)}")
                crawl_status["failed_airports"].append(airport_code)
        
        # Excel 다운로드 시도
        try:
            excel_path = await scraper.download_excel()
            if excel_path:
                storage.archive_excel(excel_path)
                logger.info("Excel file downloaded and archived")
        except Exception as e:
            logger.error(f"Failed to download Excel: {str(e)}")
        
        crawl_status["last_schedule_crawl"] = datetime.now().isoformat()
        crawl_status["last_schedule_status"] = "success" if not crawl_status["failed_airports"] else "partial"
        
    except Exception as e:
        logger.error(f"Schedule crawl failed: {str(e)}")
        crawl_status["last_schedule_status"] = "failed"
    finally:
        await scraper.close_browser()


async def crawl_live_status():
    """실시간 출도착 현황 크롤링 (10분마다)"""
    global crawl_status
    logger.info("Starting live status crawl")
    crawl_status["last_live_status"] = "running"
    
    try:
        await scraper.init_browser()
        
        for airport_code in settings.AIRPORTS:
            try:
                logger.info(f"Crawling live status for {airport_code}")
                
                # 실시간 현황 크롤링
                live_data = await scraper.crawl_live_status(airport_code)
                
                if live_data:
                    # 데이터 저장
                    storage.save_live_status(airport_code, live_data)
                    logger.info(f"Saved live status for {airport_code}")
                
                # 요청 간 대기
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Failed to crawl live status for {airport_code}: {str(e)}")
        
        crawl_status["last_live_crawl"] = datetime.now().isoformat()
        crawl_status["last_live_status"] = "success"
        
    except Exception as e:
        logger.error(f"Live crawl failed: {str(e)}")
        crawl_status["last_live_status"] = "failed"
    finally:
        await scraper.close_browser()


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 초기화"""
    global scraper, storage, scheduler
    
    # 초기화
    scraper = AirportScraper()
    storage = Storage()
    scheduler = AsyncIOScheduler()
    
    # 스케줄 작업 등록
    # 1일 1회 (오전 3시)
    scheduler.add_job(
        crawl_all_schedules,
        CronTrigger(hour=3, minute=0),
        id="daily_schedule",
        replace_existing=True
    )
    
    # 10분마다
    scheduler.add_job(
        crawl_live_status,
        IntervalTrigger(minutes=10),
        id="live_status",
        replace_existing=True
    )
    
    # 개발 모드에서는 즉시 실행
    if settings.DEV_MODE:
        scheduler.add_job(
            crawl_all_schedules,
            id="initial_schedule",
            replace_existing=True
        )
    
    scheduler.start()
    logger.info("Scheduler started")


@app.on_event("shutdown")
async def shutdown_event():
    """앱 종료 시 정리"""
    if scheduler:
        scheduler.shutdown()
    if scraper:
        await scraper.close_browser()


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "crawl_status": crawl_status,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/schedule/{airport}")
async def get_schedule(
    airport: str,
    format: str = Query("json", regex="^(json|csv)$")
):
    """공항별 스케줄 조회"""
    airport = airport.upper()
    if airport not in settings.AIRPORTS:
        raise HTTPException(status_code=404, detail="Airport not found")
    
    file_path = storage.get_latest_schedule_path(airport, format)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Schedule data not found")
    
    if format == "json":
        return JSONResponse(content=storage.load_json(file_path))
    else:
        return FileResponse(file_path, media_type="text/csv")


@app.get("/api/live/{airport}")
async def get_live_status(
    airport: str,
    format: str = Query("json", regex="^(json|csv)$")
):
    """공항별 실시간 현황 조회"""
    airport = airport.upper()
    if airport not in settings.AIRPORTS:
        raise HTTPException(status_code=404, detail="Airport not found")
    
    file_path = storage.get_latest_live_path(airport, format)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Live data not found")
    
    if format == "json":
        return JSONResponse(content=storage.load_json(file_path))
    else:
        return FileResponse(file_path, media_type="text/csv")


@app.get("/api/airports")
async def get_airports():
    """지원 공항 목록"""
    return {
        "airports": settings.AIRPORTS,
        "total": len(settings.AIRPORTS)
    }


@app.post("/api/crawl/schedule")
async def trigger_schedule_crawl():
    """수동으로 스케줄 크롤링 트리거"""
    asyncio.create_task(crawl_all_schedules())
    return {"message": "Schedule crawl started"}


@app.post("/api/crawl/live")
async def trigger_live_crawl():
    """수동으로 실시간 크롤링 트리거"""
    asyncio.create_task(crawl_live_status())
    return {"message": "Live crawl started"}


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEV_MODE
    )