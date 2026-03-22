import type { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase.js';

export const todayString = () => new Date().toISOString().split('T')[0];

export const jsonError = (res: Response, status: number, error: string, details?: string) =>
  res.status(status).json(details ? { error, details } : { error });

export const parseLimit = (value: unknown, fallback: number, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

export const truncateText = (value: string | null | undefined, length: number) => {
  if (!value) return null;
  return value.length <= length ? value : `${value.slice(0, length)}...`;
};

export const sortPair = (a: string, b: string) => (a < b ? { user_low: a, user_high: b } : { user_low: b, user_high: a });

export const getPeriodRange = (period: string, dateString?: string) => {
  const base = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new Error('Invalid date');
  }

  if (period === 'all_time') {
    return { start: '1970-01-01', end: todayString() };
  }

  if (period === 'month') {
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  const day = base.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - diff));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export const requireAdminProfile = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data?.role === 'admin';
};

export const getProfileMap = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, any>();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname, username, avatar_url')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((item) => [item.id, item]));
};

export const sendNotification = async ({
  user_id,
  sender_id = null,
  title,
  content,
  type,
  related_type = null,
  related_id = null,
  action_url = null,
}: {
  user_id: string;
  sender_id?: string | null;
  title: string;
  content: string;
  type: string;
  related_type?: string | null;
  related_id?: string | null;
  action_url?: string | null;
}) => {
  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id,
    sender_id,
    title,
    content,
    type,
    related_type,
    related_id,
    action_url,
  });

  if (error) throw error;
};

export const getBadgeProgressValue = async (userId: string, ruleType: string) => {
  switch (ruleType) {
    case 'consecutive_journals': {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('current_streak')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.current_streak ?? 0;
    }
    case 'total_journals': {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('total_journals')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.total_journals ?? 0;
    }
    case 'challenges_completed': {
      const { count, error } = await supabaseAdmin
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');
      if (error) throw error;
      return count ?? 0;
    }
    case 'total_likes_given': {
      const { count, error } = await supabaseAdmin
        .from('activity_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count ?? 0;
    }
    case 'friends_count': {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('friend_count')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.friend_count ?? 0;
    }
    case 'total_comments': {
      const { count, error } = await supabaseAdmin
        .from('activity_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count ?? 0;
    }
    default:
      return 0;
  }
};

export const getLeaderboardRowsFallback = async ({
  period,
  metric,
  date,
  friendsOnly,
  userId,
}: {
  period: 'week' | 'month' | 'all_time';
  metric: 'composite' | 'journal_count' | 'challenge_streak' | 'achievement_points';
  date?: string;
  friendsOnly: boolean;
  userId: string;
}) => {
  const range = getPeriodRange(period, date);
  const isAllTime = period === 'all_time';

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname, username, avatar_url, total_points, current_streak');

  if (profilesError) throw profilesError;

  let allowedIds = new Set((profiles || []).map((profile) => profile.id));

  if (friendsOnly) {
    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendshipError) throw friendshipError;

    allowedIds = new Set<string>([userId]);
    (friendships || []).forEach((row) => {
      allowedIds.add(row.requester_id);
      allowedIds.add(row.addressee_id);
    });
  }

  const filteredProfiles = (profiles || []).filter((profile) => allowedIds.has(profile.id));
  const userIds = filteredProfiles.map((profile) => profile.id);

  // 并行查询所有需要的数据
  const [
    logsRes,
    monthlyReviewsRes,
    halfYearReviewsRes,
    userBadgesRes,
    challengeCheckinsRes,
    challengesRes,
  ] = await Promise.all([
    // 1. 每日日志（按去重天数计算）
    userIds.length
      ? supabaseAdmin
          .from('daily_logs')
          .select('user_id, date')
          .in('user_id', userIds)
          .gte('date', range.start)
          .lte('date', range.end)
      : Promise.resolve({ data: [], error: null }),

    // 2. 月度复盘（统计周期内完成的）
    userIds.length
      ? supabaseAdmin
          .from('monthly_reviews')
          .select('user_id, year, month')
          .in('user_id', userIds)
          .gte('year', parseInt(range.start.split('-')[0]))
          .lte('year', parseInt(range.end.split('-')[0]))
      : Promise.resolve({ data: [], error: null }),

    // 3. 半年复盘（统计周期内完成的）
    userIds.length
      ? supabaseAdmin
          .from('half_year_reviews')
          .select('user_id, year, half')
          .in('user_id', userIds)
          .gte('year', parseInt(range.start.split('-')[0]))
          .lte('year', parseInt(range.end.split('-')[0]))
      : Promise.resolve({ data: [], error: null }),

    // 4. 用户徽章（统计周期内获得的积分）
    userIds.length && !isAllTime
      ? supabaseAdmin
          .from('user_badges')
          .select('user_id, awarded_at, badges(points)')
          .in('user_id', userIds)
          .gte('awarded_at', range.start)
          .lte('awarded_at', range.end)
      : Promise.resolve({ data: [], error: null }),

    // 5. 挑战打卡（用于计算周期内连续天数）
    userIds.length
      ? supabaseAdmin
          .from('challenge_checkins')
          .select('user_id, checkin_date')
          .in('user_id', userIds)
          .gte('checkin_date', range.start)
          .lte('checkin_date', range.end)
          .order('checkin_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    // 6. 用户挑战（获取当前总连续天数，用于总榜）
    userIds.length
      ? supabaseAdmin
          .from('user_challenges')
          .select('user_id, current_streak')
          .in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (monthlyReviewsRes.error) throw monthlyReviewsRes.error;
  if (halfYearReviewsRes.error) throw halfYearReviewsRes.error;
  if (userBadgesRes.error) throw userBadgesRes.error;
  if (challengeCheckinsRes.error) throw challengeCheckinsRes.error;
  if (challengesRes.error) throw challengesRes.error;

  // ========== 计算周期内有效日志得分 ==========
  // 按去重天数计算：每天最多计1次，每次+10分
  const uniqueDaysCountMap = new Map<string, number>();
  const uniqueDaysMap = new Map<string, Set<string>>();

  (logsRes.data || []).forEach((row: any) => {
    if (!uniqueDaysMap.has(row.user_id)) {
      uniqueDaysMap.set(row.user_id, new Set());
    }
    uniqueDaysMap.get(row.user_id)!.add(row.date);
  });

  uniqueDaysMap.forEach((days, userId) => {
    uniqueDaysCountMap.set(userId, days.size);
  });

  // ========== 计算周期内月度复盘得分 ==========
  // 每次+50分
  const monthlyCountMap = new Map<string, number>();
  (monthlyReviewsRes.data || []).forEach((row: any) => {
    monthlyCountMap.set(row.user_id, (monthlyCountMap.get(row.user_id) || 0) + 1);
  });

  // ========== 计算周期内半年复盘得分 ==========
  // 每次+100分
  const halfYearCountMap = new Map<string, number>();
  (halfYearReviewsRes.data || []).forEach((row: any) => {
    halfYearCountMap.set(row.user_id, (halfYearCountMap.get(row.user_id) || 0) + 1);
  });

  // ========== 计算周期内新增积分 ==========
  // 徽章积分求和
  const periodPointsMap = new Map<string, number>();
  (userBadgesRes.data || []).forEach((row: any) => {
    const points = row.badges?.points || 0;
    periodPointsMap.set(row.user_id, (periodPointsMap.get(row.user_id) || 0) + points);
  });

  // ========== 计算周期内有效连续天数 ==========
  // 统计周期内有多少天有挑战打卡记录
  const periodStreakDaysMap = new Map<string, number>();

  // 按用户分组统计
  const checkinsByUser = new Map<string, string[]>();
  (challengeCheckinsRes.data || []).forEach((row: any) => {
    if (!checkinsByUser.has(row.user_id)) {
      checkinsByUser.set(row.user_id, []);
    }
    checkinsByUser.get(row.user_id)!.push(row.checkin_date);
  });

  // 计算每个用户的周期内连续天数
  checkinsByUser.forEach((dates, userId) => {
    // 去重并排序
    const uniqueDates = [...new Set(dates)].sort();
    // 统计有打卡的唯一天数
    periodStreakDaysMap.set(userId, uniqueDates.length);
  });

  // ========== 构建排行榜数据 ==========
  const rows = filteredProfiles.map((profile) => {
    // 周期内各项数据
    const periodJournalDays = uniqueDaysCountMap.get(profile.id) || 0;
    const periodMonthlyReviews = monthlyCountMap.get(profile.id) || 0;
    const periodHalfYearReviews = halfYearCountMap.get(profile.id) || 0;
    const periodStreakDays = periodStreakDaysMap.get(profile.id) || 0;
    const periodNewPoints = periodPointsMap.get(profile.id) || 0;

    // 总榜数据
    const totalPoints = profile.total_points || 0;
    const totalStreak = profile.current_streak || 0;

    // 计算周期内日志得分：每天日志 +10，月度复盘 +50，半年复盘 +100
    const journalScore = periodJournalDays * 10;
    const monthlyScore = periodMonthlyReviews * 50;
    const halfYearScore = periodHalfYearReviews * 100;
    const periodJournalTotalScore = journalScore + monthlyScore + halfYearScore;

    // 周期内连胜得分：连续天数 * 10
    const periodStreakScore = periodStreakDays * 10;

    // 综合得分 = 日志得分 + 连胜得分 + 新增积分
    const compositeScore = periodJournalTotalScore + periodStreakScore + periodNewPoints;

    // 用于单项指标排名的分数
    const score =
      metric === 'journal_count'
        ? periodJournalDays + periodMonthlyReviews + periodHalfYearReviews  // 日志数（含复盘）
        : metric === 'challenge_streak'
          ? isAllTime ? totalStreak : periodStreakDays  // 连续天数
          : metric === 'achievement_points'
            ? isAllTime ? totalPoints : periodNewPoints   // 积分
            : compositeScore;                            // 综合分

    return {
      user_id: profile.id,
      score,
      rank_delta: 0,
      stats: {
        // 日志相关
        journal_count: periodJournalDays,
        monthly_reviews: periodMonthlyReviews,
        half_year_reviews: periodHalfYearReviews,
        journal_score: periodJournalTotalScore,
        // 连续相关
        challenge_streak: isAllTime ? totalStreak : periodStreakDays,
        streak_score: periodStreakScore,
        // 积分相关
        achievement_points: isAllTime ? totalPoints : periodNewPoints,
        // 用于显示的完整数据
        period_days: isAllTime ? null : {
          start: range.start,
          end: range.end,
          journal_score: periodJournalTotalScore,
          streak_score: periodStreakScore,
          new_points: periodNewPoints,
        },
      },
      user: {
        id: profile.id,
        nickname: profile.nickname,
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    };
  });

  // 排序：按分数降序，分数相同则按用户ID升序
  rows.sort((a, b) => b.score - a.score || a.user_id.localeCompare(b.user_id));

  // 添加排名
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
};

export const getAuthUserId = (req: Request) => req.user?.id as string;
