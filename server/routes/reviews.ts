import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get monthly reviews
router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const { summary, year, month } = req.query;
    let query = supabaseAdmin
      .from('monthly_reviews')
      .select(summary === 'true' ? 'year, month' : '*')
      .eq('user_id', req.user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (year) {
      query = query.eq('year', parseInt(year as string, 10));
    }

    if (month) {
      query = query.eq('month', parseInt(month as string, 10));
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update monthly review
router.post('/monthly', requireAuth, async (req, res) => {
  try {
    const { year, month, goals_review, results_evaluation, positive_analysis, negative_analysis, replay_simulation, next_month_plan } = req.body;
    
    if (!year || !month) return res.status(400).json({ error: 'Year and month are required' });

    const payload = {
      user_id: req.user.id,
      year,
      month,
      goals_review,
      results_evaluation,
      positive_analysis,
      negative_analysis,
      replay_simulation,
      next_month_plan,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('monthly_reviews')
      .upsert(payload, { onConflict: 'user_id,year,month' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/monthly/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('monthly_reviews')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get half-year reviews
router.get('/half-year', requireAuth, async (req, res) => {
  try {
    const { summary, year, half } = req.query;
    let query = supabaseAdmin
      .from('half_year_reviews')
      .select(summary === 'true' ? 'year, half' : '*')
      .eq('user_id', req.user.id)
      .order('year', { ascending: false })
      .order('half', { ascending: false });

    if (year) {
      query = query.eq('year', parseInt(year as string, 10));
    }

    if (half) {
      query = query.eq('half', parseInt(half as string, 10));
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update half-year review
router.post('/half-year', requireAuth, async (req, res) => {
  try {
    const { year, half, goals_review, results_confirmation, below_expectations_analysis, above_expectations_analysis, how_to_replay, future_plan } = req.body;
    
    if (!year || !half) return res.status(400).json({ error: 'Year and half are required' });

    const payload = {
      user_id: req.user.id,
      year,
      half,
      goals_review,
      results_confirmation,
      below_expectations_analysis,
      above_expectations_analysis,
      how_to_replay,
      future_plan,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('half_year_reviews')
      .upsert(payload, { onConflict: 'user_id,year,half' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/half-year/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('half_year_reviews')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
