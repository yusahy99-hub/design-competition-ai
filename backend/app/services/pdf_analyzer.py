from groq import Groq
import pdfplumber
import os
import json


class PDFAnalyzer:
    """설계공모 지침서 PDF를 분석하여 핵심 정보를 추출하는 서비스"""

    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"--- 페이지 {i + 1} ---\n{page_text}")
        return "\n\n".join(text_parts)

    async def analyze_guidelines(self, pdf_path: str) -> dict:
        pdf_text = self.extract_text_from_pdf(pdf_path)

        if not pdf_text.strip():
            raise ValueError("PDF에서 텍스트를 추출할 수 없습니다.")

        max_chars = 25000
        if len(pdf_text) > max_chars:
            pdf_text = pdf_text[:max_chars] + "\n\n[... 이하 생략 ...]"

        prompt = f"""당신은 수십 년의 실무 노하우를 가진 최고 수준의 건축 설계공모 마스터 건축사이자 리서처입니다.
당신의 주된 타겟은 까다로운 안목을 가진 '건축 설계공모 심사위원'들입니다.
제공된 설계 지침서를 완벽하게 분석하여 출제자의 의도를 간파하고, 핵심 정보를 구조화해서 추출하세요.

## 지침서 텍스트:
{pdf_text}

## 추출 형식:
반드시 아래 JSON만 출력하세요. 다른 텍스트 없이:

{{
    "project_name": "프로젝트명/공모명",
    "project_type": "공모 유형 (공공건축/주거/문화시설/교육시설/체육시설/복합시설/공원조경/도시설계/리모델링 등)",
    "site_location": "대상지 위치 (시도, 시군구)",
    "site_area_sqm": null,
    "budget": "공사비/예산 원문",
    "scale": "규모 정보 (층수, 연면적 등)",

    "judge_focus_points": [
        "심사위원이 가장 중요하게 평가할 주안점 1",
        "심사위원이 가장 중요하게 평가할 주안점 2",
        "심사위원이 가장 중요하게 평가할 주안점 3"
    ],
    "site_constraints": "대지 및 규모의 핵심 제약사항과 극복 포인트",
    "client_intent": "발주처가 요구하는 본질적인 목적 (커뮤니티 융합, 랜드마크 상징성 등)",

    "design_keywords": ["지침서를 관통하는 건축적 메인 키워드 5~10개"],
    "concept_ideas": [
        {{"name": "컨셉 네이밍 1", "description": "건축적 설명"}},
        {{"name": "컨셉 네이밍 2", "description": "건축적 설명"}},
        {{"name": "컨셉 네이밍 3", "description": "건축적 설명"}}
    ],

    "key_requirements": ["핵심 요구사항 5~10개"],
    "program_requirements": ["프로그램 요구사항 (용도별 면적 등)"],
    "special_conditions": ["특수 조건 (문화재 인접, 경관심의, 법규 등)"],

    "risk_factors": [
        "지침서상 놓치기 쉬운 감점 요인이나 법규적/물리적 충돌 예상 지점 1",
        "리스크 2",
        "리스크 3"
    ]
}}"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "당신은 한국 건축 설계공모 전문 마스터 건축사입니다. 심사위원의 관점에서 지침서를 분석합니다. 반드시 JSON만 출력하세요."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=4096,
            temperature=0.2,
        )

        response_text = response.choices[0].message.content

        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("AI 응답에서 JSON을 찾을 수 없습니다.")

        result = json.loads(response_text[json_start:json_end])
        result["raw_analysis"] = response_text

        return result
