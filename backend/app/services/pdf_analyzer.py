from groq import Groq
import pdfplumber
import os
import json


class PDFAnalyzer:
    """설계공모 지침서 PDF를 분석하여 핵심 정보를 추출하는 서비스"""

    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """PDF에서 텍스트 추출"""
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"--- 페이지 {i + 1} ---\n{page_text}")
        return "\n\n".join(text_parts)

    async def analyze_guidelines(self, pdf_path: str) -> dict:
        """설계공모 지침서를 분석하여 구조화된 정보 추출"""
        pdf_text = self.extract_text_from_pdf(pdf_path)

        if not pdf_text.strip():
            raise ValueError("PDF에서 텍스트를 추출할 수 없습니다.")

        # Groq은 컨텍스트가 작으므로 텍스트를 적절히 자름
        max_chars = 25000
        if len(pdf_text) > max_chars:
            pdf_text = pdf_text[:max_chars] + "\n\n[... 이하 생략 ...]"

        prompt = f"""당신은 한국 건축 설계공모 전문가입니다. 아래 설계공모 지침서 텍스트를 분석하여 핵심 정보를 JSON으로 추출해주세요.

## 추출할 정보:

1. project_name: 프로젝트명/공모명
2. project_type: 공모 유형 (공공건축, 주거, 문화시설, 교육시설, 체육시설, 복합시설, 공원/조경, 도시설계, 리모델링 등)
3. site_location: 대상지 위치 (시/도, 시/군/구)
4. site_area_sqm: 대지면적 (숫자만, 없으면 null)
5. budget: 공사비/예산 (원문 그대로)
6. key_requirements: 핵심 요구사항 리스트 (5~10개)
7. design_keywords: 설계 키워드 리스트 (10~15개, 건축적/용도/맥락 특성)
8. program_requirements: 프로그램 요구사항 리스트
9. scale: 규모 정보 (층수, 연면적 등)
10. special_conditions: 특수 조건 리스트

## 지침서 텍스트:
{pdf_text}

반드시 JSON만 출력하세요. 다른 설명 없이 아래 형식으로만:

{{"project_name":"...","project_type":"...","site_location":"...","site_area_sqm":null,"budget":"...","key_requirements":["..."],"design_keywords":["..."],"program_requirements":["..."],"scale":"...","special_conditions":["..."]}}"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.3,
        )

        response_text = response.choices[0].message.content

        # JSON 파싱
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("AI 응답에서 JSON을 찾을 수 없습니다.")

        result = json.loads(response_text[json_start:json_end])
        result["raw_analysis"] = response_text

        return result
