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
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    async def search_similar_cases(self, analysis: dict, db: Optional[AsyncSession] = None) -> dict:
        db_results = []
        if db:
            db_results = await self._search_local_db(analysis, db)

        # 웹 크롤링 + AI 추천 동시 실행
        web_task = self._search_web(analysis)
        ai_task = self._ai_recommend(analysis, db_results, [])

        web_results, ai_results = await asyncio.gather(web_task, ai_task)

        # AI 결과에 이미지 + 출처 링크 추가
        if ai_results:
            ai_results = await self._enrich_cases(ai_results)

        return {
            "db_results": db_results,
            "web_results": web_results,
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

    async def _search_web(self, analysis: dict) -> list:
        """다중 소스에서 웹 크롤링"""
        keywords = analysis.get("design_keywords", [])
        project_type = analysis.get("project_type", "")
        project_name = analysis.get("project_name", "")

        search_queries = [
            f"{project_type} 설계공모 당선작",
            f"{project_type} 건축 설계경기 당선",
            f"{' '.join(keywords[:3])} 설계공모 사례",
            f"{project_type} 공모전 당선작 사례",
        ]
        if project_name:
            search_queries.append(f"{project_name} 유사 설계공모")

        all_results = []

        async with aiohttp.ClientSession() as session:
            tasks = []
            for query in search_queries:
                tasks.append(self._crawl_naver(session, query))
                tasks.append(self._crawl_google(session, query))

            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    all_results.extend(r)

        # 중복 제거
        seen = set()
        unique = []
        for r in all_results:
            url = r.get("url", "")
            title = r.get("title", "")
            key = url or title
            if key and key not in seen:
                seen.add(key)
                unique.append(r)

        return unique[:20]

    async def _crawl_naver(self, session: aiohttp.ClientSession, query: str) -> list:
        """네이버 검색 크롤링 (블로그/웹)"""
        results = []
        encoded = urllib.parse.quote(query)

        for where in ["blog", "web"]:
            url = f"https://search.naver.com/search.naver?where={where}&query={encoded}"
            try:
                async with session.get(url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        html = await resp.text()
                        soup = BeautifulSoup(html, "html.parser")

                        # 블로그 결과
                        for item in soup.select(".api_txt_lines, .total_tit a, .news_tit, .link_tit"):
                            title = item.get_text(strip=True)
                            href = item.get("href", "")
                            if title and href and len(title) > 5:
                                # 설명 찾기
                                parent = item.find_parent(["li", "div"])
                                desc = ""
                                if parent:
                                    desc_el = parent.select_one(".api_txt_lines.dsc_txt_wrap, .total_dsc, .dsc_txt, .news_dsc")
                                    if desc_el:
                                        desc = desc_el.get_text(strip=True)
                                # 썸네일
                                thumb = ""
                                if parent:
                                    thumb_el = parent.select_one("img")
                                    if thumb_el:
                                        thumb = thumb_el.get("src", "") or thumb_el.get("data-lazy-src", "")

                                results.append({
                                    "title": title,
                                    "url": href,
                                    "description": desc[:200],
                                    "thumbnail": thumb if thumb and thumb.startswith("http") else "",
                                    "source": f"naver_{where}",
                                })
            except Exception as e:
                print(f"네이버 크롤링 오류 ({where}): {e}")

        return results[:10]

    async def _crawl_google(self, session: aiohttp.ClientSession, query: str) -> list:
        """구글 검색 크롤링"""
        results = []
        encoded = urllib.parse.quote(query)
        url = f"https://www.google.com/search?q={encoded}&hl=ko&num=10"

        try:
            async with session.get(url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")

                    for item in soup.select("div.g, div.tF2Cxc"):
                        link_el = item.select_one("a[href]")
                        title_el = item.select_one("h3")
                        desc_el = item.select_one(".VwiC3b, .IsZvec")

                        if link_el and title_el:
                            href = link_el.get("href", "")
                            if href.startswith("http") and "google" not in href:
                                results.append({
                                    "title": title_el.get_text(strip=True),
                                    "url": href,
                                    "description": desc_el.get_text(strip=True)[:200] if desc_el else "",
                                    "thumbnail": "",
                                    "source": "google",
                                })
        except Exception as e:
            print(f"구글 크롤링 오류: {e}")

        return results[:10]

    async def _search_images(self, session: aiohttp.ClientSession, query: str) -> list:
        """네이버 + 구글 이미지 검색"""
        images = []
        seen = set()

        # 네이버 이미지
        encoded = urllib.parse.quote(query)
        try:
            url = f"https://search.naver.com/search.naver?where=image&query={encoded}"
            async with session.get(url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    for img in soup.select("img._img, img.thumb, img[data-source]"):
                        src = img.get("data-source") or img.get("src") or ""
                        if src and src.startswith("http") and "blank" not in src and src not in seen:
                            seen.add(src)
                            images.append(src)
        except Exception:
            pass

        # 구글 이미지
        try:
            url = f"https://www.google.com/search?q={encoded}&tbm=isch&hl=ko"
            async with session.get(url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    for img in soup.select("img[src^='http']"):
                        src = img.get("src", "")
                        if src and "gstatic" not in src and src not in seen:
                            seen.add(src)
                            images.append(src)
        except Exception:
            pass

        return images[:6]

    async def _search_source_url(self, session: aiohttp.ClientSession, title: str, architect: str) -> str:
        """사례 출처 URL 검색"""
        query = f"{title} {architect} 설계공모 당선"
        encoded = urllib.parse.quote(query)
        url = f"https://search.naver.com/search.naver?where=web&query={encoded}"

        try:
            async with session.get(url, headers=self.headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "html.parser")
                    for a in soup.select("a[href]"):
                        href = a.get("href", "")
                        if href.startswith("http") and "naver.com/search" not in href and "search.naver" not in href:
                            return href
        except Exception:
            pass
        return ""

    async def _enrich_cases(self, ai_results: list) -> list:
        """AI 추천 사례에 이미지 + 출처 링크 추가"""
        async with aiohttp.ClientSession() as session:
            tasks_img = []
            tasks_url = []
            for item in ai_results:
                title = item.get("title", "")
                architect = item.get("architect", "")
                tasks_img.append(self._search_images(session, f"{title} {architect} 건축 조감도"))
                tasks_url.append(self._search_source_url(session, title, architect))

            all_images = await asyncio.gather(*tasks_img, return_exceptions=True)
            all_urls = await asyncio.gather(*tasks_url, return_exceptions=True)

            for i in range(len(ai_results)):
                ai_results[i]["images"] = all_images[i] if isinstance(all_images[i], list) else []
                ai_results[i]["source_url"] = all_urls[i] if isinstance(all_urls[i], str) else ""

        return ai_results

    async def _ai_recommend(self, analysis: dict, db_results: list, web_results: list) -> list:
        """AI로 유사 사례 추천"""
        context_parts = []
        if db_results:
            db_summary = "\n".join(f"- {r['title']} ({r.get('year', '?')}년)" for r in db_results[:5])
            context_parts.append(f"[DB]\n{db_summary}")
        if web_results:
            web_summary = "\n".join(f"- {r['title']}: {r.get('description', '')[:80]}" for r in web_results[:10])
            context_parts.append(f"[웹]\n{web_summary}")
        context = "\n\n".join(context_parts) if context_parts else "없음"

        prompt = f"""당신은 한국 건축 설계공모 전문가입니다. 아래 분석 결과를 바탕으로 유사한 국내 설계공모 당선작 사례를 추천해주세요.

## 현재 공모:
- 프로젝트명: {analysis.get('project_name', '미상')}
- 유형: {analysis.get('project_type', '미상')}
- 위치: {analysis.get('site_location', '미상')}
- 규모: {analysis.get('scale', '미상')}
- 키워드: {', '.join(analysis.get('design_keywords', []))}
- 요구사항: {', '.join(analysis.get('key_requirements', [])[:5])}

## 검색 결과:
{context}

## 규칙:
1. 실제 존재하는 국내 설계공모 당선작만 추천 (가상 프로젝트 금지)
2. 6~8개 추천
3. 각 사례에 프로젝트명, 연도, 위치, 설계사무소, 유사점, 설계전략, 건축특징 포함
4. 가능하면 최근 5~10년 이내 사례 위주

JSON 배열만 출력하세요:

[{{"title":"프로젝트명","year":2023,"location":"서울시 ...","architect":"설계사무소명","similarity":"유사한 점","design_strategy":"참고할 설계 전략","features":"건축적 특징","relevance_score":85}}]"""

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
