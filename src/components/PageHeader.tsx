import React, { useRef } from 'react';

export default function PageHeader({ 
  title, 
  onDelete,
  onExport,
  onImport,
  onPrev,
  onNext
}: { 
  title: string, 
  onDelete?: () => void,
  onExport?: () => void,
  onImport?: (file: File) => void,
  onPrev?: () => void,
  onNext?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    // reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
      <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
        <button 
          onClick={onPrev}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all text-slate-600 ${onPrev ? 'bg-surface-container-low hover:bg-surface-container-high cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
          disabled={!onPrev}
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h1 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight whitespace-nowrap">{title}</h1>
        <button 
          onClick={onNext}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all text-slate-600 ${onNext ? 'bg-surface-container-low hover:bg-surface-container-high cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
          disabled={!onNext}
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {onDelete && (
          <button onClick={onDelete} className="flex-shrink-0 px-5 py-2.5 rounded-full border border-error/50 text-error font-medium text-sm hover:bg-error-container/20 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden sm:inline">删除</span>
          </button>
        )}
        
        {(onExport || onImport) && (
          <div className="flex-shrink-0 flex items-center rounded-full border border-outline-variant/30 text-on-surface-variant bg-white shadow-sm overflow-hidden text-sm font-medium">
            {onExport && (
              <button onClick={onExport} className="px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors border-r border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span className="hidden sm:inline">导出</span>
              </button>
            )}
            {onImport && (
              <button onClick={handleImportClick} className="px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                <span className="hidden sm:inline">导入</span>
                <input 
                  type="file" 
                  accept=".json,.md,.txt,.docx,.pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
