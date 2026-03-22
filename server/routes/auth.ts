import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    // Also fetch profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }

    res.json({
      user,
      profile: profile || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
