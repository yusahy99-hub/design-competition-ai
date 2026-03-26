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
    const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const casesHtml = aiRecommendations.map((c: any, i: number) => `
      <div class="case">
        <div class="case-header">
          <h3>${i + 1}. ${c.title || ''}</h3>
          <span class="score">${c.relevance_score || '-'}% 유사</span>
        </div>
        <table>
          <tr><td class="label">연도</td><td>${c.year || '-'}</td><td class="label">위치</td><td>${c.location || '-'}</td></tr>
          <tr><td class="label">설계사무소</td><td colspan="3">${c.architect || '-'}</td></tr>
        </table>
        <div class="detail"><strong>유사한 점:</strong> ${c.similarity || '-'}</div>
        <div class="detail"><strong>설계 전략:</strong> ${c.design_strategy || '-'}</div>
        <div class="detail"><strong>건축적 특징:</strong> ${c.features || '-'}</div>
        <div class="links">
          ${c.links ? `<a href="${c.links.naver_search}">네이버 검색</a> | <a href="${c.links.naver_images}">조감도/도면</a> | <a href="${c.links.google_search}">구글 검색</a> | <a href="${c.links.google_images}">구글 이미지</a>` : ''}
        </div>
      </div>`).join('\n');

    const keywords = (analysis.design_keywords || []).map((k: string) => `<span class="tag">${k}</span>`).join(' ');
    const requirements = (analysis.key_requirements || []).map((r: string) => `<li>${r}</li>`).join('\n');

    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>설계공모 사례 분석 - ${analysis.project_name || ''}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', sans-serif; color: #1a1a2e; padding: 40px; max-width: 900px; margin: 0 auto; background: #fff; }
  h1 { font-size: 28px; color: #1a1a2e; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 8px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 30px; }
  h2 { font-size: 20px; color: #4f46e5; margin: 30px 0 15px; padding-left: 12px; border-left: 4px solid #4f46e5; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-item { padding: 10px 14px; background: #f8f9fa; border-radius: 8px; }
  .info-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
  .info-item .value { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .tag { display: inline-block; padding: 4px 12px; background: #eef2ff; color: #4f46e5; border-radius: 20px; font-size: 13px; margin: 2px; }
  .case { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
  .case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .case-header h3 { font-size: 17px; color: #1a1a2e; }
  .score { background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  .case table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 14px; }
  .case td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  .case td.label { color: #9ca3af; width: 100px; font-size: 12px; }
  .detail { font-size: 14px; color: #374151; margin-bottom: 8px; line-height: 1.6; }
  .detail strong { color: #4f46e5; }
  .links { margin-top: 10px; font-size: 13px; }
  .links a { color: #4f46e5; text-decoration: none; }
  .links a:hover { text-decoration: underline; }
  ul { padding-left: 20px; }
  li { font-size: 14px; color: #374151; margin-bottom: 4px; line-height: 1.5; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  @media print { body { padding: 20px; } .case { break-inside: avoid; } }
</style></head><body>
  <h1>설계공모 유사 사례 분석 보고서</h1>
  <p class="subtitle">${date} | Designed by YSH</p>

  <h2>프로젝트 분석</h2>
  <div class="info-grid">
    <div class="info-item"><div class="label">프로젝트명</div><div class="value">${analysis.project_name || '-'}</div></div>
    <div class="info-item"><div class="label">유형</div><div class="value">${analysis.project_type || '-'}</div></div>
    <div class="info-item"><div class="label">위치</div><div class="value">${analysis.site_location || '-'}</div></div>
    <div class="info-item"><div class="label">규모</div><div class="value">${analysis.scale || '-'}</div></div>
    <div class="info-item"><div class="label">대지면적</div><div class="value">${analysis.site_area_sqm ? Number(analysis.site_area_sqm).toLocaleString() + ' m\u00B2' : '-'}</div></div>
    <div class="info-item"><div class="label">예산</div><div class="value">${analysis.budget || '-'}</div></div>
  </div>
  <p style="margin-bottom:8px;font-size:13px;color:#6b7280;">설계 키워드</p>
  <div style="margin-bottom:20px;">${keywords}</div>
  ${requirements ? `<p style="margin-bottom:8px;font-size:13px;color:#6b7280;">핵심 요구사항</p><ul>${requirements}</ul>` : ''}

  <h2>AI 추천 유사 사례 (${aiRecommendations.length}건)</h2>
  ${casesHtml}

  <div class="footer">설계공모 AI | Designed & Developed by YSH</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `설계공모_사례_${analysis.project_name || 'report'}.html`;
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
                <div className="flex flex-col lg:flex-row">
                  {/* 왼쪽 이미지 */}
                  {item.images && item.images.length > 0 ? (
                    <div className="lg:w-72 flex-shrink-0 p-4 cursor-pointer" onClick={() => setSelectedCase(item)}>
                      <img src={item.images[0]} alt={item.title}
                        className="w-full h-48 lg:h-full object-cover rounded-xl hover:scale-[1.02] transition-transform"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="lg:w-48 flex-shrink-0 p-4 cursor-pointer" onClick={() => setSelectedCase(item)}>
                      <div className="w-full h-full min-h-[160px] rounded-xl bg-zinc-800/50 flex items-center justify-center">
                        <svg className="w-14 h-14 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* 오른쪽 정보 */}
                  <div className="flex-1">
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
                  </div>{/* flex-1 끝 */}
                </div>{/* flex row 끝 */}
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
