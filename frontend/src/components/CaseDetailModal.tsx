'use client';

import { useState, useEffect } from 'react';

interface CaseDetailModalProps {
  item: any;
  onClose: () => void;
}

export default function CaseDetailModal({ item, onClose }: CaseDetailModalProps) {
  const [images, setImages] = useState<string[]>(item.images || []);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    // 추가 이미지 검색
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            architect: item.architect || '',
            keywords: [],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.images?.length > 0) {
            // 기존 이미지와 합치고 중복 제거
            const existing = new Set(images);
            const merged = [...images];
            for (const img of data.images) {
              if (!existing.has(img)) {
                merged.push(img);
                existing.add(img);
              }
            }
            setImages(merged);
          }
        }
      } catch (e) {
        // 실패해도 기존 이미지로 표시
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" onClick={onClose}>
      {/* 배경 */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      {/* 라이트박스 */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}>
          <button className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl z-10"
            onClick={() => setLightboxIdx(null)}>&#x2715;</button>
          {lightboxIdx > 0 && (
            <button className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}>&#8249;</button>
          )}
          {lightboxIdx < images.length - 1 && (
            <button className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}>&#8250;</button>
          )}
          <img src={images[lightboxIdx]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
          <div className="absolute bottom-6 text-zinc-400 text-sm">{lightboxIdx + 1} / {images.length}</div>
        </div>
      )}

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-4xl mx-4 my-10" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card rounded-2xl overflow-hidden border border-zinc-700/50">
          {/* 헤더 */}
          <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
            <div className="flex-1">
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
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                &#x2715;
              </button>
            </div>
          </div>

          {/* 이미지 갤러리 */}
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
              조감도 / 도면 / 외관
              {loading && <span className="ml-2 text-indigo-400 normal-case">검색 중...</span>}
            </h3>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer overflow-hidden rounded-xl bg-zinc-800"
                    onClick={() => setLightboxIdx(i)}>
                    <img src={img} alt={`${item.title} ${i + 1}`}
                      className="w-full h-36 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-8 text-zinc-600">
                <p>이미지를 찾지 못했습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-36 rounded-xl animate-shimmer" />
                ))}
              </div>
            )}
          </div>

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
