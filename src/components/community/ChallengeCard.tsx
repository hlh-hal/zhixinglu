export interface ChallengeCardProps {
  key?: string | number;
  title: string;
  description: string;
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  onJoin?: () => void;
}

export default function ChallengeCard({
  title,
  description,
  icon,
  iconBgColor,
  iconTextColor,
  onJoin,
}: ChallengeCardProps) {
  return (
    <div className="group bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-transparent hover:border-primary/20 transition-all duration-300">
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${iconBgColor} ${iconTextColor}`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">{description}</p>
      <button 
        onClick={onJoin}
        className="w-full py-2 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface-variant font-bold rounded-full transition-all text-sm"
      >
        加入
      </button>
    </div>
  );
}
