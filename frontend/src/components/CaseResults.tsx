'use client';

import { useState } from 'react';
import CaseDetailModal from './CaseDetailModal';

interface CaseResultsProps {
  cases: any;
  analysis: any;
  onReset: () => void;
}

export default function CaseResults({ cases, analysis, onReset }: CaseResultsProps) {
  const aiRecommendations = cases.ai_recommendations || [];
  const webResults = cases.web_results || [];
  const dbResults = cases.db_results || [];
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const totalCount = aiRecommendations.length + webResults.length + dbResults.length;

  const handleDownload = async () => {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, cases }),
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `설계공모_사례_${analysis.project_name || 'report'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('다운로드 실패:', e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* 사례 상세 모달 */}
      {selectedCase && (
        <CaseDetailModal item={selectedCase} onClose={() => setSelectedCase(null)} />
      )}

      {/* 상단 요약 */}
      <div className="glass-card rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">검색 결과</h2>
          <p className="text-zinc-400 mt-1">
            &ldquo;<span className="text-indigo-400">{analysis.project_name || '설계공모'}</span>&rdquo;
            관련 유사 사례 {totalCount}건
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            다운로드
          </button>
          <button onClick={onReset}
            className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
            새로 검색
          </button>
        </div>
      </div>

      {/* AI 추천 사례 */}
      {aiRecommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <span className="text-sm font-black text-indigo-400">AI</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI 추천 유사 사례</h3>
              <p className="text-sm text-zinc-500">설계공모 전문 AI가 선별한 참고 사례</p>
            </div>
          </div>

          <div className="space-y-5">
            {aiRecommendations.map((item: any, i: number) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:border-indigo-500/40">
                <div className="flex flex-col lg:flex-row" onClick={() => setSelectedCase(item)}>
                  {/* 이미지 영역 */}
                  {item.images && item.images.length > 0 ? (
                    <div className="lg:w-80 flex-shrink-0 p-4">
                      <div className="grid grid-cols-2 gap-2 h-full">
                        {item.images.slice(0, 4).map((img: string, j: number) => (
                          <div key={j} className={`relative overflow-hidden rounded-lg ${
                            item.images.length === 1 ? 'col-span-2' : j === 0 && item.images.length === 3 ? 'col-span-2' : ''
                          }`}>
                            <img src={img} alt={`${item.title} ${j + 1}`}
                              className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="lg:w-48 flex-shrink-0 p-4">
                      <div className="w-full h-full min-h-[120px] rounded-lg bg-zinc-800/50 flex items-center justify-center">
                        <svg className="w-12 h-12 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* 정보 영역 */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-bold text-white">{item.title}</h4>
                      {item.relevance_score && (
                        <div className={`ml-3 px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                          item.relevance_score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : item.relevance_score >= 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600'
                        }`}>
                          {item.relevance_score}% 유사
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400 mb-4">
                      {item.year && <span className="flex items-center gap-1.5"><span className="text-zinc-600">&#x25CF;</span> {item.year}년</span>}
                      {item.location && <span className="flex items-center gap-1.5"><span className="text-zinc-600">&#x25CF;</span> {item.location}</span>}
                      {item.architect && <span className="flex items-center gap-1.5"><span className="text-zinc-600">&#x25CF;</span> {item.architect}</span>}
                    </div>

                    {item.similarity && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">유사한 점</span>
                        <p className="text-sm text-zinc-300 mt-1">{item.similarity}</p>
                      </div>
                    )}

                    {item.design_strategy && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">참고할 설계 전략</span>
                        <p className="text-sm text-zinc-300 mt-1">{item.design_strategy}</p>
                      </div>
                    )}

                    {item.features && (
                      <div>
                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">건축적 특징</span>
                        <p className="text-sm text-zinc-300 mt-1">{item.features}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 출처 링크 */}
                {item.source_url && (
                  <div className="px-6 pb-4 pt-0">
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      출처 보기
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 웹 검색 결과 */}
      {webResults.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">웹 검색 결과</h3>
              <p className="text-sm text-zinc-500">관련 웹 페이지 {webResults.length}건</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl divide-y divide-zinc-800/50">
            {webResults.map((item: any, i: number) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-4 p-5 hover:bg-zinc-800/30 transition-colors group">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <span className="text-xs text-zinc-600 mt-2 inline-block">{item.source}</span>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* DB 사례 */}
      {dbResults.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-400">DB</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">저장된 사례</h3>
              <p className="text-sm text-zinc-500">로컬 데이터베이스 {dbResults.length}건</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbResults.map((item: any, i: number) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <h4 className="font-semibold text-white mb-3">{item.title}</h4>
                <div className="text-sm text-zinc-400 space-y-1.5">
                  {item.year && <p><span className="text-zinc-600">연도</span> {item.year}</p>}
                  {item.location && <p><span className="text-zinc-600">위치</span> {item.location}</p>}
                  {item.winner && <p><span className="text-zinc-600">당선</span> {item.winner}</p>}
                </div>
                {item.keywords && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.keywords.map((kw: string, j: number) => (
                      <span key={j} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded text-xs border border-purple-500/15">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 결과 없음 */}
      {totalCount === 0 && (
        <div className="glass-card rounded-2xl p-16 text-center">
          <p className="text-zinc-400 text-lg mb-4">검색 결과가 없습니다.</p>
          <button onClick={onReset}
            className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {/* 하단 */}
      <div className="text-center pt-4 pb-8">
        <button onClick={onReset}
          className="px-8 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
          새로운 지침서 분석하기
        </button>
      </div>
    </div>
  );
}
