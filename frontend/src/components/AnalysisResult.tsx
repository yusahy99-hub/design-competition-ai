'use client';

interface AnalysisResultProps {
  analysis: any;
  onSearch: () => void;
  onReset: () => void;
  isSearching: boolean;
}

export default function AnalysisResult({ analysis, onSearch, onReset, isSearching }: AnalysisResultProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 기본 정보 */}
      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">지침서 분석 완료</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <InfoItem label="프로젝트명" value={analysis.project_name} highlight />
            <InfoItem label="유형" value={analysis.project_type} />
            <InfoItem label="위치" value={analysis.site_location} />
            <InfoItem label="대지면적" value={analysis.site_area_sqm ? `${Number(analysis.site_area_sqm).toLocaleString()} m\u00B2` : null} />
            <InfoItem label="예산" value={analysis.budget} />
            <InfoItem label="규모" value={analysis.scale} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">설계 키워드</label>
            <div className="flex flex-wrap gap-2 mt-3">
              {(analysis.design_keywords || []).map((kw: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-lg text-sm border border-indigo-500/20">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 심사위원의 눈 — 핵심 주안점 */}
      {analysis.judge_focus_points?.length > 0 && (
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-lg">&#x1F3AF;</div>
            <div>
              <h3 className="text-lg font-bold text-white">심사위원 평가 주안점</h3>
              <p className="text-xs text-zinc-500">심사위원이 가장 중요하게 볼 포인트</p>
            </div>
          </div>
          <div className="space-y-3">
            {analysis.judge_focus_points.map((point: string, i: number) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <span className="text-rose-400 font-bold text-sm mt-0.5">{i + 1}</span>
                <span className="text-zinc-200">{point}</span>
              </div>
            ))}
          </div>
          {analysis.client_intent && (
            <div className="mt-5 pt-5 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">발주처 본질적 목적</label>
              <p className="text-zinc-300 mt-2">{analysis.client_intent}</p>
            </div>
          )}
          {analysis.site_constraints && (
            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">대지 제약사항 & 극복 포인트</label>
              <p className="text-zinc-300 mt-2">{analysis.site_constraints}</p>
            </div>
          )}
        </div>
      )}

      {/* 컨셉 네이밍 아이디어 */}
      {analysis.concept_ideas?.length > 0 && (
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg">&#x1F4A1;</div>
            <div>
              <h3 className="text-lg font-bold text-white">컨셉 네이밍 아이디어</h3>
              <p className="text-xs text-zinc-500">제안서 패널에 활용 가능한 컨셉</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.concept_ideas.map((c: any, i: number) => (
              <div key={i} className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/15">
                <h4 className="text-lg font-bold text-purple-300 mb-2">&ldquo;{c.name}&rdquo;</h4>
                <p className="text-sm text-zinc-400">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 요구사항 + 리스크 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 핵심 요구사항 */}
        {analysis.key_requirements?.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">핵심 요구사항</label>
            <ul className="mt-3 space-y-2">
              {analysis.key_requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 리스크 관리 */}
        {analysis.risk_factors?.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <label className="text-xs font-medium text-red-400 uppercase tracking-wider">설계 시 주의사항 (리스크)</label>
            <div className="mt-3 space-y-2">
              {analysis.risk_factors.map((risk: string, i: number) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-red-400 text-sm mt-0.5">&#x26A0;</span>
                  <span className="text-red-200/80 text-sm">{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 프로그램 + 특수 조건 */}
      {(analysis.program_requirements?.length > 0 || analysis.special_conditions?.length > 0) && (
        <div className="glass-card rounded-2xl p-6">
          {analysis.program_requirements?.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">프로그램 요구사항</label>
              <ul className="mt-3 space-y-1.5 mb-5">
                {analysis.program_requirements.map((prog: string, i: number) => (
                  <li key={i} className="text-zinc-400 text-sm pl-4 border-l-2 border-zinc-700">{prog}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.special_conditions?.length > 0 && (
            <div className={analysis.program_requirements?.length > 0 ? 'pt-5 border-t border-zinc-800' : ''}>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">특수 조건</label>
              <div className="mt-3 space-y-2">
                {analysis.special_conditions.map((cond: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <span className="text-amber-400 text-sm mt-0.5">!</span>
                    <span className="text-amber-200/80 text-sm">{cond}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-4 justify-center pt-2">
        <button onClick={onReset}
          className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
          다시 업로드
        </button>
        <button onClick={onSearch} disabled={isSearching}
          className="px-8 py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-indigo-500/25">
          {isSearching ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              벤치마킹 사례 검색 중...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              벤치마킹 사례 검색하기
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      <p className={`mt-1 ${highlight ? 'text-lg font-semibold text-white' : 'text-zinc-300'}`}>{value}</p>
    </div>
  );
}
