'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CaseDetailModalProps {
  item: any;
  onClose: () => void;
}

export default function CaseDetailModal({ item, onClose }: CaseDetailModalProps) {
  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />

      {/* 모달 본체 */}
      <div
        style={{ position: 'relative', width: '100%', maxWidth: '720px', maxHeight: '85vh', margin: '16px', overflowY: 'auto', borderRadius: '16px', border: '1px solid rgba(63,63,70,0.5)', background: 'rgba(24,24,27,0.95)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 className="text-2xl font-bold text-white mb-2">{item.title}</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
              {item.year && <span>{item.year}년</span>}
              {item.location && <span>{item.location}</span>}
              {item.architect && <span>{item.architect}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {item.relevance_score && (
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                item.relevance_score >= 80 ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
              }`}>
                {item.relevance_score}% 유사
              </div>
            )}
            <button onClick={onClose}
              className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors text-lg">
              &#x2715;
            </button>
          </div>
        </div>

        {/* 바로가기 링크 */}
        {item.links && (
          <div style={{ padding: '24px', borderBottom: '1px solid #27272a' }}>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
              조감도 / 도면 / 상세정보 바로가기
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <a href={item.links.naver_images} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/15 hover:bg-green-500/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="font-black text-green-400 text-sm">N</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-400">네이버 이미지</p>
                  <p className="text-xs text-zinc-500">조감도, 도면 검색</p>
                </div>
              </a>
              <a href={item.links.google_images} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/15 hover:bg-blue-500/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="font-black text-blue-400 text-sm">G</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-400">구글 이미지</p>
                  <p className="text-xs text-zinc-500">외관, 실내 사진</p>
                </div>
              </a>
              <a href={item.links.naver_search} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <span className="font-black text-indigo-400 text-sm">S</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-400">네이버 검색</p>
                  <p className="text-xs text-zinc-500">기사, 블로그, 상세정보</p>
                </div>
              </a>
              <a href={item.links.google_search} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/15 hover:bg-purple-500/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="font-black text-purple-400 text-sm">G</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-400">구글 검색</p>
                  <p className="text-xs text-zinc-500">논문, 해외 자료</p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* 상세 정보 */}
        <div style={{ padding: '24px' }} className="space-y-5">
          {(item.selection_reason || item.similarity) && (
            <div>
              <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-2">사례 선정 이유</h3>
              <p className="text-zinc-300 leading-relaxed">{item.selection_reason || item.similarity}</p>
            </div>
          )}
          {(item.winning_factor || item.design_strategy) && (
            <div>
              <h3 className="text-xs font-medium text-rose-400 uppercase tracking-wider mb-2">당선 핵심 요인</h3>
              <p className="text-zinc-300 leading-relaxed">{item.winning_factor || item.design_strategy}</p>
            </div>
          )}
          {(item.applicable_insight) && (
            <div>
              <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">적용 가능한 인사이트</h3>
              <p className="text-zinc-300 leading-relaxed">{item.applicable_insight}</p>
            </div>
          )}
          {item.features && (
            <div>
              <h3 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2">건축적 특징</h3>
              <p className="text-zinc-300 leading-relaxed">{item.features}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}
