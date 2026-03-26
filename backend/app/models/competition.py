from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime, timezone
from app.db.database import Base


class Competition(Base):
    """설계공모 사례 모델"""
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False, index=True)
    category = Column(String(100), index=True)  # 공공건축, 주거, 문화시설, 교육시설 등
    location = Column(String(200))  # 위치
    year = Column(Integer, index=True)  # 공모 연도
    area_sqm = Column(Float)  # 대지면적 (㎡)
    building_area_sqm = Column(Float)  # 건축면적 (㎡)
    total_floor_area_sqm = Column(Float)  # 연면적 (㎡)
    floors_above = Column(Integer)  # 지상 층수
    floors_below = Column(Integer)  # 지하 층수
    organizer = Column(String(200))  # 발주처
    winner = Column(String(200))  # 당선자/당선팀
    description = Column(Text)  # 설계 개요/설명
    keywords = Column(JSON)  # 키워드 리스트
    source_url = Column(String(500))  # 출처 URL
    image_urls = Column(JSON)  # 이미지 URL 리스트
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AnalysisResult(Base):
    """PDF 분석 결과 모델"""
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(500), nullable=False)
    project_name = Column(String(500))  # 프로젝트명
    project_type = Column(String(100))  # 공모 유형
    site_location = Column(String(200))  # 대상지 위치
    site_area_sqm = Column(Float)  # 대지면적
    budget = Column(String(100))  # 공사비/예산
    key_requirements = Column(JSON)  # 핵심 요구사항
    design_keywords = Column(JSON)  # 설계 키워드
    program_requirements = Column(JSON)  # 프로그램 요구사항 (용도별 면적 등)
    raw_analysis = Column(Text)  # Claude 원본 분석 결과
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
