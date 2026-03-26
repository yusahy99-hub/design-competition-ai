'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import AnalysisResult from '@/components/AnalysisResult';
import CaseResults from '@/components/CaseResults';
import { getApiUrl } from '@/lib/api';

type Step = 'upload' | 'analyzing' | 'analyzed' | 'searching' | 'results';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [cases, setCases] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setStep('analyzing');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(getApiUrl('/api/analyze'), { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '분석 실패');
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setAnalysisId(data.analysis_id);
      setStep('analyzed');
    } catch (e: any) {
      setError(e.message);
      setStep('upload');
    }
  };

  const handleSearch = async () => {
    if (!analysisId) return;
    setStep('searching');
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/api/search/${analysisId}`), { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '검색 실패');
      }
      const data = await res.json();
      setCases(data);
      setStep('results');
    } catch (e: any) {
      setError(e.message);
      setStep('analyzed');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setAnalysis(null);
    setAnalysisId(null);
    setCases(null);
    setError(null);
  };

  return (
    <main className="min-h-screen">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* 헤더 */}
        <header className="text-center mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-6">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            AI 기반 설계공모 사례 분석
          </div>
          <h1 className="text-5xl font-black mb-4">
            <span className="gradient-text">설계공모 AI</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            지침서 PDF를 업로드하면 AI가 분석하고<br />
            유사한 국내 설계공모 당선작을 찾아드립니다
          </p>
        </header>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center mb-12 animate-fade-in-delay">
          {[
            { key: 'upload', label: 'PDF 업로드', icon: '01' },
            { key: 'analyzed', label: '지침서 분석', icon: '02' },
            { key: 'results', label: '사례 검색', icon: '03' },
          ].map((s, i) => {
            const isActive =
              s.key === 'upload' ? ['upload', 'analyzing'].includes(step)
              : s.key === 'analyzed' ? ['analyzed', 'searching'].includes(step)
              : step === 'results';
            const isDone =
              s.key === 'upload' ? ['analyzed', 'searching', 'results'].includes(step)
              : s.key === 'analyzed' ? step === 'results'
              : false;

            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div className={`w-16 h-px mx-3 ${isDone || isActive ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : isDone ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {isDone ? '✓' : s.icon}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    isActive ? 'text-white' : isDone ? 'text-indigo-400' : 'text-zinc-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 에러 */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* 메인 */}
        <div className="animate-fade-in">
          {(step === 'upload' || step === 'analyzing') && (
            <FileUpload onUpload={handleUpload} isLoading={step === 'analyzing'} />
          )}
          {(step === 'analyzed' || step === 'searching') && analysis && (
            <AnalysisResult analysis={analysis} onSearch={handleSearch} onReset={handleReset} isSearching={step === 'searching'} />
          )}
          {step === 'results' && cases && (
            <CaseResults cases={cases} analysis={analysis} onReset={handleReset} />
          )}
        </div>

        {/* 푸터 */}
        <footer className="text-center py-8 mt-12 border-t border-zinc-800/50">
          <p className="text-zinc-600 text-sm">
            Designed &amp; Developed by <span className="text-zinc-400 font-medium">YSH</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
