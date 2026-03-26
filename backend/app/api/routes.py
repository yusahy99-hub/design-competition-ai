from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid

from app.db.database import get_db
from app.services.pdf_analyzer import PDFAnalyzer
from app.services.case_searcher import CaseSearcher
from app.models.competition import AnalysisResult


class ImageSearchRequest(BaseModel):
    title: str
    architect: str = ""
    keywords: list[str] = []

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze")
async def analyze_pdf(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """설계공모 지침서 PDF 업로드 및 분석"""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    # 파일 저장
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        # PDF 분석
        analyzer = PDFAnalyzer()
        analysis = await analyzer.analyze_guidelines(file_path)

        # 분석 결과 DB 저장
        result = AnalysisResult(
            filename=file.filename,
            project_name=analysis.get("project_name"),
            project_type=analysis.get("project_type"),
            site_location=analysis.get("site_location"),
            site_area_sqm=analysis.get("site_area_sqm"),
            budget=analysis.get("budget"),
            key_requirements=analysis.get("key_requirements"),
            design_keywords=analysis.get("design_keywords"),
            program_requirements=analysis.get("program_requirements"),
            raw_analysis=analysis.get("raw_analysis"),
        )
        db.add(result)
        await db.commit()
        await db.refresh(result)

        return {
            "analysis_id": result.id,
            "analysis": analysis,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")


@router.post("/search/{analysis_id}")
async def search_cases(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """분석 결과를 바탕으로 유사 사례 검색"""
    from sqlalchemy import select

    stmt = select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    result = await db.execute(stmt)
    analysis_record = result.scalar_one_or_none()

    if not analysis_record:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다.")

    analysis = {
        "project_name": analysis_record.project_name,
        "project_type": analysis_record.project_type,
        "site_location": analysis_record.site_location,
        "site_area_sqm": analysis_record.site_area_sqm,
        "budget": analysis_record.budget,
        "key_requirements": analysis_record.key_requirements or [],
        "design_keywords": analysis_record.design_keywords or [],
        "program_requirements": analysis_record.program_requirements or [],
    }

    searcher = CaseSearcher()
    results = await searcher.search_similar_cases(analysis, db)

    return results


@router.get("/analyses")
async def list_analyses(db: AsyncSession = Depends(get_db)):
    """이전 분석 결과 목록 조회"""
    from sqlalchemy import select

    stmt = select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "id": r.id,
            "filename": r.filename,
            "project_name": r.project_name,
            "project_type": r.project_type,
            "site_location": r.site_location,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """특정 분석 결과 상세 조회"""
    from sqlalchemy import select

    stmt = select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다.")

    return {
        "id": record.id,
        "filename": record.filename,
        "project_name": record.project_name,
        "project_type": record.project_type,
        "site_location": record.site_location,
        "site_area_sqm": record.site_area_sqm,
        "budget": record.budget,
        "key_requirements": record.key_requirements,
        "design_keywords": record.design_keywords,
        "program_requirements": record.program_requirements,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


@router.post("/images")
async def search_images(req: ImageSearchRequest):
    """프로젝트별 조감도/도면/외관 이미지 검색"""
    import aiohttp
    from bs4 import BeautifulSoup
    import urllib.parse

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    queries = [
        f"{req.title} {req.architect} 건축 조감도",
        f"{req.title} 설계공모 당선작",
        f"{req.title} {req.architect} 건축 도면 배치도",
    ]

    all_images = []
    seen = set()

    async with aiohttp.ClientSession() as session:
        for query in queries:
            try:
                encoded = urllib.parse.quote(query)
                url = f"https://search.naver.com/search.naver?where=image&query={encoded}"
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        html = await resp.text()
                        soup = BeautifulSoup(html, "html.parser")
                        for img in soup.select("img._img, img.thumb, img[data-source]"):
                            src = img.get("data-source") or img.get("src") or ""
                            if src and src.startswith("http") and "blank" not in src and src not in seen:
                                seen.add(src)
                                all_images.append(src)
            except Exception:
                pass

    return {"images": all_images[:12]}


class DownloadRequest(BaseModel):
    analysis: dict
    cases: dict


@router.post("/download")
async def download_report(req: DownloadRequest):
    """검색 결과를 다운로드용 JSON으로 반환"""
    from fastapi.responses import JSONResponse

    analysis = req.analysis
    ai_recs = req.cases.get("ai_recommendations", [])
    web_results = req.cases.get("web_results", [])

    report = {
        "프로젝트_분석": {
            "프로젝트명": analysis.get("project_name", ""),
            "유형": analysis.get("project_type", ""),
            "위치": analysis.get("site_location", ""),
            "규모": analysis.get("scale", ""),
            "예산": analysis.get("budget", ""),
            "키워드": analysis.get("design_keywords", []),
            "요구사항": analysis.get("key_requirements", []),
        },
        "AI_추천_사례": [
            {
                "프로젝트명": c.get("title", ""),
                "연도": c.get("year", ""),
                "위치": c.get("location", ""),
                "설계사무소": c.get("architect", ""),
                "유사점": c.get("similarity", ""),
                "설계전략": c.get("design_strategy", ""),
                "건축특징": c.get("features", ""),
                "유사도": c.get("relevance_score", ""),
                "출처": c.get("source_url", ""),
            }
            for c in ai_recs
        ],
        "웹_검색_결과": [
            {
                "제목": w.get("title", ""),
                "URL": w.get("url", ""),
                "설명": w.get("description", ""),
            }
            for w in web_results
        ],
    }

    return JSONResponse(
        content=report,
        headers={
            "Content-Disposition": f'attachment; filename="design_competition_report.json"'
        },
    )
