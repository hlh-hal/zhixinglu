import express from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Database error in notifications route:', error.message);
      return res.json([]); // 数据库报错时返回空列表而非 500
    }
    res.json(data || []);
  } catch (error: any) {
    console.error('Unhandled error in notifications route:', error);
    res.json([]); // 兜底返回空列表
  }
});

const markSingleRead = async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const markAllRead = async (req: express.Request, res: express.Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

router.patch('/:id/read', requireAuth, markSingleRead);
router.put('/:id/read', requireAuth, markSingleRead);
router.patch('/read-all', requireAuth, markAllRead);
router.put('/read-all', requireAuth, markAllRead);

export default router;
