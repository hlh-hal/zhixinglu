import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getAuthUserId,
  getBadgeProgressValue,
  getLeaderboardRowsFallback,
  getPeriodRange,
  getProfileMap,
  jsonError,
  parseLimit,
  sendNotification,
  sortPair,
  todayString,
  truncateText,
} from '../utils/community.js';

const router = express.Router();

const encodeCursor = (payload: Record<string, unknown>) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const decodeCursor = (cursor?: string) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const getAcceptedFriendIds = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  return (data || []).map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
};

const canViewActivity = async (userId: string, activity: any) => {
  if (activity.actor_id === userId) return true;
  if (activity.visibility === 'public') return true;
  if (activity.visibility === 'private') return false;
  const friendIds = await getAcceptedFriendIds(userId);
  return friendIds.includes(activity.actor_id);
};

router.get('/friends/search', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const keyword = String(req.query.keyword || '').trim();

    if (!keyword) {
      return res.json({ users: [] });
    }

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, username, avatar_url')
      .neq('id', userId)
      .or(`username.ilike.%${keyword}%,nickname.ilike.%${keyword}%`)
      .limit(20);

    if (error) throw error;

    const userIds = (users || []).map((item) => item.id);
    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendshipError) throw friendshipError;

    const relationshipMap = new Map<string, string>();
    (friendships || []).forEach((friendship) => {
      const otherId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
      if (!userIds.includes(otherId)) return;
      if (friendship.status === 'accepted') {
        relationshipMap.set(otherId, 'accepted');
      } else if (friendship.status === 'pending') {
        relationshipMap.set(otherId, friendship.requester_id === userId ? 'pending_sent' : 'pending_received');
      }
    });

    res.json({
      users: (users || []).map((item) => ({
        ...item,
        friendship_status: relationshipMap.get(item.id) || 'none',
      })),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to search users', error.message);
  }
});

router.post('/friends/request', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { addressee_id, message } = req.body as { addressee_id?: string; message?: string };

    if (!addressee_id) return jsonError(res, 400, 'addressee_id is required');
    if (addressee_id === userId) return jsonError(res, 400, 'Cannot add yourself');

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${userId})`)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.status === 'pending') return jsonError(res, 409, 'Friend request already exists');
    if (existing?.status === 'accepted') return jsonError(res, 409, 'You are already friends');

    const { data: friendship, error } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: userId,
        addressee_id,
        status: 'pending',
        request_message: message || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    await sendNotification({
      user_id: addressee_id,
      sender_id: userId,
      title: '新的好友申请',
      content: '你收到了一条新的好友申请',
      type: 'friend_request',
      related_type: 'friendship',
      related_id: friendship.id,
      action_url: '/community/friends',
    });

    res.json({ success: true, friendship });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to send friend request', error.message);
  }
});

router.get('/friends/requests', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: rows, error } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, request_message, created_at')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profileMap = await getProfileMap((rows || []).map((row) => row.requester_id));

    res.json({
      requests: (rows || []).map((row) => ({
        id: row.id,
        requester: profileMap.get(row.requester_id),
        message: row.request_message,
        created_at: row.created_at,
      })),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch friend requests', error.message);
  }
});

router.put('/friends/requests/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { action } = req.body as { action?: 'accept' | 'reject' };

    if (!action || !['accept', 'reject'].includes(action)) {
      return jsonError(res, 400, 'Invalid action');
    }

    const { data: friendship, error: findError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', req.params.id)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (findError) throw findError;
    if (!friendship) return jsonError(res, 404, 'Friend request not found');

    const updates =
      action === 'accept'
        ? { status: 'accepted', responded_by: userId, responded_at: new Date().toISOString() }
        : { status: 'rejected', responded_by: userId, responded_at: new Date().toISOString() };

    const { data, error } = await supabaseAdmin
      .from('friendships')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    if (action === 'accept') {
      await sendNotification({
        user_id: friendship.requester_id,
        sender_id: userId,
        title: '好友申请已通过',
        content: '你的好友申请已被接受',
        type: 'friend_accepted',
        related_type: 'friendship',
        related_id: friendship.id,
        action_url: '/community/friends',
      });
    }

    res.json({ success: true, friendship: data });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to handle friend request', error.message);
  }
});

router.get('/friends', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const today = todayString();

    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, addressee_id, created_at')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const friendIds = (friendships || []).map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
    const profileMap = await getProfileMap(friendIds);

    const [{ data: logs, error: logsError }, { data: partners, error: partnersError }] = await Promise.all([
      friendIds.length
        ? supabaseAdmin.from('daily_logs').select('user_id').in('user_id', friendIds).eq('date', today)
        : Promise.resolve({ data: [], error: null }),
      friendIds.length
        ? supabaseAdmin
            .from('supervision_partners')
            .select('user_low, user_high')
            .eq('status', 'active')
            .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (logsError) throw logsError;
    if (partnersError) throw partnersError;

    const logSet = new Set((logs || []).map((item: any) => item.user_id));
    const partnerSet = new Set((partners || []).map((item: any) => `${item.user_low}:${item.user_high}`));

    res.json({
      friends: (friendships || []).map((row) => {
        const friendId = row.requester_id === userId ? row.addressee_id : row.requester_id;
        const pair = sortPair(userId, friendId);
        return {
          id: row.id,
          friend: profileMap.get(friendId),
          today_has_log: logSet.has(friendId),
          is_supervision_partner: partnerSet.has(`${pair.user_low}:${pair.user_high}`),
          created_at: row.created_at,
        };
      }),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch friends', error.message);
  }
});

router.delete('/friends/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: friendship, error: findError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', req.params.id)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .maybeSingle();

    if (findError) throw findError;
    if (!friendship) return jsonError(res, 404, 'Friendship not found');

    const pair = sortPair(friendship.requester_id, friendship.addressee_id);

    await supabaseAdmin
      .from('supervision_partners')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('user_low', pair.user_low)
      .eq('user_high', pair.user_high)
      .neq('status', 'ended');

    const { error } = await supabaseAdmin.from('friendships').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to delete friendship', error.message);
  }
});

router.get('/supervision', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const today = todayString();

    const { data: partners, error } = await supabaseAdmin
      .from('supervision_partners')
      .select('*')
      .eq('status', 'active')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const partnerIds = (partners || []).map((row) => (row.user_low === userId ? row.user_high : row.user_low));
    const profileMap = await getProfileMap(partnerIds);

    const [{ data: logs }, { data: confirmations }, { data: reminders }] = await Promise.all([
      partnerIds.length
        ? supabaseAdmin.from('daily_logs').select('user_id, thoughts').in('user_id', partnerIds).eq('date', today)
        : Promise.resolve({ data: [], error: null }),
      (partners || []).length
        ? supabaseAdmin
            .from('supervision_partner_confirmations')
            .select('supervision_partner_id, confirmed_user_id')
            .eq('confirmer_id', userId)
            .eq('confirm_date', today)
        : Promise.resolve({ data: [], error: null }),
      (partners || []).length
        ? supabaseAdmin
            .from('supervision_reminders')
            .select('supervision_partner_id, receiver_id')
            .eq('sender_id', userId)
            .eq('reminder_date', today)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const logMap = new Map((logs || []).map((row: any) => [row.user_id, row]));
    const confirmationSet = new Set((confirmations || []).map((row: any) => `${row.supervision_partner_id}:${row.confirmed_user_id}`));
    const reminderSet = new Set((reminders || []).map((row: any) => `${row.supervision_partner_id}:${row.receiver_id}`));

    res.json({
      partners: (partners || []).map((row) => {
        const partnerId = row.user_low === userId ? row.user_high : row.user_low;
        const log = logMap.get(partnerId);
        return {
          id: row.id,
          partner: profileMap.get(partnerId),
          today_has_log: Boolean(log),
          today_confirmed: confirmationSet.has(`${row.id}:${partnerId}`),
          today_reminded: reminderSet.has(`${row.id}:${partnerId}`),
          today_goal: truncateText(log?.thoughts || null, 30),
        };
      }),
      max_partners: 10,
      current_count: (partners || []).length,
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch supervision partners', error.message);
  }
});

router.post('/supervision', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { friend_id } = req.body as { friend_id?: string };

    if (!friend_id) return jsonError(res, 400, 'friend_id is required');
    if (friend_id === userId) return jsonError(res, 400, 'Cannot add yourself');

    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('status')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friend_id}),and(requester_id.eq.${friend_id},addressee_id.eq.${userId})`)
      .maybeSingle();

    if (friendshipError) throw friendshipError;
    if (!friendship) return jsonError(res, 400, 'Target user is not your friend');

    const { count, error: countError } = await supabaseAdmin
      .from('supervision_partners')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    if (countError) throw countError;
    if ((count || 0) >= 10) return jsonError(res, 400, 'Maximum supervision partners reached');

    const pair = sortPair(userId, friend_id);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('supervision_partners')
      .select('*')
      .eq('user_low', pair.user_low)
      .eq('user_high', pair.user_high)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.status === 'active') return res.json({ success: true, partner: existing });

    const query = existing
      ? supabaseAdmin
          .from('supervision_partners')
          .update({ status: 'active', created_by: userId, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      : supabaseAdmin.from('supervision_partners').insert({
          user_low: pair.user_low,
          user_high: pair.user_high,
          created_by: userId,
          status: 'active',
        });

    const { data, error } = await query.select('*').single();
    if (error) throw error;

    res.json({ success: true, partner: data });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to create supervision partner', error.message);
  }
});

router.post('/supervision/:id/confirm', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const today = todayString();

    const { data: partner, error } = await supabaseAdmin
      .from('supervision_partners')
      .select('*')
      .eq('id', req.params.id)
      .eq('status', 'active')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .maybeSingle();

    if (error) throw error;
    if (!partner) return jsonError(res, 404, 'Supervision partner not found');

    const confirmedUserId = partner.user_low === userId ? partner.user_high : partner.user_low;

    const { data, error: insertError } = await supabaseAdmin
      .from('supervision_partner_confirmations')
      .upsert(
        {
          supervision_partner_id: partner.id,
          confirmer_id: userId,
          confirmed_user_id: confirmedUserId,
          confirm_date: today,
        },
        { onConflict: 'supervision_partner_id,confirmer_id,confirmed_user_id,confirm_date' },
      )
      .select('*')
      .single();

    if (insertError) throw insertError;
    res.json({ success: true, confirmation: data });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to confirm supervision status', error.message);
  }
});

router.post('/supervision/:id/remind', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const today = todayString();

    const { data: partner, error } = await supabaseAdmin
      .from('supervision_partners')
      .select('*')
      .eq('id', req.params.id)
      .eq('status', 'active')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .maybeSingle();

    if (error) throw error;
    if (!partner) return jsonError(res, 404, 'Supervision partner not found');

    const receiverId = partner.user_low === userId ? partner.user_high : partner.user_low;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('supervision_reminders')
      .select('id')
      .eq('supervision_partner_id', partner.id)
      .eq('reminder_date', today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return jsonError(res, 409, 'Already reminded today');

    const { data, error: insertError } = await supabaseAdmin
      .from('supervision_reminders')
      .insert({
        supervision_partner_id: partner.id,
        sender_id: userId,
        receiver_id: receiverId,
        reminder_date: today,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    await sendNotification({
      user_id: receiverId,
      sender_id: userId,
      title: '监督伙伴提醒',
      content: '你的监督伙伴提醒你查看今日打卡',
      type: 'supervision_remind',
      related_type: 'supervision_partner',
      related_id: partner.id,
      action_url: '/community/friends',
    });

    res.json({ success: true, reminder: data });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to send reminder', error.message);
  }
});

router.get('/challenges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const status = String(req.query.status || 'active');
    const today = todayString();

    let query = supabaseAdmin.from('challenges').select('*').order('start_at', { ascending: true });
    if (status !== 'all') query = query.eq('status', status);

    const { data: challenges, error } = await query;
    if (error) throw error;

    const challengeIds = (challenges || []).map((challenge) => challenge.id);
    const [userChallengesRes, todayCheckinsRes] = await Promise.all([
      challengeIds.length
        ? supabaseAdmin
            .from('user_challenges')
            .select('id, user_id, challenge_id, status, current_streak, total_checkins')
            .in('challenge_id', challengeIds)
        : Promise.resolve({ data: [], error: null }),
      challengeIds.length
        ? supabaseAdmin
            .from('challenge_checkins')
            .select('user_challenge_id, checkin_date')
            .eq('user_id', userId)
            .eq('checkin_date', today)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (userChallengesRes.error) throw userChallengesRes.error;
    if (todayCheckinsRes.error) throw todayCheckinsRes.error;

    const participantCountMap = new Map<string, number>();
    const myParticipationMap = new Map<string, any>();
    (userChallengesRes.data || []).forEach((item: any) => {
      participantCountMap.set(item.challenge_id, (participantCountMap.get(item.challenge_id) || 0) + 1);
      if (item.user_id === userId) myParticipationMap.set(item.challenge_id, item);
    });

    const todayCheckedInSet = new Set((todayCheckinsRes.data || []).map((item: any) => item.user_challenge_id));

    res.json({
      challenges: (challenges || []).map((challenge) => {
        const myParticipation = myParticipationMap.get(challenge.id);
        return {
          ...challenge,
          participant_count: participantCountMap.get(challenge.id) || 0,
          my_participation: myParticipation
            ? {
                user_challenge_id: myParticipation.id,
                status: myParticipation.status,
                current_streak: myParticipation.current_streak,
                total_checkins: myParticipation.total_checkins,
                today_checked_in: todayCheckedInSet.has(myParticipation.id),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch challenges', error.message);
  }
});

router.get('/challenges/my', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const today = todayString();

    const { data: rows, error } = await supabaseAdmin
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    const challengeIds = (rows || []).map((row) => row.challenge_id);
    const { data: challenges, error: challengeError } = challengeIds.length
      ? await supabaseAdmin.from('challenges').select('*').in('id', challengeIds)
      : { data: [], error: null };

    if (challengeError) throw challengeError;

    const challengeMap = new Map((challenges || []).map((item) => [item.id, item]));
    const { data: todayCheckins, error: checkinError } = challengeIds.length
      ? await supabaseAdmin
          .from('challenge_checkins')
          .select('user_challenge_id')
          .eq('user_id', userId)
          .eq('checkin_date', today)
      : { data: [], error: null };

    if (checkinError) throw checkinError;

    const todayCheckedInSet = new Set((todayCheckins || []).map((item: any) => item.user_challenge_id));

    res.json({
      challenges: (rows || []).map((row) => ({
        user_challenge_id: row.id,
        status: row.status,
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        total_checkins: row.total_checkins,
        last_checkin_date: row.last_checkin_date,
        joined_at: row.joined_at,
        today_checked_in: todayCheckedInSet.has(row.id),
        challenge: challengeMap.get(row.challenge_id) || null,
      })),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch my challenges', error.message);
  }
});

router.get('/challenges/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: challenge, error } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!challenge) return jsonError(res, 404, 'Challenge not found');

    const { data: participants, error: participantError } = await supabaseAdmin
      .from('user_challenges')
      .select('id, user_id, status, current_streak, total_checkins, joined_at')
      .eq('challenge_id', req.params.id)
      .order('current_streak', { ascending: false })
      .order('total_checkins', { ascending: false })
      .limit(20);

    if (participantError) throw participantError;

    const profileMap = await getProfileMap((participants || []).map((row) => row.user_id));
    const { data: myParticipation } = await supabaseAdmin
      .from('user_challenges')
      .select('id')
      .eq('challenge_id', req.params.id)
      .eq('user_id', userId)
      .maybeSingle();

    const { data: checkins, error: checkinError } = myParticipation
      ? await supabaseAdmin
          .from('challenge_checkins')
          .select('checkin_date, note')
          .eq('user_challenge_id', myParticipation.id)
          .order('checkin_date', { ascending: true })
      : { data: [], error: null };

    if (checkinError) throw checkinError;

    res.json({
      challenge,
      participants: (participants || []).map((row) => ({
        user: profileMap.get(row.user_id),
        status: row.status,
        current_streak: row.current_streak,
        total_checkins: row.total_checkins,
        joined_at: row.joined_at,
      })),
      my_checkins: checkins || [],
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch challenge detail', error.message);
  }
});

router.post('/challenges/:id/join', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('id, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (challengeError) throw challengeError;
    if (!challenge) return jsonError(res, 404, 'Challenge not found');
    if (!['active', 'published'].includes(challenge.status)) {
      return jsonError(res, 400, 'Challenge is not available to join');
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('user_challenges')
      .select('id')
      .eq('challenge_id', challenge.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return jsonError(res, 409, 'Already joined this challenge');

    const { data, error } = await supabaseAdmin
      .from('user_challenges')
      .insert({ user_id: userId, challenge_id: challenge.id, status: 'active' })
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, participation: data });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to join challenge', error.message);
  }
});

router.post('/challenges/:id/checkin', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { note } = req.body as { note?: string };
    const today = todayString();

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('id, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (challengeError) throw challengeError;
    if (!challenge) return jsonError(res, 404, 'Challenge not found');
    if (challenge.status !== 'active') return jsonError(res, 400, 'Challenge is not active');

    const { data: participation, error: participationError } = await supabaseAdmin
      .from('user_challenges')
      .select('*')
      .eq('challenge_id', req.params.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (participationError) throw participationError;
    if (!participation) return jsonError(res, 400, 'You have not joined this challenge');

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('challenge_checkins')
      .select('id')
      .eq('user_challenge_id', participation.id)
      .eq('checkin_date', today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return jsonError(res, 409, 'Already checked in today');

    const { error } = await supabaseAdmin.from('challenge_checkins').insert({
      user_challenge_id: participation.id,
      user_id: userId,
      challenge_id: req.params.id,
      checkin_date: today,
      note: note || null,
    });

    if (error) throw error;

    const { data: updated, error: updatedError } = await supabaseAdmin
      .from('user_challenges')
      .select('current_streak, total_checkins')
      .eq('id', participation.id)
      .single();

    if (updatedError) throw updatedError;
    res.json({ success: true, current_streak: updated.current_streak, total_checkins: updated.total_checkins });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to check in challenge', error.message);
  }
});

router.get('/challenges/:id/checkins', requireAuth, async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    const targetUserId = String(req.query.user_id || currentUserId);

    const { data: participation, error: participationError } = await supabaseAdmin
      .from('user_challenges')
      .select('id')
      .eq('challenge_id', req.params.id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (participationError) throw participationError;
    if (!participation) return res.json({ checkins: [] });

    const { data: checkins, error } = await supabaseAdmin
      .from('challenge_checkins')
      .select('checkin_date, note')
      .eq('user_challenge_id', participation.id)
      .order('checkin_date', { ascending: true });

    if (error) throw error;
    res.json({ checkins: checkins || [] });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch challenge checkins', error.message);
  }
});

router.get('/feed', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const sort = String(req.query.sort || 'latest') as 'latest' | 'popular';
    const limit = parseLimit(req.query.limit, 20, 50);
    const cursor = decodeCursor(String(req.query.cursor || ''));

    const friendIds = await getAcceptedFriendIds(userId);
    const visibleActorIds = Array.from(new Set([userId, ...friendIds]));

    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select('*')
      .or(`visibility.eq.public,actor_id.in.(${visibleActorIds.join(',')})`)
      .limit(200);

    if (error) throw error;

    const visibleActivities = (activities || []).filter((activity) => {
      if (activity.actor_id === userId) return true;
      if (activity.visibility === 'public') return true;
      if (activity.visibility === 'friends') return friendIds.includes(activity.actor_id);
      return false;
    });

    visibleActivities.sort((a, b) => {
      if (sort === 'popular') {
        return (
          (b.like_count || 0) - (a.like_count || 0) ||
          (b.comment_count || 0) - (a.comment_count || 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
          String(b.id).localeCompare(String(a.id))
        );
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || String(b.id).localeCompare(String(a.id));
    });

    let startIndex = 0;
    if (cursor) {
      const matchIndex = visibleActivities.findIndex((item) => item.id === cursor.id);
      startIndex = matchIndex >= 0 ? matchIndex + 1 : 0;
    }

    const pageItems = visibleActivities.slice(startIndex, startIndex + limit);
    const nextItem = visibleActivities[startIndex + limit] || null;
    const actorMap = await getProfileMap(pageItems.map((item) => item.actor_id));

    const { data: likes, error: likesError } = pageItems.length
      ? await supabaseAdmin
          .from('activity_likes')
          .select('activity_id')
          .eq('user_id', userId)
          .in('activity_id', pageItems.map((item) => item.id))
      : { data: [], error: null };

    if (likesError) throw likesError;
    const likeSet = new Set((likes || []).map((item: any) => item.activity_id));

    res.json({
      activities: pageItems.map((item) => ({
        id: item.id,
        actor: actorMap.get(item.actor_id),
        activity_type: item.activity_type,
        content: item.content,
        metadata: item.metadata || {},
        like_count: item.like_count || 0,
        comment_count: item.comment_count || 0,
        is_liked: likeSet.has(item.id),
        created_at: item.created_at,
      })),
      next_cursor: nextItem ? encodeCursor({ id: nextItem.id }) : null,
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch feed', error.message);
  }
});

router.post('/feed/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (activityError) throw activityError;
    if (!activity) return jsonError(res, 404, 'Activity not found');
    if (!(await canViewActivity(userId, activity))) return jsonError(res, 403, 'Forbidden');

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('activity_likes')
      .select('id')
      .eq('activity_id', req.params.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    let liked = false;
    if (existing) {
      const { error } = await supabaseAdmin.from('activity_likes').delete().eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('activity_likes').insert({ activity_id: req.params.id, user_id: userId });
      if (error) throw error;
      liked = true;
    }

    const { data: updated, error: updatedError } = await supabaseAdmin
      .from('activities')
      .select('like_count')
      .eq('id', req.params.id)
      .single();

    if (updatedError) throw updatedError;
    res.json({ liked, like_count: updated.like_count || 0 });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to toggle like', error.message);
  }
});

router.get('/feed/:id/comments', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (activityError) throw activityError;
    if (!activity) return jsonError(res, 404, 'Activity not found');
    if (!(await canViewActivity(userId, activity))) return jsonError(res, 403, 'Forbidden');

    const { data: comments, error } = await supabaseAdmin
      .from('activity_comments')
      .select('id, user_id, content, created_at')
      .eq('activity_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const profileMap = await getProfileMap((comments || []).map((item) => item.user_id));

    res.json({
      comments: (comments || []).map((comment) => ({
        id: comment.id,
        user: profileMap.get(comment.user_id),
        content: comment.content,
        created_at: comment.created_at,
      })),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch comments', error.message);
  }
});

router.post('/feed/:id/comments', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { content, parent_comment_id } = req.body as { content?: string; parent_comment_id?: string };

    if (!content?.trim()) return jsonError(res, 400, 'Content is required');

    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (activityError) throw activityError;
    if (!activity) return jsonError(res, 404, 'Activity not found');
    if (!(await canViewActivity(userId, activity))) return jsonError(res, 403, 'Forbidden');

    const { data: comment, error } = await supabaseAdmin
      .from('activity_comments')
      .insert({
        activity_id: req.params.id,
        user_id: userId,
        parent_comment_id: parent_comment_id || null,
        content: content.trim(),
      })
      .select('id, content, created_at, user_id')
      .single();

    if (error) throw error;

    if (activity.actor_id !== userId) {
      await sendNotification({
        user_id: activity.actor_id,
        sender_id: userId,
        title: '收到新评论',
        content: '你的动态收到了新的评论',
        type: 'activity_comment',
        related_type: 'activity',
        related_id: activity.id,
        action_url: '/community/friends',
      });
    }

    const profileMap = await getProfileMap([userId]);
    res.json({
      comment: {
        id: comment.id,
        user: profileMap.get(userId),
        content: comment.content,
        created_at: comment.created_at,
      },
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to create comment', error.message);
  }
});

router.delete('/feed/comments/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { error } = await supabaseAdmin
      .from('activity_comments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to delete comment', error.message);
  }
});

router.get('/badges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    const [{ data: badges, error: badgeError }, { data: userBadges, error: userBadgeError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabaseAdmin.from('badges').select('*').eq('is_active', true).order('points', { ascending: true }),
        supabaseAdmin.from('user_badges').select('badge_id, awarded_at').eq('user_id', userId),
        supabaseAdmin.from('profiles').select('total_points').eq('id', userId).single(),
      ]);

    if (badgeError) throw badgeError;
    if (userBadgeError) throw userBadgeError;
    if (profileError) throw profileError;

    const unlockedMap = new Map((userBadges || []).map((item) => [item.badge_id, item.awarded_at]));
    const badgeRows = await Promise.all(
      (badges || []).map(async (badge) => {
        const target = Number(badge.unlock_rule?.value ?? badge.unlock_rule?.count ?? badge.unlock_rule?.days ?? 0) || 0;
        const current = await getBadgeProgressValue(userId, badge.rule_type);
        const unlockedAt = unlockedMap.get(badge.id) || null;

        return {
          id: badge.id,
          name: badge.name,
          slug: badge.slug,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          points: badge.points,
          rule_type: badge.rule_type,
          unlock_rule: badge.unlock_rule,
          unlocked: Boolean(unlockedAt),
          unlocked_at: unlockedAt,
          progress: { current, target },
        };
      }),
    );

    const unlockedCount = badgeRows.filter((item) => item.unlocked).length;
    const totalBadges = badgeRows.length;

    res.json({
      badges: badgeRows,
      summary: {
        total_badges: totalBadges,
        unlocked_count: unlockedCount,
        locked_count: totalBadges - unlockedCount,
        total_points: profile.total_points || 0,
        completion_percentage: totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0,
      },
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch badges', error.message);
  }
});

router.post('/badges/check', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    const { data: beforeRows, error: beforeError } = await supabaseAdmin
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (beforeError) throw beforeError;
    const beforeSet = new Set((beforeRows || []).map((row) => row.badge_id));

    const { error: rpcError } = await supabaseAdmin.rpc('check_and_unlock_badges', { p_user_id: userId });
    if (rpcError) throw rpcError;

    const { data: afterRows, error: afterError } = await supabaseAdmin
      .from('user_badges')
      .select('badge_id, points_awarded, badges(name)')
      .eq('user_id', userId);

    if (afterError) throw afterError;

    const newlyUnlocked = (afterRows || [])
      .filter((row: any) => !beforeSet.has(row.badge_id))
      .map((row: any) => ({
        badge_id: row.badge_id,
        name: row.badges?.name || '',
        points: row.points_awarded || 0,
      }));

    res.json({ newly_unlocked: newlyUnlocked });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to check badges', error.message);
  }
});

router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const period = String(req.query.period || 'week') as 'week' | 'month' | 'all_time';
    const metric = String(req.query.metric || 'composite') as 'composite' | 'journal_count' | 'challenge_streak' | 'achievement_points';
    const date = req.query.date ? String(req.query.date) : undefined;
    const friendsOnly = String(req.query.friends_only || 'false') === 'true';
    const periodStart = String(getPeriodRange(period, date).start);

    let rows: any[] = [];
    const { data: snapshotRows, error: snapshotError } = await supabaseAdmin
      .from('leaderboard_snapshots')
      .select('*')
      .eq('period_type', period)
      .eq('metric_type', metric)
      .eq('period_start', periodStart)
      .order('rank', { ascending: true });

    if (snapshotError) throw snapshotError;

    if (snapshotRows && snapshotRows.length > 0) {
      let allowedIds: string[] | null = null;
      if (friendsOnly) {
        allowedIds = Array.from(new Set([userId, ...(await getAcceptedFriendIds(userId))]));
      }

      const filteredRows = allowedIds ? snapshotRows.filter((row) => allowedIds!.includes(row.user_id)) : snapshotRows;
      const profileMap = await getProfileMap(filteredRows.map((row) => row.user_id));
      rows = filteredRows.map((row) => ({
        rank: row.rank,
        user: profileMap.get(row.user_id),
        score: Number(row.score),
        rank_delta: row.rank_delta || 0,
        stats: {
          journal_count: Number(row.stats?.journal_count || 0),
          challenge_streak: Number(row.stats?.challenge_streak || 0),
          achievement_points: Number(row.stats?.achievement_points || 0),
        },
      }));
    } else {
      const fallbackRows = await getLeaderboardRowsFallback({ period, metric, date, friendsOnly, userId });
      rows = fallbackRows.map((row) => ({
        rank: row.rank,
        user: row.user,
        score: row.score,
        rank_delta: row.rank_delta,
        stats: row.stats,
      }));
    }

    const myIndex = rows.findIndex((row) => row.user?.id === userId);
    const myRow = myIndex >= 0 ? rows[myIndex] : null;
    const previousRow = myIndex > 0 ? rows[myIndex - 1] : null;
    const totalUsers = rows.length;

    res.json({
      leaderboard: rows,
      my_rank: myRow
        ? {
            rank: myRow.rank,
            score: myRow.score,
            rank_delta: myRow.rank_delta,
            stats: myRow.stats,
            total_users: totalUsers,
            gap_to_previous: previousRow ? previousRow.score - myRow.score : 0,
            percentile: totalUsers > 0 ? Math.round(((totalUsers - myRow.rank) / totalUsers) * 100) : 0,
          }
        : null,
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch leaderboard', error.message);
  }
});

router.post('/leaderboard/refresh', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (profile?.role !== 'admin') return jsonError(res, 403, 'Forbidden');

    const { period = 'week', date } = req.body as { period?: 'week' | 'month' | 'all_time'; date?: string };
    const { error } = await supabaseAdmin.rpc('generate_leaderboard_snapshot', {
      p_period_type: period,
      p_reference_date: date || todayString(),
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to refresh leaderboard', error.message);
  }
});

export default router;
