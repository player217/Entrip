"""
크롤러 설정
"""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # 공항 목록
    AIRPORTS: List[str] = os.getenv(
        "AIRPORTS", 
        "ICN,GMP,PUS,CJU,TAE"
    ).split(",")
    
    # 출력 디렉토리
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./out")
    
    # 브라우저 설정
    HEADLESS: bool = os.getenv("HEADLESS", "true").lower() == "true"
    
    # 개발 모드
    DEV_MODE: bool = os.getenv("DEV_MODE", "false").lower() == "true"
    
    # 크롤링 재시도
    MAX_RETRY: int = int(os.getenv("MAX_RETRY", "2"))
    
    # 타임아웃 (초)
    TIMEOUT: int = int(os.getenv("TIMEOUT", "30"))


settings = Settings()