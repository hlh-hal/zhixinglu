import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { useChallenges, useCheckin, useMyChallenges, useJoinChallenge } from '../hooks/community/useChallenges';

function formatDateRange(startAt: string | null, endAt: string | null) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  if (!startAt && !endAt) return '长期开放';
  if (startAt && endAt) return `${formatter.format(new Date(startAt))} - ${formatter.format(new Date(endAt))}`;
  if (startAt) return `${formatter.format(new Date(startAt))} 开始`;
  return `${formatter.format(new Date(endAt!))} 截止`;
}

function ChallengeSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 h-12 w-12 rounded-2xl bg-slate-100" />
      <div className="mb-3 h-6 w-2/3 rounded-full bg-slate-100" />
      <div className="mb-2 h-4 w-full rounded-full bg-slate-100" />
      <div className="mb-6 h-4 w-5/6 rounded-full bg-slate-100" />
      <div className="h-10 w-full rounded-full bg-slate-100" />
    </div>
  );
}

export default function CommunityChallenges() {
  const {
    data: myChallengesData,
    isLoading: isLoadingMyChallenges,
  } = useMyChallenges();
  const {
    data: challengesData,
    isLoading: isLoadingChallenges,
  } = useChallenges('active');
  const joinChallenge = useJoinChallenge();
  const checkinMutation = useCheckin();

  const featuredChallenge = useMemo(() => {
    const myChallenges = myChallengesData?.challenges ?? [];
    return (
      myChallenges.find((item) => item.status === 'active') ||
      myChallenges[0] ||
      null
    );
  }, [myChallengesData]);

  const availableChallenges = useMemo(
    () =>
      (challengesData?.challenges ?? []).filter(
        (challenge) => !challenge.my_participation,
      ),
    [challengesData],
  );

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await joinChallenge.mutateAsync(challengeId);
      toast.success('已加入挑战');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加入挑战失败');
    }
  };

  const handleCheckin = async (challengeId: string) => {
    try {
      const result = await checkinMutation.mutateAsync({ challengeId });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#2563eb', '#60a5fa', '#93c5fd', '#f59e0b'],
      });
      toast.success(`打卡成功，已连续 ${result.current_streak} 天`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打卡失败');
    }
  };

  const featuredProgress = featuredChallenge?.challenge
    ? Math.min(
        100,
        Math.round(
          (featuredChallenge.total_checkins / featuredChallenge.challenge.duration_days) *
            100,
        ),
      )
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <section>
        {isLoadingMyChallenges ? (
          <div className="animate-pulse overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm">
            <div className="mb-6 h-6 w-32 rounded-full bg-slate-100" />
            <div className="mb-4 h-10 w-64 rounded-full bg-slate-100" />
            <div className="mb-8 h-4 w-80 rounded-full bg-slate-100" />
            <div className="mb-3 h-3 w-full rounded-full bg-slate-100" />
            <div className="h-12 w-40 rounded-full bg-slate-100" />
          </div>
        ) : featuredChallenge?.challenge ? (
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-blue-600 to-sky-400 p-8 text-white shadow-[0_30px_80px_rgba(37,99,235,0.22)]">
            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-white/90 uppercase backdrop-blur">
                  正在进行
                </div>
                <div className="space-y-2">
                  <h1 className="font-headline text-4xl font-black tracking-tight">
                    {featuredChallenge.challenge.title}
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-blue-50">
                    {featuredChallenge.challenge.description || '把今天的一次行动，变成长期稳定的成长轨迹。'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-blue-50">
                    <span>
                      {featuredChallenge.total_checkins} /{' '}
                      {featuredChallenge.challenge.duration_days} 天
                    </span>
                    <span>{featuredProgress}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${featuredProgress}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-semibold backdrop-blur">
                    <span className="material-symbols-outlined text-orange-300">
                      local_fire_department
                    </span>
                    连续 {featuredChallenge.current_streak} 天
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-semibold backdrop-blur">
                    <span className="material-symbols-outlined">group</span>
                    {featuredChallenge.challenge.participant_count} 人参与
                  </div>
                  <div className="text-blue-100">
                    {formatDateRange(
                      featuredChallenge.challenge.start_at,
                      featuredChallenge.challenge.end_at,
                    )}
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-[1.75rem] border border-white/15 bg-white/12 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-50">今日状态</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      featuredChallenge.today_checked_in
                        ? 'bg-emerald-400/20 text-emerald-50'
                        : 'bg-amber-300/20 text-amber-50'
                    }`}
                  >
                    {featuredChallenge.today_checked_in ? '已打卡' : '待打卡'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={
                    featuredChallenge.today_checked_in || checkinMutation.isPending
                  }
                  onClick={() =>
                    handleCheckin(featuredChallenge.challenge!.id)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-blue-400"
                >
                  <span className="material-symbols-outlined">
                    {featuredChallenge.today_checked_in ? 'verified' : 'bolt'}
                  </span>
                  {featuredChallenge.today_checked_in
                    ? '今天已完成打卡'
                    : checkinMutation.isPending
                      ? '打卡中...'
                      : '立即打卡'}
                </button>
                <p className="text-xs leading-6 text-blue-50/90">
                  完成一次打卡后，动态和勋章检查会自动同步到社群系统。
                </p>
              </div>
            </div>

            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 left-20 h-36 w-36 rounded-full bg-sky-200/20 blur-3xl" />
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <span className="material-symbols-outlined text-3xl">flag</span>
            </div>
            <h1 className="mb-2 font-headline text-3xl font-black text-slate-900">
              还没有正在参与的挑战
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-7 text-slate-500">
              从一个小目标开始，把打卡节奏稳定下来。加入挑战后，这里会自动展示你的进行中进度。
            </p>
            <Link
              to="/community/challenges/all"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              查看全部挑战
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-headline text-2xl font-black tracking-tight text-slate-900">
              可参与的挑战
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              选一个最有感觉的目标，今天就开始累计。
            </p>
          </div>
          <Link
            to="/community/challenges/all"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            查看全部
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

        {isLoadingChallenges ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ChallengeSkeleton />
            <ChallengeSkeleton />
            <ChallengeSkeleton />
          </div>
        ) : availableChallenges.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {availableChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="group rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {challenge.icon || 'emoji_events'}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {challenge.participant_count} 人参与
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {challenge.title}
                </h3>
                <p className="mb-5 min-h-[72px] text-sm leading-7 text-slate-500">
                  {challenge.description || '给自己一个明确周期和节奏，让习惯真正发生。'}
                </p>
                <div className="mb-5 flex items-center justify-between text-xs text-slate-400">
                  <span>{challenge.duration_days} 天</span>
                  <span>{formatDateRange(challenge.start_at, challenge.end_at)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoinChallenge(challenge.id)}
                  disabled={joinChallenge.isPending}
                  className="w-full rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {joinChallenge.isPending ? '加入中...' : '加入挑战'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            当前没有新的进行中挑战，去全部挑战页看看即将开放和已结束的活动。
          </div>
        )}
      </section>
    </div>
  );
}
