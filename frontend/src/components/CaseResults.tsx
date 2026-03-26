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
  const dbResults = cases.db_results || [];
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const totalCount = aiRecommendations.length + dbResults.length;

  const handleDownload = () => {
    const report = {
      분석일시: new Date().toLocaleString('ko-KR'),
      프로젝트_분석: {
        프로젝트명: analysis.project_name || '',
        유형: analysis.project_type || '',
        위치: analysis.site_location || '',
        규모: analysis.scale || '',
        예산: analysis.budget || '',
        키워드: analysis.design_keywords || [],
        요구사항: analysis.key_requirements || [],
      },
      추천_사례: aiRecommendations.map((c: any) => ({
        프로젝트명: c.title,
        연도: c.year,
        위치: c.location,
        설계사무소: c.architect,
        유사점: c.similarity,
        설계전략: c.design_strategy,
        건축특징: c.features,
        유사도: `${c.relevance_score}%`,
        네이버_검색: c.links?.naver_search || '',
        이미지_검색: c.links?.naver_images || '',
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `설계공모_사례_${analysis.project_name || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
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
              <div key={i} className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                <div className="p-6 cursor-pointer hover:bg-zinc-800/20 transition-colors"
                  onClick={() => setSelectedCase(item)}>
                  {/* 상단 */}
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

                  {/* 메타 정보 */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400 mb-4">
                    {item.year && <span>&#x1F4C5; {item.year}년</span>}
                    {item.location && <span>&#x1F4CD; {item.location}</span>}
                    {item.architect && <span>&#x1F3D7;&#xFE0F; {item.architect}</span>}
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

                {/* 링크 버튼들 */}
                {item.links && (
                  <div className="px-6 pb-5 pt-2 flex flex-wrap gap-2 border-t border-zinc-800/50">
                    <a href={item.links.naver_search} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm hover:bg-green-500/20 transition-colors border border-green-500/15"
                      onClick={(e) => e.stopPropagation()}>
                      <span className="font-bold text-xs">N</span> 네이버 검색
                    </a>
                    <a href={item.links.google_search} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors border border-blue-500/15"
                      onClick={(e) => e.stopPropagation()}>
                      <span className="font-bold text-xs">G</span> 구글 검색
                    </a>
                    <a href={item.links.naver_images} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors border border-indigo-500/15"
                      onClick={(e) => e.stopPropagation()}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      조감도/도면
                    </a>
                    <a href={item.links.google_images} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 text-sm hover:bg-purple-500/20 transition-colors border border-purple-500/15"
                      onClick={(e) => e.stopPropagation()}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      구글 이미지
                    </a>
                  </div>
                )}
              </div>
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
                  {item.year && <p>{item.year}년</p>}
                  {item.location && <p>{item.location}</p>}
                  {item.winner && <p>{item.winner}</p>}
                </div>
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

      <div className="text-center pt-4 pb-8">
        <button onClick={onReset}
          className="px-8 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
          새로운 지침서 분석하기
        </button>
      </div>
    </div>
  );
}
