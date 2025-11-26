import React, { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  onUpload: (content: string | ArrayBuffer) => void;
  isLoaded: boolean;
  accept?: string;
  icon?: 'talent' | 'pharmacy' | 'master';
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onUpload, isLoaded, accept = ".csv", icon }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(event.target.result);
        }
    };
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
  };

  const getIconColor = () => {
      if (icon === 'talent') return 'text-cyan-400';
      if (icon === 'pharmacy') return 'text-emerald-400';
      return 'text-purple-400';
  };

  const getBorderColor = () => {
      if (isLoaded) return 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
      if (isDragging) return 'border-white/50 bg-white/5 scale-105 shadow-[0_0_25px_rgba(255,255,255,0.1)]';
      return 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800';
  };

  return (
    <div 
      className={`relative group rounded-xl p-1 transition-all duration-300 cursor-pointer h-full flex flex-col justify-center`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Outer Glow Ring */}
      <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${isLoaded ? 'bg-gradient-to-br from-emerald-500/20 to-transparent' : 'bg-transparent group-hover:bg-gradient-to-br from-indigo-500/20 to-transparent'}`}></div>

      <div className={`relative flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg transition-all duration-300 ${getBorderColor()}`}>
          <input 
            type="file" 
            accept={accept} 
            ref={inputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <div className="mb-4 p-4 rounded-full bg-slate-900 shadow-inner">
            {isLoaded ? (
                <svg className="w-8 h-8 text-emerald-400 animate-[bounce_1s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            ) : (
                <svg className={`w-8 h-8 ${getIconColor()} ${isDragging ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={`font-semibold tracking-wide ${isLoaded ? 'text-emerald-400' : 'text-slate-200'}`}>
              {isLoaded ? 'UPLOAD COMPLETE' : label.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {isDragging ? '>> DROP FILE HERE <<' : isLoaded ? 'READY_FOR_ANALYSIS' : 'WAITING_FOR_INPUT...'}
            </span>
          </div>
      </div>
    </div>
  );
};