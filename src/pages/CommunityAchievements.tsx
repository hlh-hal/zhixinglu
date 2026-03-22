import React from 'react';
import toast from 'react-hot-toast';
import { useBadges, useCheckBadges } from '../hooks/community/useBadges';
import type { BadgeListItem } from '../types/community';

const categoryLabels: Record<string, string> = {
  journal: '日志成就',
  community: '社群成就',
  special: '特别成就',
};

function BadgeCard({ badge }: { badge: BadgeListItem; key?: React.Key }) {
  const progressPercent =
    badge.progress.target > 0
      ? Math.min(100, Math.round((badge.progress.current / badge.progress.target) * 100))
      : 0;

  if (badge.unlocked) {
    return (
      <div className="rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-[0_14px_30px_rgba(59,130,246,0.25)]">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {badge.icon || 'workspace_premium'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            已解锁
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{badge.name}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {badge.description || '达成阶段目标后自动点亮。'}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{badge.points} 积分</span>
          <span>
            {badge.unlocked_at
              ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(badge.unlocked_at))
              : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-400">
          <span className="material-symbols-outlined text-3xl">{badge.icon || 'lock'}</span>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/10">
            <span className="material-symbols-outlined text-white">lock</span>
          </div>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-500">
          未解锁
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-700">{badge.name}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        {badge.description || '继续保持，你离它不远了。'}
      </p>
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>进度</span>
          <span>
            {badge.progress.current} / {badge.progress.target || '--'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function CommunityAchievements() {
  const { data, isLoading } = useBadges();
  const checkBadges = useCheckBadges();

  const groupedBadges = (data?.badges ?? []).reduce<Record<string, BadgeListItem[]>>((groups, badge) => {
    const key = badge.category || 'special';
    groups[key] ||= [];
    groups[key].push(badge);
    return groups;
  }, {});

  const handleCheckBadges = async () => {
    try {
      const result = await checkBadges.mutateAsync();
      if (result.newly_unlocked.length > 0) {
        toast.success(`本次新解锁 ${result.newly_unlocked.length} 枚勋章`);
      } else {
        toast('这次没有新的勋章解锁', { icon: 'ℹ️' });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '勋章检查失败');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-500">
              Achievement Atlas
            </p>
            <h1 className="font-headline text-4xl font-black tracking-tight text-slate-900">
              成就勋章
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              把你的坚持、互动和突破都可视化。每一枚勋章，都是一次被看见的成长。
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheckBadges}
            disabled={checkBadges.isPending}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {checkBadges.isPending ? '检查中...' : '手动检查勋章'}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] bg-blue-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">Total</div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {data?.summary.total_badges ?? 0}
            </div>
            <div className="mt-2 text-sm text-slate-500">全部勋章</div>
          </div>
          <div className="rounded-[1.5rem] bg-emerald-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">Unlocked</div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {data?.summary.unlocked_count ?? 0}
            </div>
            <div className="mt-2 text-sm text-slate-500">已解锁</div>
          </div>
          <div className="rounded-[1.5rem] bg-slate-100 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Points</div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {data?.summary.total_points ?? 0}
            </div>
            <div className="mt-2 text-sm text-slate-500">勋章积分</div>
          </div>
          <div className="rounded-[1.5rem] bg-amber-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500">Completion</div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {data?.summary.completion_percentage ?? 0}%
            </div>
            <div className="mt-2 text-sm text-slate-500">完成度</div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-64 animate-pulse rounded-[1.75rem] bg-slate-100" />
          <div className="h-64 animate-pulse rounded-[1.75rem] bg-slate-100" />
          <div className="h-64 animate-pulse rounded-[1.75rem] bg-slate-100" />
        </div>
      ) : (
        Object.entries(groupedBadges).map(([category, badges]) => (
          <section key={category} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined">military_tech</span>
              </div>
              <div>
                <h2 className="font-headline text-2xl font-black text-slate-900">
                  {categoryLabels[category] || '其他勋章'}
                </h2>
                <p className="text-sm text-slate-400">
                  {badges.length} 枚
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
