export interface FeedItemProps {
  key?: string | number;
  user: {
    name: string;
    avatar: string;
  };
  time: string;
  action: string;
  tag?: string;
  quote?: string;
  images?: string[];
  likes: number;
  comments: number;
}

export default function FeedItem({
  user,
  time,
  action,
  tag,
  quote,
  images,
  likes,
  comments,
}: FeedItemProps) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl transition-all hover:bg-surface-bright border border-transparent hover:border-outline-variant/20 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
      <div className="flex gap-4">
        <img 
          alt={user.name} 
          className="w-12 h-12 rounded-full object-cover shrink-0" 
          src={user.avatar} 
        />
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-on-surface">{user.name}</span>
            <span className="text-xs text-slate-400">{time}</span>
          </div>
          <p className="text-slate-600 mb-4">
            {action} {tag && <span className="text-primary font-medium">{tag}</span>}
          </p>
          
          {quote && (
            <div className="bg-surface-container-low p-4 rounded-xl border-l-4 border-primary/40 italic text-sm text-slate-500 mb-4">
              “{quote}”
            </div>
          )}

          {images && images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2 mb-4">
              {images.map((img, idx) => (
                <div key={idx} className="h-24 bg-surface-container-high rounded-lg overflow-hidden relative">
                  <img alt="Feed content" className="w-full h-full object-cover opacity-80" src={img} />
                </div>
              ))}
              {/* Placeholder for extra images if needed */}
              {images.length === 1 && (
                <>
                  <div className="h-24 bg-surface-container-high rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400">analytics</span>
                  </div>
                  <div className="h-24 bg-surface-container-high rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400">more_horiz</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-6">
            <button className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">favorite</span>
              <span className="text-xs font-medium">{likes}</span>
            </button>
            <button className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">chat_bubble</span>
              <span className="text-xs font-medium">{comments}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
