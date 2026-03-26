from groq import Groq
import aiohttp
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
        self.kakao_key = os.getenv("KAKAO_API_KEY", "")

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

            item["links"] = {
                "naver_search": f"https://search.naver.com/search.naver?query={urllib.parse.quote(f'{q} 설계공모 당선')}",
                "google_search": f"https://www.google.com/search?q={urllib.parse.quote(f'{q} 설계공모 당선작')}&hl=ko",
                "naver_images": f"https://search.naver.com/search.naver?where=image&query={urllib.parse.quote(f'{q} 건축 조감도')}",
                "google_images": f"https://www.google.com/search?q={urllib.parse.quote(f'{q} 건축 조감도 도면')}&tbm=isch&hl=ko",
            }

        # 카카오 이미지 검색으로 조감도 가져오기
        if self.kakao_key and ai_results:
            ai_results = await self._fetch_images_kakao(ai_results)

        return {
            "db_results": db_results,
            "web_results": [],
            "ai_recommendations": ai_results,
        }

    async def _fetch_images_kakao(self, ai_results: list) -> list:
        """카카오 이미지 검색 API로 조감도/외관 이미지 가져오기"""
        headers = {"Authorization": f"KakaoAK {self.kakao_key}"}

        async with aiohttp.ClientSession() as session:
            tasks = []
            for item in ai_results:
                title = item.get("title", "")
                architect = item.get("architect", "")
                query = f"{title} {architect} 건축 조감도"
                tasks.append(self._kakao_image_search(session, headers, query))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, images in enumerate(results):
                if isinstance(images, list) and images:
                    ai_results[i]["images"] = images
                else:
                    # 프로젝트명만으로 재시도
                    ai_results[i]["images"] = []

            # 이미지 못 찾은 사례는 더 넓은 검색어로 재시도
            retry_tasks = []
            retry_indices = []
            for i, item in enumerate(ai_results):
                if not item.get("images"):
                    title = item.get("title", "")
                    retry_tasks.append(self._kakao_image_search(session, headers, f"{title} 건축"))
                    retry_indices.append(i)

            if retry_tasks:
                retry_results = await asyncio.gather(*retry_tasks, return_exceptions=True)
                for j, images in enumerate(retry_results):
                    idx = retry_indices[j]
                    if isinstance(images, list) and images:
                        ai_results[idx]["images"] = images

        return ai_results

    async def _kakao_image_search(self, session: aiohttp.ClientSession, headers: dict, query: str) -> list:
        """카카오 Daum 이미지 검색"""
        url = "https://dapi.kakao.com/v2/search/image"
        params = {"query": query, "size": 5, "sort": "accuracy"}

        try:
            async with session.get(url, headers=headers, params=params, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    documents = data.get("documents", [])
                    return [doc["image_url"] for doc in documents if doc.get("image_url")]
        except Exception as e:
            print(f"카카오 이미지 검색 오류: {e}")

        return []

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
        """AI로 벤치마킹 유사 사례 추천 — 심사위원 관점"""
        context = ""
        if db_results:
            context = "[로컬 DB 사례]\n" + "\n".join(
                f"- {r['title']} ({r.get('year', '?')}년)" for r in db_results[:5]
            )

        # 분석에서 심사위원 주안점, 발주처 의도 등 추출
        judge_points = analysis.get("judge_focus_points", [])
        client_intent = analysis.get("client_intent", "")
        site_constraints = analysis.get("site_constraints", "")
        concept_ideas = analysis.get("concept_ideas", [])

        judge_str = "\n".join(f"  - {p}" for p in judge_points) if judge_points else "미상"
        concept_str = "\n".join(f"  - {c.get('name', '')}: {c.get('description', '')}" for c in concept_ideas) if concept_ideas else "미상"

        prompt = f"""당신은 수십 년의 실무 노하우를 가진 최고 수준의 건축 설계공모 마스터 건축사이자 리서처입니다.
당신의 타겟은 까다로운 안목을 가진 '건축 설계공모 심사위원'들입니다.

## 현재 공모 정보:
- 프로젝트명: {analysis.get('project_name', '미상')}
- 유형: {analysis.get('project_type', '미상')}
- 위치: {analysis.get('site_location', '미상')}
- 규모: {analysis.get('scale', '미상')}
- 설계 키워드: {', '.join(analysis.get('design_keywords', []))}
- 핵심 요구사항: {', '.join(analysis.get('key_requirements', [])[:5])}

## 심사위원 평가 주안점:
{judge_str}

## 발주처 본질적 목적:
{client_intent or '미상'}

## 대지 제약사항:
{site_constraints or '미상'}

## 컨셉 방향:
{concept_str}

{context}

## 벤치마킹 유사 성공 사례를 6~8건 추천해주세요.

### 중요 규칙:
1. 반드시 실제로 존재하는 한국 국내 설계공모 당선작만 (가상 프로젝트 절대 금지)
2. 용도, 규모, 대지 조건이 유사한 사례 우선
3. 2015년 이후 최근 사례 위주
4. 각 사례에 반드시 포함할 것:
   - title: 정확한 프로젝트명
   - year: 당선 연도
   - location: 위치
   - architect: 당선 설계사무소
   - selection_reason: 이 사례가 본 공모전 지침과 어떤 점에서 부합하는지 (구체적)
   - winning_factor: 당시 심사위원들에게 어떤 점이 어필되었는지 (매스 구성, 동선 계획, 특화 공간 등)
   - applicable_insight: 우리가 실제 설계에 바로 차용하거나 응용할 수 있는 구체적인 아이디어
   - features: 주요 건축적 특징 (구조, 재료, 공간구성)
   - relevance_score: 유사도 (0-100)

JSON 배열만 출력하세요. 다른 텍스트 없이:

[{{"title":"프로젝트명","year":2023,"location":"서울시","architect":"설계사무소","selection_reason":"선정 이유","winning_factor":"당선 핵심 요인","applicable_insight":"적용 가능한 인사이트","features":"건축적 특징","relevance_score":85}}]"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "당신은 한국 건축 설계공모 마스터 건축사입니다. 심사위원을 설득할 수 있는 벤치마킹 사례를 추천합니다. JSON 배열만 출력하세요."},
                {"role": "user", "content": prompt},
            ],
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
