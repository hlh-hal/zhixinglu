import express from 'express';
import multer from 'multer';
import path from 'path';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const defaultNotificationSettings = {
  daily_log_reminder: true,
  monthly_review_reminder: true,
  half_year_reminder: false,
  auto_save_notification: true,
  friend_supervision_reminder: true,
  challenge_checkin_reminder: true,
  leaderboard_change: false,
  badge_unlock: true,
};

function jsonError(res: express.Response, status: number, error: string, details?: string) {
  return res.status(status).json(details ? { error, details } : { error });
}

function getFileExtension(filename: string, mimeType?: string) {
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  if (ext) return ext;
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

function normalizeDateRange(dateRange?: { start?: string | null; end?: string | null }) {
  return {
    start: dateRange?.start || null,
    end: dateRange?.end || null,
  };
}

function withinRange(date: string | null | undefined, start: string | null, end: string | null) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function monthlyReviewDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function halfYearReviewDate(year: number, half: number) {
  const month = half === 1 ? '01' : '07';
  return `${year}-${month}-01`;
}

async function ensureAvatarBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((bucket) => bucket.name === 'avatars');
  if (!exists) {
    await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
    });
  }
}

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return jsonError(res, 400, '请选择图片文件');

    const userId = req.user.id as string;
    const ext = getFileExtension(req.file.originalname, req.file.mimetype);
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    await ensureAvatarBucket();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    res.json({ avatar_url: avatarUrl });
  } catch (error: any) {
    jsonError(res, 500, '头像上传失败', error.message);
  }
});

router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (userError) throw userError;

    res.json({ success: true });
  } catch (error: any) {
    jsonError(res, 500, '注销账号失败', error.message);
  }
});

router.get('/data-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;

    const [
      dailyLogsCount,
      monthlyReviewsCount,
      halfYearReviewsCount,
      challengeCheckinsCount,
      dateRangeResult,
    ] = await Promise.all([
      supabaseAdmin.from('daily_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('monthly_reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('half_year_reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('challenge_checkins').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin
        .from('daily_logs')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: true }),
    ]);

    if (dailyLogsCount.error) throw dailyLogsCount.error;
    if (monthlyReviewsCount.error) throw monthlyReviewsCount.error;
    if (halfYearReviewsCount.error) throw halfYearReviewsCount.error;
    if (challengeCheckinsCount.error) throw challengeCheckinsCount.error;
    if (dateRangeResult.error) throw dateRangeResult.error;

    const dates = (dateRangeResult.data || []).map((item) => item.date);

    res.json({
      total_daily_logs: dailyLogsCount.count || 0,
      total_monthly_reviews: monthlyReviewsCount.count || 0,
      total_half_year_reviews: halfYearReviewsCount.count || 0,
      total_challenge_checkins: challengeCheckinsCount.count || 0,
      earliest_date: dates[0] || null,
      latest_date: dates[dates.length - 1] || null,
    });
  } catch (error: any) {
    jsonError(res, 500, '获取数据统计失败', error.message);
  }
});

router.post('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;
    const {
      types = [],
      format = 'markdown',
      date_range,
    } = req.body as {
      types: string[];
      format: 'markdown' | 'json' | 'pdf';
      date_range?: { start?: string | null; end?: string | null };
    };

    const { start, end } = normalizeDateRange(date_range);
    const exportData: Record<string, unknown[]> = {};

    if (types.includes('daily_logs')) {
      let query = supabaseAdmin
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);
      const { data, error } = await query;
      if (error) throw error;
      exportData.daily_logs = data || [];
    }

    if (types.includes('monthly_reviews')) {
      const { data, error } = await supabaseAdmin
        .from('monthly_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      if (error) throw error;
      exportData.monthly_reviews = (data || []).filter((item) =>
        withinRange(monthlyReviewDate(item.year, item.month), start, end),
      );
    }

    if (types.includes('half_year_reviews')) {
      const { data, error } = await supabaseAdmin
        .from('half_year_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: true })
        .order('half', { ascending: true });
      if (error) throw error;
      exportData.half_year_reviews = (data || []).filter((item) =>
        withinRange(halfYearReviewDate(item.year, item.half), start, end),
      );
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const baseName = `zhixinglu_export_${timestamp}`;

    if (format === 'json') {
      const json = JSON.stringify(exportData, null, 2);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.json"`);
      return res.send(json);
    }

    const markdownParts: string[] = ['# 知行录数据导出', ''];

    if (Array.isArray(exportData.daily_logs) && exportData.daily_logs.length > 0) {
      markdownParts.push('## 每日日志', '');
      (exportData.daily_logs as any[]).forEach((log) => {
        markdownParts.push(`### ${log.date}`);
        markdownParts.push(`- 开心的事: ${log.happy_things || ''}`);
        markdownParts.push(`- 有意义的事: ${log.meaningful_things || ''}`);
        markdownParts.push(`- 感谢的人: ${log.grateful_people || ''}`);
        markdownParts.push(`- 需要改进: ${log.improvements || ''}`);
        markdownParts.push(`- 今日思考: ${log.thoughts || ''}`);
        markdownParts.push('');
      });
    }

    if (Array.isArray(exportData.monthly_reviews) && exportData.monthly_reviews.length > 0) {
      markdownParts.push('## 月度复盘', '');
      (exportData.monthly_reviews as any[]).forEach((review) => {
        markdownParts.push(`### ${review.year}-${String(review.month).padStart(2, '0')}`);
        markdownParts.push(`- 目标回顾: ${review.goals_review || ''}`);
        markdownParts.push(`- 结果评估: ${review.results_evaluation || ''}`);
        markdownParts.push(`- 正向分析: ${review.positive_analysis || ''}`);
        markdownParts.push(`- 负向分析: ${review.negative_analysis || ''}`);
        markdownParts.push(`- 回放模拟: ${review.replay_simulation || ''}`);
        markdownParts.push(`- 下月计划: ${review.next_month_plan || ''}`);
        markdownParts.push('');
      });
    }

    if (Array.isArray(exportData.half_year_reviews) && exportData.half_year_reviews.length > 0) {
      markdownParts.push('## 半年复盘', '');
      (exportData.half_year_reviews as any[]).forEach((review) => {
        markdownParts.push(`### ${review.year}年 ${review.half === 1 ? '上半年' : '下半年'}`);
        markdownParts.push(`- 目标回顾: ${review.goals_review || ''}`);
        markdownParts.push(`- 结果确认: ${review.results_confirmation || ''}`);
        markdownParts.push(`- 低于预期分析: ${review.below_expectations_analysis || ''}`);
        markdownParts.push(`- 超预期分析: ${review.above_expectations_analysis || ''}`);
        markdownParts.push(`- 如何重来: ${review.how_to_replay || ''}`);
        markdownParts.push(`- 后续计划: ${review.future_plan || ''}`);
        markdownParts.push('');
      });
    }

    const markdown = markdownParts.join('\n');

    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.md"`);
      return res.send(markdown);
    }

    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      res.send(pdfBuffer);
    });

    // 注册中文字体 (Bug 2 修复)
    const fontPath = path.join(process.cwd(), 'server', 'fonts', 'NotoSansSC-VariableFont_wght.ttf');
    try {
      doc.registerFont('Chinese', fontPath);
      doc.font('Chinese');
    } catch (e) {
      console.warn('中文字体加载失败，PDF 可能显示为乱码。请确保字体文件存在于:', fontPath);
    }

    doc.fontSize(20).text('知行录数据导出');
    doc.moveDown();
    markdown.split('\n').forEach((line) => {
      if (line.startsWith('# ')) {
        doc.fontSize(18).text(line.replace('# ', ''));
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.5).fontSize(16).text(line.replace('## ', ''));
      } else if (line.startsWith('### ')) {
        doc.moveDown(0.5).fontSize(14).text(line.replace('### ', ''));
      } else {
        doc.fontSize(11).text(line || ' ');
      }
    });
    doc.end();
  } catch (error: any) {
    jsonError(res, 500, '导出数据失败', error.message);
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (error: any) {
    jsonError(res, 500, '获取个人资料失败', error.message);
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;
    const { nickname, bio, avatar_url } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          nickname,
          bio,
          avatar_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, '修改个人资料失败', error.message);
  }
});

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;
    const { data, error } = await supabaseAdmin
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 如果表不存在或查询失败，返回默认值
    if (error && error.code !== 'PGRST116') {
      console.warn('Notification settings query error:', error.message);
      return res.json({
        user_id: userId,
        ...defaultNotificationSettings,
      });
    }

    res.json(
      data || {
        user_id: userId,
        ...defaultNotificationSettings,
      },
    );
  } catch (error: any) {
    // 即使全挂了也给个默认值，不报 500
    res.json({
      user_id: req.user.id,
      ...defaultNotificationSettings,
    });
  }
});

router.put('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id as string;
    const payload = req.body || {};

    const { data, error } = await supabaseAdmin
      .from('notification_settings')
      .upsert(
        {
          user_id: userId,
          ...defaultNotificationSettings,
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    jsonError(res, 500, '保存通知设置失败', error.message);
  }
});

export default router;
