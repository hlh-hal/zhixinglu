import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get logs (supports fetching by month/year)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { year, month, fields } = req.query;
    let query = supabaseAdmin.from('daily_logs').select('*').eq('user_id', req.user.id);

    // Simplistic filtering locally or on DB
    if (year) {
       // Typically parse to date ranges, for simplicity we retrieve all and filter
       // or construct >= and <= date ranges in PostgreSQL.
       const y = parseInt(year as string);
       const m = month ? parseInt(month as string) : null;

       if (y && m) {
         const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
         const endDate = new Date(y, m, 0).toISOString().split('T')[0];
         query = query.gte('date', startDate).lte('date', endDate);
       } else if (y) {
         const startDate = new Date(y, 0, 1).toISOString().split('T')[0];
         const endDate = new Date(y, 11, 31).toISOString().split('T')[0];
         query = query.gte('date', startDate).lte('date', endDate);
       }
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    // If only specific fields requested, mock a map
    if (fields === 'date') {
      const dates = data.map(d => d.date);
      res.json(dates);
      return;
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get log by date
router.get('/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const { data, error } = await supabaseAdmin
      .from('daily_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', date)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Log not found' });
    }
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update log
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, happy_things, meaningful_things, grateful_people, improvements, thoughts } = req.body;
    
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const payload = {
      user_id: req.user.id,
      date,
      happy_things,
      meaningful_things,
      grateful_people,
      improvements,
      thoughts,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('daily_logs')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete log (by UUID or Date typically, here we do by ID for robustness)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_logs')
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
