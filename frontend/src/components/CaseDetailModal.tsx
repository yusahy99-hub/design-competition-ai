'use client';

import { useState } from 'react';

interface CaseDetailModalProps {
  item: any;
  onClose: () => void;
}

export default function CaseDetailModal({ item, onClose }: CaseDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card rounded-2xl overflow-hidden border border-zinc-700/50">
          {/* 헤더 */}
          <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{item.title}</h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                {item.year && <span>&#x1F4C5; {item.year}년</span>}
                {item.location && <span>&#x1F4CD; {item.location}</span>}
                {item.architect && <span>&#x1F3D7;&#xFE0F; {item.architect}</span>}
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
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                &#x2715;
              </button>
            </div>
          </div>

          {/* 바로가기 링크 */}
          {item.links && (
            <div className="p-6 border-b border-zinc-800">
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
                    <p className="text-sm font-medium text-green-400 group-hover:text-green-300">네이버 이미지</p>
                    <p className="text-xs text-zinc-500">조감도, 도면 검색</p>
                  </div>
                </a>
                <a href={item.links.google_images} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/15 hover:bg-blue-500/20 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="font-black text-blue-400 text-sm">G</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-400 group-hover:text-blue-300">구글 이미지</p>
                    <p className="text-xs text-zinc-500">외관, 실내 사진</p>
                  </div>
                </a>
                <a href={item.links.naver_search} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300">네이버 검색</p>
                    <p className="text-xs text-zinc-500">기사, 블로그, 상세정보</p>
                  </div>
                </a>
                <a href={item.links.google_search} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/15 hover:bg-purple-500/20 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-400 group-hover:text-purple-300">구글 검색</p>
                    <p className="text-xs text-zinc-500">논문, 해외 자료</p>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* 상세 정보 */}
          <div className="p-6 space-y-5">
            {item.similarity && (
              <div>
                <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-2">유사한 점</h3>
                <p className="text-zinc-300 leading-relaxed">{item.similarity}</p>
              </div>
            )}
            {item.design_strategy && (
              <div>
                <h3 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2">참고할 설계 전략</h3>
                <p className="text-zinc-300 leading-relaxed">{item.design_strategy}</p>
              </div>
            )}
            {item.features && (
              <div>
                <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">건축적 특징</h3>
                <p className="text-zinc-300 leading-relaxed">{item.features}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
