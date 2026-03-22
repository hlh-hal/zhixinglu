import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuthUserId, jsonError } from '../utils/community.js';

const router = express.Router();

const requireAdmin = async (userId: string) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
  if (error) throw error;
  return data?.role === 'admin';
};

router.get('/challenges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { data: challenges, error } = await supabaseAdmin.from('challenges').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const challengeIds = (challenges || []).map((item) => item.id);
    const [participantsRes, checkinsRes] = await Promise.all([
      challengeIds.length
        ? supabaseAdmin.from('user_challenges').select('challenge_id, status').in('challenge_id', challengeIds)
        : Promise.resolve({ data: [], error: null }),
      challengeIds.length
        ? supabaseAdmin.from('challenge_checkins').select('challenge_id')
            .in('challenge_id', challengeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (participantsRes.error) throw participantsRes.error;
    if (checkinsRes.error) throw checkinsRes.error;

    const participantMap = new Map<string, number>();
    const checkinMap = new Map<string, number>();
    const activeMap = new Map<string, number>();
    const completedMap = new Map<string, number>();

    (participantsRes.data || []).forEach((row: any) => {
      participantMap.set(row.challenge_id, (participantMap.get(row.challenge_id) || 0) + 1);
      if (row.status === 'active') activeMap.set(row.challenge_id, (activeMap.get(row.challenge_id) || 0) + 1);
      if (row.status === 'completed') completedMap.set(row.challenge_id, (completedMap.get(row.challenge_id) || 0) + 1);
    });

    (checkinsRes.data || []).forEach((row: any) => {
      checkinMap.set(row.challenge_id, (checkinMap.get(row.challenge_id) || 0) + 1);
    });

    res.json({
      challenges: (challenges || []).map((challenge) => ({
        ...challenge,
        participant_count: participantMap.get(challenge.id) || 0,
        checkin_stats: {
          total_checkins: checkinMap.get(challenge.id) || 0,
          active_participants: activeMap.get(challenge.id) || 0,
          completed_participants: completedMap.get(challenge.id) || 0,
        },
      })),
    });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch admin challenges', error.message);
  }
});

router.post('/challenges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { title, slug, description, icon, duration_days, start_at, end_at, status, rules, badge_id, banner_url } = req.body;
    if (!title || !slug || !duration_days) return jsonError(res, 400, 'title, slug and duration_days are required');

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .insert({
        title,
        slug,
        description: description || null,
        icon: icon || null,
        banner_url: banner_url || null,
        duration_days,
        start_at: start_at || null,
        end_at: end_at || null,
        status: status || 'draft',
        rules: rules || {},
        badge_id: badge_id || null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, 'Failed to create challenge', error.message);
  }
});

router.put('/challenges/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { title, slug, description, icon, duration_days, start_at, end_at, status, rules, badge_id, banner_url } = req.body;

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .update({
        title,
        slug,
        description,
        icon,
        banner_url,
        duration_days,
        start_at,
        end_at,
        status,
        rules,
        badge_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, 'Failed to update challenge', error.message);
  }
});

router.get('/badges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { data, error } = await supabaseAdmin.from('badges').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ badges: data || [] });
  } catch (error: any) {
    jsonError(res, 500, 'Failed to fetch admin badges', error.message);
  }
});

router.post('/badges', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { name, slug, description, icon, category, points, rule_type, unlock_rule } = req.body;
    if (!name || !slug || !category || points == null || !rule_type) {
      return jsonError(res, 400, 'name, slug, category, points and rule_type are required');
    }

    const { data, error } = await supabaseAdmin
      .from('badges')
      .insert({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        category,
        points,
        rule_type,
        unlock_rule: unlock_rule || {},
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, 'Failed to create badge', error.message);
  }
});

router.put('/badges/:id', requireAuth, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!(await requireAdmin(userId))) return jsonError(res, 403, 'Forbidden');

    const { name, slug, description, icon, category, points, rule_type, unlock_rule, is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from('badges')
      .update({
        name,
        slug,
        description,
        icon,
        category,
        points,
        rule_type,
        unlock_rule,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, 'Failed to update badge', error.message);
  }
});

export default router;
