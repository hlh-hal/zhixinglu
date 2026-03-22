import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const KEYWORDS = [
  '学习',
  '项目',
  '沟通',
  '感恩',
  '成长',
  '复盘',
  '专注',
  '效率',
  '探索',
  '习惯',
  '运动',
  '阅读',
  '健康',
  '代码',
  '设计',
  '规划',
];

const POSITIVE_WORDS = [
  '开心',
  '高兴',
  '顺利',
  '轻松',
  '满足',
  '期待',
  '进展',
  '突破',
  '成长',
  '感恩',
  '感谢',
  '平静',
  '踏实',
  '收获',
  '喜欢',
  '希望',
  '放松',
  '成就',
];

const CHALLENGE_WORDS = [
  '焦虑',
  '压力',
  '困难',
  '疲惫',
  '失望',
  '难受',
  '生气',
  '沮丧',
  '烦躁',
  '内耗',
  '崩溃',
  '担心',
  '卡住',
  '迷茫',
  '累',
  '痛苦',
];

const DIMENSIONS = [
  { key: 'happy_things', label: '开心的事' },
  { key: 'meaningful_things', label: '充实的事' },
  { key: 'grateful_people', label: '感谢的人' },
  { key: 'improvements', label: '改进的事' },
  { key: 'thoughts', label: '今日思考' },
] as const;

type RangeOption = '7d' | '30d' | '90d' | 'all';

type DailyLogRow = {
  id: string;
  date: string;
  happy_things: string | null;
  meaningful_things: string | null;
  grateful_people: string | null;
  improvements: string | null;
  thoughts: string | null;
};

type PeriodRange = {
  start: Date;
  end: Date;
  label: string;
  days: number;
  previousLabel: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0);
}

function startOfYear(year: number) {
  return new Date(year, 0, 1);
}

function endOfYear(year: number) {
  return new Date(year, 11, 31);
}

function countDaysInclusive(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function toRangeOption(value: unknown): RangeOption {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') {
    return value;
  }
  return 'all';
}

function toPositiveInteger(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function buildPeriodRange(year: number, month: number, range: RangeOption): PeriodRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === '7d' || range === '30d' || range === '90d') {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const end = today;
    const start = addDays(end, -(days - 1));
    return {
      start,
      end,
      days,
      label: range === '7d' ? '近7天' : range === '30d' ? '近30天' : '近3个月',
      previousLabel: range === '7d' ? '前7天' : range === '30d' ? '前30天' : '前3个月',
    };
  }

  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);
  return {
    start,
    end,
    days: countDaysInclusive(start, end),
    label: `${year}年${month}月`,
    previousLabel: month === 1 ? `${year - 1}年12月` : `${year}年${month - 1}月`,
  };
}

function buildComparisonRange(period: PeriodRange, range: RangeOption) {
  if (range === 'all') {
    const previousMonthStart = addMonths(period.start, -1);
    return {
      start: previousMonthStart,
      end: endOfMonth(previousMonthStart.getFullYear(), previousMonthStart.getMonth() + 1),
    };
  }

  const previousEnd = addDays(period.start, -1);
  const previousStart = addDays(previousEnd, -(period.days - 1));
  return { start: previousStart, end: previousEnd };
}

function isFilled(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function countOccurrences(text: string, keyword: string) {
  if (!text) return 0;
  return text.split(keyword).length - 1;
}

function buildText(log: DailyLogRow) {
  return [
    log.happy_things,
    log.meaningful_things,
    log.grateful_people,
    log.improvements,
    log.thoughts,
  ]
    .filter(Boolean)
    .join(' ');
}

function scoreActivity(log: DailyLogRow) {
  const filledSections = DIMENSIONS.reduce((total, dimension) => {
    return total + (isFilled(log[dimension.key]) ? 1 : 0);
  }, 0);

  return Math.max(0, Math.min(4, filledSections));
}

function classifyEmotion(log: DailyLogRow) {
  const text = buildText(log);
  const positiveHits =
    POSITIVE_WORDS.reduce((total, keyword) => total + countOccurrences(text, keyword), 0) +
    (isFilled(log.happy_things) ? 1 : 0) +
    (isFilled(log.meaningful_things) ? 1 : 0) +
    (isFilled(log.grateful_people) ? 1 : 0);
  const challengeHits =
    CHALLENGE_WORDS.reduce((total, keyword) => total + countOccurrences(text, keyword), 0) +
    (isFilled(log.improvements) ? 0.5 : 0);

  const rawScore = positiveHits - challengeHits;
  const score = Math.max(-2, Math.min(2, Math.round(rawScore)));

  if (score >= 1) return { score, label: '积极' as const, positive: positiveHits, challenge: challengeHits };
  if (score <= -1) return { score, label: '挑战' as const, positive: positiveHits, challenge: challengeHits };
  return { score: 0, label: '平稳' as const, positive: positiveHits, challenge: challengeHits };
}

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const selectedYear = toPositiveInteger(req.query.year, now.getFullYear());
    const selectedMonth = Math.min(12, toPositiveInteger(req.query.month, now.getMonth() + 1));
    const range = toRangeOption(req.query.range);

    const period = buildPeriodRange(selectedYear, selectedMonth, range);
    const comparison = buildComparisonRange(period, range);
    const heatmapStart = addDays(period.end, -104);
    const yearStart = startOfYear(selectedYear);
    const yearEnd = endOfYear(selectedYear);

    const earliestDate = [comparison.start, heatmapStart, yearStart].reduce((min, current) =>
      current.getTime() < min.getTime() ? current : min,
    );

    const [
      logsResult,
      totalLogsResult,
      profileResult,
      yearLogsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('daily_logs')
        .select('id, date, happy_things, meaningful_things, grateful_people, improvements, thoughts')
        .eq('user_id', req.user.id)
        .gte('date', formatDate(earliestDate))
        .lte('date', formatDate(period.end))
        .order('date', { ascending: true }),
      supabaseAdmin
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id),
      supabaseAdmin
        .from('profiles')
        .select('current_streak, longest_streak, total_journals')
        .eq('id', req.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('daily_logs')
        .select('date')
        .eq('user_id', req.user.id)
        .gte('date', formatDate(yearStart))
        .lte('date', formatDate(yearEnd)),
    ]);

    if (logsResult.error) throw logsResult.error;
    if (totalLogsResult.error) throw totalLogsResult.error;
    if (profileResult.error && profileResult.error.code !== 'PGRST116') throw profileResult.error;
    if (yearLogsResult.error) throw yearLogsResult.error;

    const allLogs = (logsResult.data || []) as DailyLogRow[];
    const currentLogs = allLogs.filter((log) => log.date >= formatDate(period.start) && log.date <= formatDate(period.end));
    const comparisonLogs = allLogs.filter(
      (log) => log.date >= formatDate(comparison.start) && log.date <= formatDate(comparison.end),
    );
    const heatmapLogs = allLogs.filter((log) => log.date >= formatDate(heatmapStart) && log.date <= formatDate(period.end));
    const yearLogs = yearLogsResult.data || [];

    const radarData = DIMENSIONS.map((dimension) => ({
      subject: dimension.label,
      current: currentLogs.filter((log) => isFilled(log[dimension.key])).length,
      previous: comparisonLogs.filter((log) => isFilled(log[dimension.key])).length,
    }));

    const radarMax = Math.max(
      period.days,
      countDaysInclusive(comparison.start, comparison.end),
      ...radarData.map((item) => item.current),
      ...radarData.map((item) => item.previous),
      1,
    );

    const barCounts = Array.from({ length: 12 }, () => 0);
    yearLogs.forEach((log) => {
      const monthIndex = parseDate(log.date).getMonth();
      barCounts[monthIndex] += 1;
    });

    const barData = barCounts.map((count, index) => ({
      name: `${index + 1}月`,
      current: count,
      target: 25,
    }));

    const heatmapMap = new Map(heatmapLogs.map((log) => [log.date, scoreActivity(log)]));
    const heatmapData = Array.from({ length: 7 }, () => Array(15).fill(0));
    for (let column = 14; column >= 0; column -= 1) {
      for (let row = 6; row >= 0; row -= 1) {
        const daysAgo = (14 - column) * 7 + (6 - row);
        const currentDate = addDays(period.end, -daysAgo);
        heatmapData[row][column] = heatmapMap.get(formatDate(currentDate)) || 0;
      }
    }

    const emotionData = currentLogs.map((log) => {
      const emotion = classifyEmotion(log);
      return {
        name: log.date.slice(5),
        score: emotion.score,
        label: emotion.label,
        positive: emotion.positive,
        challenge: emotion.challenge,
      };
    });

    const emotionSummary = emotionData.reduce(
      (summary, item) => {
        if (item.label === '积极') summary.positive += 1;
        else if (item.label === '挑战') summary.challenge += 1;
        else summary.stable += 1;
        return summary;
      },
      { positive: 0, stable: 0, challenge: 0 },
    );

    const allText = currentLogs.map(buildText).join(' ');
    const words = KEYWORDS.map((keyword) => ({
      text: keyword,
      value: countOccurrences(allText, keyword),
    }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      period: {
        label: period.label,
        start: formatDate(period.start),
        end: formatDate(period.end),
        days: period.days,
        previousLabel: period.previousLabel,
        type: range,
      },
      periodLogCount: currentLogs.length,
      totalLogs: profileResult.data?.total_journals ?? totalLogsResult.count ?? 0,
      currentStreak: profileResult.data?.current_streak ?? 0,
      longestStreak: profileResult.data?.longest_streak ?? 0,
      barYear: selectedYear,
      radarMax,
      radarData,
      barData,
      heatmapData,
      emotionData,
      emotionSummary,
      words,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load dashboard stats' });
  }
});

export default router;
