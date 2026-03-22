import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { get } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';

type StatsResponse = {
  total_daily_logs: number;
  total_monthly_reviews: number;
  total_half_year_reviews: number;
  total_challenge_checkins: number;
  earliest_date: string | null;
  latest_date: string | null;
};

type ExportType = 'daily_logs' | 'monthly_reviews' | 'half_year_reviews';
type ExportFormat = 'markdown' | 'json' | 'pdf';
type RangePreset = 'all' | 'month' | 'three_months' | 'custom';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest shadow-[0px_20px_40px_rgba(26,28,28,0.06)] p-6 rounded-xl border border-outline-variant/10">
      <p className="text-on-surface-variant text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-2 font-headline text-on-surface">{value}</p>
    </div>
  );
}

function formatDateLabel(value: string | null) {
  if (!value) return '暂无';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function DataManagement() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Record<ExportType, boolean>>({
    daily_logs: true,
    monthly_reviews: true,
    half_year_reviews: false,
  });
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStats() {
      setLoadingStats(true);
      try {
        const data = await get<StatsResponse>('/api/settings/data-stats');
        if (!active) return;
        setStats(data);
        if (!customStart && data.earliest_date) setCustomStart(data.earliest_date);
        if (!customEnd && data.latest_date) setCustomEnd(data.latest_date);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '获取统计失败');
      } finally {
        if (active) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  const selectedTypeList = useMemo(
    () => Object.entries(selectedTypes).filter(([, checked]) => checked).map(([key]) => key as ExportType),
    [selectedTypes],
  );

  const resolvedDateRange = useMemo(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);

    if (rangePreset === 'month') {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      return { start: start.toISOString().slice(0, 10), end };
    }

    if (rangePreset === 'three_months') {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { start: start.toISOString().slice(0, 10), end };
    }

    if (rangePreset === 'custom') {
      return {
        start: customStart || null,
        end: customEnd || null,
      };
    }

    return { start: null, end: null };
  }, [customEnd, customStart, rangePreset]);

  const handleTypeToggle = (type: ExportType) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleExport = async () => {
    if (selectedTypeList.length === 0) {
      toast.error('请至少选择一种导出内容');
      return;
    }

    setExporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/settings/export', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          types: selectedTypeList,
          format,
          date_range: resolvedDateRange,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || '导出失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'pdf';
      link.href = url;
      link.download = `zhixinglu_export.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">数据管理</h1>
        <p className="text-on-surface-variant mt-2 text-lg">查看你的真实数据规模，并按需要导出备份</p>
      </header>

      <section>
        <h3 className="text-sm font-bold text-primary tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full"></span>
          数据统计
        </h3>
        {loadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="每日日志" value={`${stats?.total_daily_logs ?? 0} 篇`} />
              <StatCard label="月度复盘" value={`${stats?.total_monthly_reviews ?? 0} 篇`} />
              <StatCard label="半年复盘" value={`${stats?.total_half_year_reviews ?? 0} 篇`} />
              <StatCard label="挑战打卡" value={`${stats?.total_challenge_checkins ?? 0} 次`} />
            </div>
            <div className="mt-6 rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-on-surface-variant">最早记录</p>
                  <p className="mt-2 text-lg font-bold text-on-surface">{formatDateLabel(stats?.earliest_date ?? null)}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant">最近记录</p>
                  <p className="mt-2 text-lg font-bold text-on-surface">{formatDateLabel(stats?.latest_date ?? null)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="bg-surface-container-lowest shadow-[0px_20px_40px_rgba(26,28,28,0.06)] p-8 rounded-xl border border-outline-variant/10 space-y-8">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">ios_share</span>
            导出数据
          </h3>
          <p className="text-sm text-on-surface-variant mt-2">按范围和格式导出你的日志与复盘记录，方便备份或归档。</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-on-surface">导出范围</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-outline-variant/20 cursor-pointer">
              <input type="checkbox" checked={selectedTypes.daily_logs} onChange={() => handleTypeToggle('daily_logs')} />
              <span className="font-medium">每日日志</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-outline-variant/20 cursor-pointer">
              <input type="checkbox" checked={selectedTypes.monthly_reviews} onChange={() => handleTypeToggle('monthly_reviews')} />
              <span className="font-medium">月度复盘</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-outline-variant/20 cursor-pointer">
              <input type="checkbox" checked={selectedTypes.half_year_reviews} onChange={() => handleTypeToggle('half_year_reviews')} />
              <span className="font-medium">半年复盘</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-on-surface">时间范围</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button onClick={() => setRangePreset('all')} className={`px-4 py-3 rounded-xl text-sm font-bold transition ${rangePreset === 'all' ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/20 text-on-surface-variant'}`}>全部数据</button>
            <button onClick={() => setRangePreset('month')} className={`px-4 py-3 rounded-xl text-sm font-bold transition ${rangePreset === 'month' ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/20 text-on-surface-variant'}`}>最近一个月</button>
            <button onClick={() => setRangePreset('three_months')} className={`px-4 py-3 rounded-xl text-sm font-bold transition ${rangePreset === 'three_months' ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/20 text-on-surface-variant'}`}>最近三个月</button>
            <button onClick={() => setRangePreset('custom')} className={`px-4 py-3 rounded-xl text-sm font-bold transition ${rangePreset === 'custom' ? 'bg-primary text-white' : 'bg-surface border border-outline-variant/20 text-on-surface-variant'}`}>自定义范围</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setRangePreset('custom');
                setCustomStart(e.target.value);
              }}
              className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setRangePreset('custom');
                setCustomEnd(e.target.value);
              }}
              className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-on-surface">导出格式</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['markdown', 'json', 'pdf'] as ExportFormat[]).map((item) => (
              <button
                key={item}
                onClick={() => setFormat(item)}
                className={`px-4 py-3 rounded-xl text-sm font-bold capitalize transition ${
                  format === item
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                {item === 'markdown' ? 'Markdown' : item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            {exporting ? '导出中...' : '开始导出'}
          </button>
        </div>
      </section>
    </div>
  );
}
