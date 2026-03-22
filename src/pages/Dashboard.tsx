import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { get } from '../lib/apiClient';

type RangeOption = '7d' | '30d' | '90d' | 'all';

type DashboardStats = {
  period: {
    label: string;
    start: string;
    end: string;
    days: number;
    previousLabel: string;
    type: RangeOption;
  };
  periodLogCount: number;
  totalLogs: number;
  currentStreak: number;
  longestStreak: number;
  barYear: number;
  radarMax: number;
  radarData: Array<{
    subject: string;
    current: number;
    previous: number;
  }>;
  barData: Array<{
    name: string;
    current: number;
    target: number;
  }>;
  heatmapData: number[][];
  emotionData: Array<{
    name: string;
    score: number;
    label: '积极' | '平稳' | '挑战';
    positive: number;
    challenge: number;
  }>;
  emotionSummary: {
    positive: number;
    stable: number;
    challenge: number;
  };
  words: Array<{
    text: string;
    value: number;
  }>;
};

type ChartFrameProps = {
  height: number;
  hasData?: boolean;
  emptyMessage?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
};

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
  { value: '90d', label: '近3个月' },
  { value: 'all', label: '全部' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: `${index + 1}月`,
}));

const EMOTION_LABELS: Record<number, string> = {
  [-2]: '压力大',
  [-1]: '波动',
  0: '平稳',
  1: '积极',
  2: '高能',
};

function getHeatmapColor(value: number) {
  if (!value) return 'bg-slate-100';
  switch (value) {
    case 1:
      return 'bg-sky-100';
    case 2:
      return 'bg-sky-200';
    case 3:
      return 'bg-sky-400';
    case 4:
      return 'bg-sky-600';
    default:
      return 'bg-sky-600';
  }
}

function formatDateRange(start: string, end: string) {
  return `${start.replace(/-/g, '.')} - ${end.replace(/-/g, '.')}`;
}

function ChartFrame({ height, hasData = true, emptyMessage = '暂无数据', children }: ChartFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const nextWidth = element.clientWidth;
      const nextHeight = element.clientHeight || height;
      setSize((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={containerRef} className="w-full min-w-0" style={{ height }}>
      {hasData ? (
        size.width > 0 && size.height > 0 ? (
          children(size)
        ) : null
      ) : (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function TooltipCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0px_16px_32px_rgba(15,23,42,0.10)]">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-xs text-slate-500">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [range, setRange] = useState<RangeOption>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => String(currentYear - index)),
    [currentYear],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          year,
          month,
          range,
        });
        const data = await get<DashboardStats>(`/api/dashboard/stats?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!active) return;
        setStats(data);
      } catch (requestError) {
        if (!active) return;
        if ((requestError as Error).name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : '加载数据看板失败');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStats();

    return () => {
      active = false;
      controller.abort();
    };
  }, [year, month, range]);

  const completionRate = stats
    ? Math.round((stats.periodLogCount / Math.max(stats.period.days, 1)) * 100)
    : 0;
  const circumference = 188.5;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;
  const activeRangeLabel = RANGE_OPTIONS.find((item) => item.value === range)?.label ?? '全部';

  const handleYearChange = (value: string) => {
    setYear(value);
    setRange('all');
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    setRange('all');
  };

  const handleExport = () => {
    if (!stats) return;

    const format = window.prompt('请输入导出格式：支持 json / md', 'md');
    if (!format) return;

    const normalized = format.toLowerCase().trim();
    if (!['json', 'md'].includes(normalized)) {
      window.alert('暂不支持该导出格式');
      return;
    }

    const exportPayload = {
      filters: {
        year,
        month,
        range: activeRangeLabel,
      },
      stats,
    };

    if (normalized === 'json') {
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `数据看板_${stats.period.start}_${stats.period.end}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const markdown = [
      `# 知行录数据报告（${stats.period.label}）`,
      '',
      `- 区间：${stats.period.start} ~ ${stats.period.end}`,
      `- 日志完成率：${stats.periodLogCount}/${stats.period.days}（${completionRate}%）`,
      `- 当前连续打卡：${stats.currentStreak} 天`,
      `- 历史最长连续：${stats.longestStreak} 天`,
      `- 累计日志：${stats.totalLogs} 篇`,
      '',
      '## 情绪概览',
      `- 积极：${stats.emotionSummary.positive} 天`,
      `- 平稳：${stats.emotionSummary.stable} 天`,
      `- 挑战：${stats.emotionSummary.challenge} 天`,
      '',
      '## 高频关键词',
      ...(stats.words.length > 0
        ? stats.words.map((word) => `- ${word.text}：${word.value} 次`)
        : ['- 暂无明显关键词']),
    ].join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `数据看板_${stats.period.start}_${stats.period.end}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-screen-2xl items-center justify-center px-6 py-8">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
          <span className="text-sm font-medium text-slate-500">正在加载数据看板...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <section className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={year}
                onChange={(event) => handleYearChange(event.target.value)}
                className="appearance-none rounded-2xl bg-surface-container-lowest px-4 py-2.5 pr-10 text-sm font-medium shadow-sm outline-none ring-1 ring-slate-100 transition focus:ring-2 focus:ring-primary/20"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}年
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="appearance-none rounded-2xl bg-surface-container-lowest px-4 py-2.5 pr-10 text-sm font-medium shadow-sm outline-none ring-1 ring-slate-100 transition focus:ring-2 focus:ring-primary/20"
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                expand_more
              </span>
            </div>

            <div className="mx-2 h-6 w-px bg-outline-variant/30" />

            <div className="flex flex-wrap gap-1 rounded-2xl bg-surface-container-low p-1">
              {RANGE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRange(item.value)}
                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors ${
                    range === item.value
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {stats ? (
            <p className="text-sm text-slate-500">
              当前统计区间：<span className="font-semibold text-slate-700">{stats.period.label}</span>
              <span className="mx-2 text-slate-300">|</span>
              {formatDateRange(stats.period.start, stats.period.end)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!stats}
          className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-sm">bar_chart</span>
          导出报告
        </button>
      </section>

      {error ? (
        <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {stats ? (
        <>
          <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 近30天进度 + 连续打卡 合并卡片 */}
            <div className="rounded-3xl border-l-4 border-primary bg-surface-container-lowest p-5 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] lg:col-span-2">
              {/* 上半部分：近30天进度 */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-slate-500">{stats.period.label}进度</p>
                  <p className="text-xs font-bold text-primary">{completionRate}%</p>
                </div>
                {/* 横条进度条 */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500" 
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{stats.periodLogCount}/{stats.period.days} 天</p>
              </div>

              {/* 分隔线 */}
              <div className="my-3 border-t border-slate-100" />

              {/* 下半部分：连续打卡 - 左右并排 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">🔥 当前连续</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="font-headline text-2xl font-bold text-on-surface">{stats.currentStreak}</span>
                    <span className="text-xs text-slate-400">天</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs text-slate-400">⭐ 最长记录</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-end gap-1">
                    <span className="font-headline text-2xl font-bold text-on-surface">{stats.longestStreak}</span>
                    <span className="text-xs text-slate-400">天</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border-l-4 border-sky-400 bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500">筛选区间</p>
              <h3 className="font-headline text-3xl font-bold text-on-surface">{stats.periodLogCount}篇</h3>
              <p className="mt-2 text-xs text-slate-400">{formatDateRange(stats.period.start, stats.period.end)}</p>
            </div>

            <div className="rounded-3xl border-l-4 border-secondary bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500">累计日志</p>
              <h3 className="font-headline text-3xl font-bold text-on-surface">{stats.totalLogs}篇</h3>
              <p className="mt-2 text-xs italic text-slate-400">从开始记录到现在</p>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <h4 className="mb-8 flex items-center gap-3 font-headline text-lg font-bold">
                <span className="h-6 w-2 rounded-full bg-primary" />
                各维度书写频率
              </h4>

              <ChartFrame height={320}>
                {({ width, height }) => (
                  <RadarChart
                    width={width}
                    height={height}
                    data={stats.radarData}
                    cx="50%"
                    cy="48%"
                    outerRadius="68%"
                  >
                    <PolarGrid stroke="#dbe4ef" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis
                      angle={18}
                      domain={[0, stats.radarMax]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Radar
                      name={stats.period.label}
                      dataKey="current"
                      stroke="#0f6cbd"
                      strokeWidth={2.5}
                      fill="#4d9fe6"
                      fillOpacity={0.28}
                    />
                    <Radar
                      name={stats.period.previousLabel}
                      dataKey="previous"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                      fill="#e2e8f0"
                      fillOpacity={0.32}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0]?.payload as DashboardStats['radarData'][number];
                        return (
                          <TooltipCard
                            title={item.subject}
                            lines={[
                              `${stats.period.label}：${item.current} 天`,
                              `${stats.period.previousLabel}：${item.previous} 天`,
                            ]}
                          />
                        );
                      }}
                    />
                  </RadarChart>
                )}
              </ChartFrame>

              <div className="mt-5 flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-slate-600">{stats.period.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  <span className="text-xs font-medium text-slate-600">{stats.period.previousLabel}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <h4 className="mb-8 flex items-center gap-3 font-headline text-lg font-bold">
                <span className="h-6 w-2 rounded-full bg-primary-container" />
                {stats.barYear}年月度日志完成趋势
              </h4>

              <ChartFrame height={320}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={stats.barData} margin={{ top: 20, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={32} />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const current = payload[0]?.value ?? 0;
                        return (
                          <TooltipCard
                            title={`${stats.barYear}年 ${label}`}
                            lines={[`日志数：${current} 篇`, '目标值：25 篇']}
                          />
                        );
                      }}
                    />
                    <ReferenceLine
                      y={25}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                      label={{ position: 'top', value: '目标 25', fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Bar dataKey="current" fill="#0f6cbd" radius={[8, 8, 0, 0]} barSize={26} />
                  </BarChart>
                )}
              </ChartFrame>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <div className="mb-8 flex items-center justify-between gap-4">
                <h4 className="flex items-center gap-3 font-headline text-lg font-bold">
                  <span className="h-6 w-2 rounded-full bg-secondary" />
                  近15周书写分布
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">少</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((value) => (
                      <div key={value} className={`h-3 w-3 rounded-sm ${getHeatmapColor(value)}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">多</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col justify-between py-1 pr-2">
                  <span className="text-[10px] text-slate-400">Mon</span>
                  <span className="text-[10px] text-slate-400">Wed</span>
                  <span className="text-[10px] text-slate-400">Fri</span>
                </div>

                <div className="grid flex-1 grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
                  {stats.heatmapData[0]?.map((_, columnIndex) => (
                    <div key={columnIndex} className="grid grid-rows-7 gap-1.5">
                      {stats.heatmapData.map((row, rowIndex) => (
                        <div
                          key={`${rowIndex}-${columnIndex}`}
                          className={`aspect-square w-full rounded-sm ${getHeatmapColor(row[columnIndex])} transition-all hover:ring-2 hover:ring-primary/30`}
                          title={`书写活跃度：${row[columnIndex]}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <h4 className="mb-8 flex items-center gap-3 font-headline text-lg font-bold">
                <span className="h-6 w-2 rounded-full bg-tertiary" />
                高频关键词
              </h4>
              <div className="flex min-h-[220px] flex-wrap items-center justify-center gap-x-6 gap-y-4 py-4">
                {stats.words.length > 0 ? (
                  stats.words.map((word, index) => {
                    const sizeClasses = ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];
                    const colorClasses = ['text-primary', 'text-secondary', 'text-sky-500', 'text-slate-500'];
                    const size = sizeClasses[index % sizeClasses.length];
                    const color = colorClasses[index % colorClasses.length];
                    const weight = word.value >= 3 ? 'font-black' : 'font-bold';
                    return (
                      <span
                        key={word.text}
                        className={`${size} ${weight} ${color} cursor-default transition-transform hover:scale-110`}
                        title={`出现 ${word.value} 次`}
                      >
                        {word.text}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-slate-400">这个区间里还没有明显重复出现的关键词</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="flex items-center gap-3 font-headline text-lg font-bold">
                  <span className="h-6 w-2 rounded-full bg-primary" />
                  情绪趋势
                </h4>
                <p className="mt-2 text-sm text-slate-500">
                  结合“开心的事 / 充实的事 / 感谢的人 / 改进的事 / 今日思考”的文本内容，按天给出更直观的状态判断。
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-slate-500">积极 {stats.emotionSummary.positive}天</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-slate-500">平稳 {stats.emotionSummary.stable}天</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium text-slate-500">挑战 {stats.emotionSummary.challenge}天</span>
                </div>
              </div>
            </div>

            <ChartFrame height={300} hasData={stats.emotionData.length > 0} emptyMessage="当前筛选区间还没有可用于分析的日志">
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={stats.emotionData} margin={{ top: 10, right: 16, left: 12, bottom: 6 }}>
                  <defs>
                    <linearGradient id="emotionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2b78bf" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#2b78bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    ticks={[-2, -1, 0, 1, 2]}
                    domain={[-2, 2]}
                    width={44}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => EMOTION_LABELS[value] ?? String(value)}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload as DashboardStats['emotionData'][number];
                      return (
                        <TooltipCard
                          title={`${label} · ${item.label}`}
                          lines={[
                            `积极信号：${item.positive}`,
                            `挑战信号：${item.challenge}`,
                            `情绪档位：${EMOTION_LABELS[item.score] ?? item.label}`,
                          ]}
                        />
                      );
                    }}
                  />
                  <ReferenceLine y={1} stroke="#86efac" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                  <ReferenceLine y={-1} stroke="#fda4af" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2b78bf"
                    strokeWidth={3}
                    fill="url(#emotionFill)"
                    dot={{ r: 3, fill: '#0f6cbd', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#0f6cbd', strokeWidth: 0 }}
                  />
                </AreaChart>
              )}
            </ChartFrame>
          </section>
        </>
      ) : null}
    </div>
  );
}
