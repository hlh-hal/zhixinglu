import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useChallenges, useJoinChallenge } from '../hooks/community/useChallenges';
import type { ChallengeStatus } from '../types/community';

type ChallengeTab = {
  key: ChallengeStatus;
  label: string;
  description: string;
};

const tabs: ChallengeTab[] = [
  { key: 'active', label: '进行中', description: '现在就能加入并开始打卡' },
  { key: 'published', label: '即将开始', description: '先看看，下一个周期再加入' },
  { key: 'ended', label: '已结束', description: '浏览往期挑战和参与热度' },
];

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <span className="material-symbols-outlined text-2xl">travel_explore</span>
      </div>
      <p className="text-sm leading-7 text-slate-500">{text}</p>
    </div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 h-12 w-12 rounded-2xl bg-slate-100" />
      <div className="mb-3 h-6 w-1/2 rounded-full bg-slate-100" />
      <div className="mb-2 h-4 w-full rounded-full bg-slate-100" />
      <div className="mb-2 h-4 w-4/5 rounded-full bg-slate-100" />
      <div className="mb-6 h-4 w-2/3 rounded-full bg-slate-100" />
      <div className="h-10 w-full rounded-full bg-slate-100" />
    </div>
  );
}

export default function CommunityChallengesAll() {
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  const { data, isLoading } = useChallenges(activeTab);
  const joinChallenge = useJoinChallenge();

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) || tabs[0],
    [activeTab],
  );

  const handleJoin = async (challengeId: string) => {
    try {
      await joinChallenge.mutateAsync(challengeId);
      toast.success('挑战加入成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加入挑战失败');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-500">
              Challenge Hub
            </p>
            <h1 className="font-headline text-4xl font-black tracking-tight text-slate-900">
              全部挑战
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              按挑战状态切换浏览，给自己挑一个最适合当前节奏的成长任务。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">{currentTab.description}</p>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ChallengeSkeleton />
          <ChallengeSkeleton />
          <ChallengeSkeleton />
        </div>
      ) : (data?.challenges?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data!.challenges.map((challenge) => {
            const joined = Boolean(challenge.my_participation);
            const statusLabel =
              challenge.status === 'active'
                ? '进行中'
                : challenge.status === 'published'
                  ? '即将开始'
                  : '已结束';

            return (
              <article
                key={challenge.id}
                className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {challenge.icon || 'emoji_events'}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {statusLabel}
                  </span>
                </div>

                <h2 className="mb-2 text-xl font-bold text-slate-900">{challenge.title}</h2>
                <p className="mb-5 min-h-[72px] text-sm leading-7 text-slate-500">
                  {challenge.description || '给自己设定一个时间盒，让成长更有节奏。'}
                </p>

                <dl className="mb-6 space-y-2 text-sm text-slate-500">
                  <div className="flex items-center justify-between">
                    <dt>挑战周期</dt>
                    <dd className="font-semibold text-slate-700">{challenge.duration_days} 天</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>参与人数</dt>
                    <dd className="font-semibold text-slate-700">{challenge.participant_count}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={joined || challenge.status !== 'active' || joinChallenge.isPending}
                  onClick={() => handleJoin(challenge.id)}
                  className={`w-full rounded-full px-4 py-3 text-sm font-bold transition ${
                    joined
                      ? 'cursor-not-allowed bg-emerald-50 text-emerald-600'
                      : challenge.status !== 'active'
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {joined
                    ? '已加入'
                    : challenge.status !== 'active'
                      ? '暂不可加入'
                      : joinChallenge.isPending
                        ? '加入中...'
                        : '加入挑战'}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState text={`当前“${currentTab.label}”分类下还没有挑战。`} />
      )}
    </div>
  );
}
