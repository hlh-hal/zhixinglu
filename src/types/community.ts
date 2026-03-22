export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';
export type FriendshipAction = 'accept' | 'reject';
export type ChallengeStatus = 'draft' | 'published' | 'active' | 'ended' | 'archived';
export type UserChallengeStatus = 'active' | 'completed' | 'quit' | 'failed';
export type FeedSort = 'latest' | 'popular';
export type LeaderboardPeriod = 'week' | 'month' | 'all_time';
export type LeaderboardMetric = 'composite' | 'journal_count' | 'challenge_streak' | 'achievement_points';
export type BadgeRuleType =
  | 'consecutive_journals'
  | 'total_journals'
  | 'challenges_completed'
  | 'total_likes_given'
  | 'friends_count'
  | 'total_comments';

export interface CommunityUser {
  id: string;
  nickname: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface FriendSearchUser extends CommunityUser {
  friendship_status: FriendshipStatus;
}

export interface FriendRequestItem {
  id: string;
  requester: CommunityUser;
  message: string | null;
  created_at: string;
}

export interface FriendListItem {
  id: string;
  friend: CommunityUser;
  today_has_log: boolean;
  is_supervision_partner: boolean;
  created_at: string;
}

export interface SupervisionPartnerItem {
  id: string;
  partner: CommunityUser;
  today_has_log: boolean;
  today_confirmed: boolean;
  today_reminded: boolean;
  today_goal: string | null;
}

export interface ChallengeParticipation {
  user_challenge_id: string;
  status: UserChallengeStatus;
  current_streak: number;
  total_checkins: number;
  today_checked_in: boolean;
}

export interface ChallengeListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string | null;
  banner_url: string | null;
  duration_days: number;
  start_at: string | null;
  end_at: string | null;
  status: ChallengeStatus;
  participant_count: number;
  my_participation: ChallengeParticipation | null;
}

export interface MyChallengeItem {
  user_challenge_id: string;
  status: UserChallengeStatus;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  joined_at: string;
  today_checked_in: boolean;
  challenge: ChallengeListItem | null;
}

export interface ChallengeParticipantItem {
  user: CommunityUser;
  status: UserChallengeStatus;
  current_streak: number;
  total_checkins: number;
  joined_at: string;
}

export interface ChallengeCheckinItem {
  checkin_date: string;
  note: string | null;
}

export interface ChallengeDetail {
  challenge: ChallengeListItem;
  participants: ChallengeParticipantItem[];
  my_checkins: ChallengeCheckinItem[];
}

export interface FeedActivityItem {
  id: string;
  actor: CommunityUser;
  activity_type: string;
  content: string | null;
  metadata: Record<string, unknown>;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface FeedCommentItem {
  id: string;
  user: CommunityUser;
  content: string;
  created_at: string;
}

export interface BadgeProgress {
  current: number;
  target: number;
}

export interface BadgeListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  points: number;
  rule_type: string;
  unlock_rule: Record<string, unknown>;
  unlocked: boolean;
  unlocked_at: string | null;
  progress: BadgeProgress;
}

export interface LeaderboardUserEntry {
  rank: number;
  user: CommunityUser;
  score: number;
  rank_delta: number;
  stats: {
    // 日志相关
    journal_count: number;          // 周期内有效日志天数
    monthly_reviews: number;        // 月度复盘次数
    half_year_reviews: number;      // 半年复盘次数
    journal_score: number;           // 日志相关总得分
    // 连续相关
    challenge_streak: number;        // 连续天数（周期内或历史最高）
    streak_score: number;            // 连续相关得分
    // 积分相关
    achievement_points: number;       // 积分（周期内新增或累计）
    // 周期信息
    period_days: {
      start: string;
      end: string;
      journal_score: number;
      streak_score: number;
      new_points: number;
    } | null;
  };
}

export interface LeaderboardMe extends Omit<LeaderboardUserEntry, 'user'> {
  total_users: number;
  gap_to_previous: number;
  percentile: number;
}

export interface CommunityNotificationItem {
  id: string;
  user_id: string;
  sender_id: string | null;
  title: string;
  content: string;
  type:
    | 'system'
    | 'friend_request'
    | 'friend_accepted'
    | 'supervision_remind'
    | 'challenge_invite'
    | 'achievement'
    | 'activity_like'
    | 'activity_comment';
  is_read: boolean;
  related_type: string | null;
  related_id: string | null;
  action_url: string | null;
  created_at: string;
}

export interface BadgeSummary {
  total_badges: number;
  unlocked_count: number;
  locked_count: number;
  total_points: number;
  completion_percentage: number;
}

export interface AdminChallengeStats {
  participant_count: number;
  checkin_stats: {
    total_checkins: number;
    completed_participants: number;
    active_participants: number;
  };
}

export interface AdminChallengeItem extends AdminChallengeStats {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string | null;
  banner_url: string | null;
  duration_days: number;
  start_at: string | null;
  end_at: string | null;
  status: ChallengeStatus;
  rules: Record<string, unknown>;
  badge_id: string | null;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

export interface AdminBadgeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  points: number;
  rule_type: BadgeRuleType | string;
  unlock_rule: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
