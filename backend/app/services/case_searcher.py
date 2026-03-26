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
        """분석 결과를 바탕으로 유사 사례 검색"""

        db_results = []
        if db:
            db_results = await self._search_local_db(analysis, db)

        web_results = await self._search_web(analysis)

        ai_results = await self._ai_recommend(analysis, db_results, web_results)

        # AI 추천 사례별 이미지 검색
        if ai_results:
            ai_results = await self._enrich_with_images(ai_results)

        return {
            "db_results": db_results,
            "web_results": web_results,
            "ai_recommendations": ai_results,
        }

    async def _search_local_db(self, analysis: dict, db: AsyncSession) -> list:
        """로컬 DB에서 유사 사례 검색"""
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
                "id": comp.id,
                "title": comp.title,
                "category": comp.category,
                "location": comp.location,
                "year": comp.year,
                "winner": comp.winner,
                "description": comp.description,
                "keywords": comp.keywords,
                "source_url": comp.source_url,
                "image_urls": comp.image_urls,
                "score": score,
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:10]

    async def _search_web(self, analysis: dict) -> list:
        """웹에서 설계공모 사례 크롤링"""
        keywords = analysis.get("design_keywords", [])
        project_type = analysis.get("project_type", "")

        search_queries = [
            f"{project_type} 설계공모 당선작",
            f"{' '.join(keywords[:3])} 건축 설계공모",
            f"{project_type} 건축 공모전 사례",
        ]

        all_results = []

        async with aiohttp.ClientSession() as session:
            for query in search_queries:
                try:
                    results = await self._crawl_search(session, query)
                    all_results.extend(results)
                except Exception as e:
                    print(f"크롤링 오류 ({query}): {e}")

        seen_urls = set()
        unique_results = []
        for r in all_results:
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(r)

        return unique_results[:15]

    async def _crawl_search(self, session: aiohttp.ClientSession, query: str) -> list:
        """검색 엔진에서 결과 크롤링"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        encoded_query = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=web&query={encoded_query}"

        results = []
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")

                    for item in soup.select(".total_wrap, .news_wrap, .blog_wrap, .lst_total .bx"):
                        title_el = item.select_one("a.link_tit, a.api_txt_lines, .total_tit a")
                        desc_el = item.select_one(".dsc_txt, .api_txt_lines.dsc_txt_wrap, .total_dsc")
                        thumb_el = item.select_one("img.thumb, img._img, .thumb_single img")
                        if title_el:
                            results.append({
                                "title": title_el.get_text(strip=True),
                                "url": title_el.get("href", ""),
                                "description": desc_el.get_text(strip=True) if desc_el else "",
                                "thumbnail": thumb_el.get("src", "") if thumb_el else "",
                                "source": "naver",
                            })
        except Exception as e:
            print(f"네이버 검색 오류: {e}")

        return results

    async def _search_images(self, session: aiohttp.ClientSession, query: str) -> list:
        """네이버 이미지 검색"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        encoded_query = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=image&query={encoded_query}"

        images = []
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")

                    for img in soup.select("img._img, img.thumb, img[data-source]"):
                        src = img.get("data-source") or img.get("src") or ""
                        if src and src.startswith("http") and "blank" not in src:
                            images.append(src)
                        if len(images) >= 3:
                            break
        except Exception as e:
            print(f"이미지 검색 오류: {e}")

        return images

    async def _enrich_with_images(self, ai_results: list) -> list:
        """AI 추천 사례에 이미지를 추가"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for item in ai_results:
                title = item.get("title", "")
                architect = item.get("architect", "")
                query = f"{title} {architect} 건축 설계 조감도"
                tasks.append(self._search_images(session, query))

            all_images = await asyncio.gather(*tasks, return_exceptions=True)

            for i, images in enumerate(all_images):
                if isinstance(images, list) and images:
                    ai_results[i]["images"] = images
                else:
                    ai_results[i]["images"] = []

        return ai_results

    async def _ai_recommend(self, analysis: dict, db_results: list, web_results: list) -> list:
        """AI로 유사 사례 추천"""
        context_parts = []

        if db_results:
            db_summary = "\n".join(
                f"- {r['title']} ({r.get('year', '?')}년, {r.get('location', '?')})"
                for r in db_results[:5]
            )
            context_parts.append(f"[DB 검색 결과]\n{db_summary}")

        if web_results:
            web_summary = "\n".join(
                f"- {r['title']}: {r.get('description', '')[:100]}"
                for r in web_results[:10]
            )
            context_parts.append(f"[웹 검색 결과]\n{web_summary}")

        context = "\n\n".join(context_parts) if context_parts else "검색 결과 없음"

        prompt = f"""당신은 한국 건축 설계공모 전문가입니다. 아래 설계공모 분석 결과를 바탕으로, 참고할 만한 국내 설계공모 당선작 사례를 추천해주세요.

## 현재 공모 분석:
- 프로젝트명: {analysis.get('project_name', '미상')}
- 유형: {analysis.get('project_type', '미상')}
- 위치: {analysis.get('site_location', '미상')}
- 규모: {analysis.get('scale', '미상')}
- 핵심 키워드: {', '.join(analysis.get('design_keywords', []))}
- 핵심 요구사항: {', '.join(analysis.get('key_requirements', [])[:5])}

## 참고 검색 결과:
{context}

## 요청:
유사한 국내 설계공모 당선작 5~8개를 추천해주세요.
각 사례에 프로젝트명, 연도, 위치, 설계사무소, 유사한 점, 참고할 설계 전략, 건축적 특징을 포함해주세요.
가능한 한 실제로 존재하는 프로젝트만 추천해주세요.

반드시 JSON 배열만 출력하세요. 다른 설명 없이:

[{{"title":"프로젝트명","year":2023,"location":"서울시 ...","architect":"설계사무소명","similarity":"유사한 점","design_strategy":"참고할 설계 전략","features":"주요 건축적 특징 (구조, 재료, 공간구성 등)","relevance_score":85}}]"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.3,
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
