import React from 'react';

export default function StatusBar({ saving, lastSaved }: { saving?: boolean, lastSaved?: string | null }) {
  return (
    <footer className="fixed bottom-0 right-0 left-64 bg-white/90 backdrop-blur-sm border-t border-slate-100 flex justify-between items-center px-12 py-3 z-40">
      <div className="flex items-center gap-4">
        <span className="font-body text-xs text-slate-400">© 2026 知行录</span>
        {saving !== undefined && (
          <>
            <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="font-body text-xs text-slate-400">
              {saving ? '正在保存...' : (lastSaved ? `已保存 ${lastSaved}` : '无修改')}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-6">
        <a className="font-body text-xs text-slate-400 hover:text-primary transition-colors" href="#">隐私政策</a>
        <a className="font-body text-xs text-slate-400 hover:text-primary transition-colors" href="#">使用指南</a>
        <a className="font-body text-xs text-slate-400 hover:text-primary transition-colors" href="#">反馈</a>
      </div>
    </footer>
  );
}
