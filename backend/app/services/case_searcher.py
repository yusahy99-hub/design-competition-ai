from groq import Groq
import aiohttp
from bs4 import BeautifulSoup
import os
import json
import asyncio
import urllib.parse
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.competition import Competition


class CaseSearcher:
    """설계공모 유사 사례를 검색하는 서비스"""

    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    async def search_similar_cases(self, analysis: dict, db: Optional[AsyncSession] = None) -> dict:
        db_results = []
        if db:
            db_results = await self._search_local_db(analysis, db)

        ai_results = await self._ai_recommend(analysis, db_results)

        # 각 사례에 검색 링크 생성
        for item in ai_results:
            title = item.get("title", "")
            architect = item.get("architect", "")
            q = f"{title} {architect}".strip()
            encoded = urllib.parse.quote(q)

            item["links"] = {
                "naver_search": f"https://search.naver.com/search.naver?query={urllib.parse.quote(f'{q} 설계공모 당선')}",
                "google_search": f"https://www.google.com/search?q={urllib.parse.quote(f'{q} 설계공모 당선작')}&hl=ko",
                "naver_images": f"https://search.naver.com/search.naver?where=image&query={urllib.parse.quote(f'{q} 건축 조감도')}",
                "google_images": f"https://www.google.com/search?q={urllib.parse.quote(f'{q} 건축 조감도 도면')}&tbm=isch&hl=ko",
                "archdaily": f"https://www.google.com/search?q=site:archdaily.com+{encoded}",
            }

        return {
            "db_results": db_results,
            "web_results": [],
            "ai_recommendations": ai_results,
        }

    async def _search_local_db(self, analysis: dict, db: AsyncSession) -> list:
        project_type = analysis.get("project_type", "")
        keywords = analysis.get("design_keywords", [])

        conditions = []
        if project_type:
            conditions.append(Competition.category == project_type)

        stmt = select(Competition)
        if conditions:
            stmt = stmt.where(or_(*conditions))
        stmt = stmt.limit(20)

        result = await db.execute(stmt)
        competitions = result.scalars().all()

        scored = []
        for comp in competitions:
            score = 0
            comp_keywords = comp.keywords or []
            for kw in keywords:
                if any(kw in ckw or ckw in kw for ckw in comp_keywords):
                    score += 1
            if comp.category == project_type:
                score += 3
            scored.append({
                "id": comp.id, "title": comp.title, "category": comp.category,
                "location": comp.location, "year": comp.year, "winner": comp.winner,
                "description": comp.description, "keywords": comp.keywords,
                "source_url": comp.source_url, "image_urls": comp.image_urls,
                "score": score,
            })
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:10]

    async def _ai_recommend(self, analysis: dict, db_results: list) -> list:
        """AI로 유사 사례 추천 - 실제 존재하는 프로젝트만"""
        context = ""
        if db_results:
            context = "[DB 사례]\n" + "\n".join(
                f"- {r['title']} ({r.get('year', '?')}년)" for r in db_results[:5]
            )

        prompt = f"""당신은 한국 건축 설계공모 전문가입니다.

## 현재 공모 정보:
- 프로젝트명: {analysis.get('project_name', '미상')}
- 유형: {analysis.get('project_type', '미상')}
- 위치: {analysis.get('site_location', '미상')}
- 규모: {analysis.get('scale', '미상')}
- 키워드: {', '.join(analysis.get('design_keywords', []))}
- 요구사항: {', '.join(analysis.get('key_requirements', [])[:5])}

{context}

## 중요 규칙:
1. 반드시 실제로 존재하는 한국 국내 설계공모 당선작만 추천하세요
2. 건축도시공간연구소(auri.re.kr), 대한건축학회, 서울시 공공건축가, 건축문화대상 등에서 확인 가능한 프로젝트
3. 가상의 프로젝트를 만들어내지 마세요
4. 2015년 이후 최근 사례 위주로 추천하세요
5. 6~8개 추천
6. 각 사례에 아래 정보를 반드시 포함:
   - title: 정확한 프로젝트명 (실제 공모명)
   - year: 당선 연도
   - location: 위치
   - architect: 설계사무소명 (실제 당선자)
   - similarity: 현재 공모와 유사한 점 (구체적으로)
   - design_strategy: 이 사례에서 참고할 수 있는 설계 전략
   - features: 주요 건축적 특징 (구조, 재료, 공간구성 등)
   - relevance_score: 유사도 점수 (0-100)

JSON 배열만 출력하세요. 다른 텍스트 없이:

[{{"title":"프로젝트명","year":2023,"location":"서울시","architect":"설계사무소","similarity":"유사점","design_strategy":"전략","features":"특징","relevance_score":85}}]"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.2,
        )

        response_text = response.choices[0].message.content
        json_start = response_text.find("[")
        json_end = response_text.rfind("]") + 1
        if json_start == -1 or json_end == 0:
            return []
        try:
            return json.loads(response_text[json_start:json_end])
        except json.JSONDecodeError:
            return []
