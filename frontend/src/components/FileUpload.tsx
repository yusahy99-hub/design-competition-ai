'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onUpload, isLoading }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onUpload(acceptedFiles[0]);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isLoading,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto glass-card rounded-2xl p-16 text-center animate-pulse-glow">
        <div className="inline-block mb-8">
          <div className="w-16 h-16 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">지침서를 분석하고 있습니다</h3>
        <p className="text-zinc-400">
          PDF를 읽고 프로젝트 유형, 규모, 핵심 키워드를 추출 중...
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1.5 w-12 rounded-full animate-shimmer" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`max-w-2xl mx-auto glass-card rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10'
          : 'hover:border-indigo-500/30'
      }`}
    >
      <input {...getInputProps()} />
      <div className="mb-8">
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-colors ${
          isDragActive ? 'bg-indigo-500/20' : 'bg-zinc-800'
        }`}>
          <svg className={`w-10 h-10 ${isDragActive ? 'text-indigo-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">
        설계공모 지침서를 업로드하세요
      </h3>
      <p className="text-zinc-400 mb-2">
        파일을 드래그하거나 클릭하여 선택
      </p>
      <p className="text-sm text-zinc-600">PDF 파일만 지원</p>
    </div>
  );
}
