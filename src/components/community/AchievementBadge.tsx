export interface AchievementBadgeProps {
  key?: string | number;
  title: string;
  description: string;
  icon: string;
  isLocked?: boolean;
  dateEarned?: string;
  progress?: {
    current: number;
    total: number;
    label: string;
  };
}

export default function AchievementBadge({
  title,
  description,
  icon,
  isLocked = false,
  dateEarned,
  progress,
}: AchievementBadgeProps) {
  if (isLocked) {
    return (
      <div className="achievement-card bg-surface-container-low p-6 rounded-xl transition-all opacity-80 border border-transparent hover:shadow-[0px_20px_40px_rgba(26,28,28,0.06)] hover:-translate-y-0.5">
        <div className="flex flex-col items-center text-center space-y-3 grayscale">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-400">{icon}</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-full">
              <span className="material-symbols-outlined text-white text-xl drop-shadow-md">lock</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-600">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          {progress && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-primary">
                <span>Progress</span>
                <span>{progress.current}/{progress.total}{progress.label}</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="achievement-card bg-surface-container-lowest p-6 rounded-xl transition-all border border-tertiary-fixed/30 relative hover:shadow-[0px_20px_40px_rgba(26,28,28,0.06)] hover:-translate-y-0.5">
      <div className="absolute top-4 right-4 text-green-600">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-tertiary-fixed to-tertiary-fixed-dim flex items-center justify-center shadow-lg shadow-tertiary/20 ring-4 ring-tertiary-fixed/40">
          <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
        {dateEarned && (
          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
            {dateEarned} 获得
          </div>
        )}
      </div>
    </div>
  );
}
