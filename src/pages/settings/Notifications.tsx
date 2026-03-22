import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, put } from '../../lib/apiClient';

type NotificationSettings = {
  daily_log_reminder: boolean;
  monthly_review_reminder: boolean;
  half_year_reminder: boolean;
  auto_save_notification: boolean;
  friend_supervision_reminder: boolean;
  challenge_checkin_reminder: boolean;
  leaderboard_change: boolean;
  badge_unlock: boolean;
};

const defaultSettings: NotificationSettings = {
  daily_log_reminder: true,
  monthly_review_reminder: true,
  half_year_reminder: false,
  auto_save_notification: true,
  friend_supervision_reminder: true,
  challenge_checkin_reminder: true,
  leaderboard_change: false,
  badge_unlock: true,
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-surface-container-highest'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all ${checked ? 'right-1' : 'left-1'}`}></span>
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onToggle,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <h3 className="font-semibold text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onToggle} disabled={disabled} />
    </div>
  );
}

export default function Notifications() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationSettings | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const data = await get<NotificationSettings>('/api/settings/notifications');
        if (!active) return;
        setSettings({ ...defaultSettings, ...data });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载通知设置失败');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const updateSetting = async (key: keyof NotificationSettings) => {
    const previousValue = settings[key];
    const nextValue = !previousValue;

    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    setSavingKey(key);

    try {
      await put('/api/settings/notifications', { [key]: nextValue });
      toast.success('设置已保存', { duration: 1000 });
    } catch (error) {
      setSettings((prev) => ({ ...prev, [key]: previousValue }));
      toast.error('保存失败，请重试');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">通知设置</h1>
        <p className="text-on-surface-variant mt-2 text-lg">你的提醒习惯会即时保存，刷新页面也不会丢失</p>
      </header>

      {loading ? (
        <div className="space-y-6">
          <div className="h-52 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">edit_note</span>
              </div>
              <h2 className="text-xl font-bold font-headline">写作提醒</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10">
              <ToggleRow
                title="每日日志提醒"
                desc="在合适的时间提醒你回顾当天、记录当天。"
                checked={settings.daily_log_reminder}
                onToggle={() => updateSetting('daily_log_reminder')}
                disabled={savingKey === 'daily_log_reminder'}
              />
              <ToggleRow
                title="月度复盘提醒"
                desc="在每月收尾时提醒你完成一次深度月复盘。"
                checked={settings.monthly_review_reminder}
                onToggle={() => updateSetting('monthly_review_reminder')}
                disabled={savingKey === 'monthly_review_reminder'}
              />
              <ToggleRow
                title="半年复盘提醒"
                desc="在半年节点提醒你回头看长线目标与执行节奏。"
                checked={settings.half_year_reminder}
                onToggle={() => updateSetting('half_year_reminder')}
                disabled={savingKey === 'half_year_reminder'}
              />
              <ToggleRow
                title="自动保存提示"
                desc="当内容自动同步到云端后，给你一个轻量成功提醒。"
                checked={settings.auto_save_notification}
                onToggle={() => updateSetting('auto_save_notification')}
                disabled={savingKey === 'auto_save_notification'}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
              <h2 className="text-xl font-bold font-headline">社群提醒</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10">
              <ToggleRow
                title="好友监督提醒"
                desc="收到监督伙伴提醒、确认等消息时通知我。"
                checked={settings.friend_supervision_reminder}
                onToggle={() => updateSetting('friend_supervision_reminder')}
                disabled={savingKey === 'friend_supervision_reminder'}
              />
              <ToggleRow
                title="挑战打卡提醒"
                desc="参加中的挑战需要打卡时，及时提醒我。"
                checked={settings.challenge_checkin_reminder}
                onToggle={() => updateSetting('challenge_checkin_reminder')}
                disabled={savingKey === 'challenge_checkin_reminder'}
              />
              <ToggleRow
                title="排行榜变化提醒"
                desc="当你的榜单名次发生明显变化时通知我。"
                checked={settings.leaderboard_change}
                onToggle={() => updateSetting('leaderboard_change')}
                disabled={savingKey === 'leaderboard_change'}
              />
              <ToggleRow
                title="勋章解锁提醒"
                desc="解锁新勋章时立刻提醒我。"
                checked={settings.badge_unlock}
                onToggle={() => updateSetting('badge_unlock')}
                disabled={savingKey === 'badge_unlock'}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
