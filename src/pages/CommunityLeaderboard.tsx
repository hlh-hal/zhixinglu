import { useMemo, useState } from 'react';
import { useLeaderboard } from '../hooks/community/useLeaderboard';
import type { LeaderboardMetric, LeaderboardPeriod } from '../types/community';
import { useAuth } from '../context/AuthContext';

const periodTabs: Array<{ key: LeaderboardPeriod; label: string }> = [
  { key: 'week', label: '周榜' },
  { key: 'month', label: '月榜' },
  { key: 'all_time', label: '总榜' },
];

const metricTabs: Array<{ key: LeaderboardMetric; label: string }> = [
  { key: 'composite', label: '综合' },
  { key: 'journal_count', label: '日志' },
  { key: 'challenge_streak', label: '连续' },
  { key: 'achievement_points', label: '积分' },
];

function formatDateLabel(period: LeaderboardPeriod, date?: string) {
  const base = date ? new Date(date) : new Date();
  if (period === 'all_time') return '累计历史';
  if (period === 'month') {
    return `${base.getFullYear()}年 ${base.getMonth() + 1}月`;
  }
  return `${base.getFullYear()}年 ${base.getMonth() + 1}月 第${Math.ceil(base.getDate() / 7)}周`;
}

function Avatar({ name, avatarUrl, size = 'h-14 w-14' }: { name: string; avatarUrl?: string | null; size?: string }) {
  return (
    <div className={`flex ${size} items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700`}>
      {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : name.slice(0, 1)}
    </div>
  );
}

export default function CommunityLeaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [metric, setMetric] = useState<LeaderboardMetric>('composite');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [date] = useState<string | undefined>(undefined);
  const { data, isLoading } = useLeaderboard(period, metric, date, friendsOnly);

  const podium = useMemo(() => data?.leaderboard.slice(0, 3) ?? [], [data]);
  const others = useMemo(() => data?.leaderboard.slice(3) ?? [], [data]);

  return (
    <div className="mx-auto max-w-6xl pb-32">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                period === tab.key
                  ? 'bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)]'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
            {formatDateLabel(period, date)}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={friendsOnly}
              onChange={(e) => setFriendsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-slate-500">仅看好友</span>
          </label>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {metricTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMetric(tab.key)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              metric === tab.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-[2rem] bg-slate-100" />
          <div className="h-96 animate-pulse rounded-[2rem] bg-slate-100" />
        </div>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-1 items-end gap-6 md:grid-cols-3">
            {podium.map((entry, index) => {
              const isFirst = entry.rank === 1;
              return (
                <div
                  key={entry.user.id}
                  className={`rounded-[2rem] border p-6 text-center shadow-sm ${
                    isFirst
                      ? 'border-blue-100 bg-gradient-to-b from-blue-50 to-white md:-translate-y-4'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="mb-4 flex justify-center">
                    <Avatar
                      name={entry.user.nickname || entry.user.username || '排'}
                      avatarUrl={entry.user.avatar_url}
                      size={isFirst ? 'h-20 w-20' : 'h-16 w-16'}
                    />
                  </div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    #{entry.rank}
                  </div>
                  <div className="font-headline text-xl font-black text-slate-900">
                    {entry.user.nickname || entry.user.username}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{entry.score} 分</div>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>日志</span>
                      <span>{entry.stats.journal_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>连续</span>
                      <span>{entry.stats.challenge_streak}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>积分</span>
                      <span>{entry.stats.achievement_points}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="grid grid-cols-[72px_minmax(0,1fr)_100px_100px_100px_80px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              <span>排名</span>
              <span>用户</span>
              <span className="text-center">日志</span>
              <span className="text-center">连续</span>
              <span className="text-center">积分</span>
              <span className="text-right">分数</span>
            </div>
            {(others.length > 0 ? others : data?.leaderboard ?? []).map((entry) => {
              const isMe = entry.user.id === user?.id;
              return (
                <div
                  key={entry.user.id}
                  className={`grid grid-cols-[72px_minmax(0,1fr)_100px_100px_100px_80px] items-center gap-4 border-b border-slate-100 px-6 py-4 text-sm last:border-b-0 ${
                    isMe ? 'bg-blue-50/70' : 'bg-white'
                  }`}
                >
                  <div className={`font-black ${isMe ? 'text-blue-600' : 'text-slate-500'}`}>
                    #{entry.rank}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={entry.user.nickname || entry.user.username || '排'}
                      avatarUrl={entry.user.avatar_url}
                      size="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <div className={`truncate font-bold ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>
                        {entry.user.nickname || entry.user.username}
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.rank_delta > 0 ? `上升 ${entry.rank_delta}` : entry.rank_delta < 0 ? `下降 ${Math.abs(entry.rank_delta)}` : '持平'}
                      </div>
                    </div>
                  </div>
                  <div className="text-center font-semibold text-slate-600">{entry.stats.journal_count}</div>
                  <div className="text-center font-semibold text-slate-600">{entry.stats.challenge_streak}</div>
                  <div className="text-center font-semibold text-slate-600">{entry.stats.achievement_points}</div>
                  <div className={`text-right font-black ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>{entry.score}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {data?.my_rank ? (
        <section className="fixed bottom-0 left-64 right-0 z-50 border-t border-slate-200 bg-white/90 px-8 py-4 backdrop-blur-xl shadow-[0_-10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">我的排名</div>
                <div className="mt-1 text-xl font-black text-blue-600">
                  #{data.my_rank.rank}
                  <span className="ml-2 text-sm font-semibold text-slate-400">
                    / {data.my_rank.total_users}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">我的分数</div>
                <div className="mt-1 text-lg font-black text-slate-900">{data.my_rank.score}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">距上一名</div>
                <div className="mt-1 text-lg font-black text-slate-900">{data.my_rank.gap_to_previous}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">超越比例</div>
                <div className="mt-1 text-lg font-black text-slate-900">{data.my_rank.percentile}%</div>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <span className="material-symbols-outlined text-base">share</span>
              分享战绩
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
