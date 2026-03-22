import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../lib/apiClient';
import type { AdminChallengeItem } from '../../types/community';

type ChallengeForm = {
  title: string;
  slug: string;
  description: string;
  icon: string;
  banner_url: string;
  duration_days: number;
  start_at: string;
  end_at: string;
  status: string;
  rules: string;
  badge_id: string;
};

const emptyForm: ChallengeForm = {
  title: '',
  slug: '',
  description: '',
  icon: '',
  banner_url: '',
  duration_days: 7,
  start_at: '',
  end_at: '',
  status: 'draft',
  rules: '{}',
  badge_id: '',
};

function ChallengeModal({
  open,
  title,
  form,
  onChange,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  title: string;
  form: ChallengeForm;
  onChange: (patch: Partial<ChallengeForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.18)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-headline text-2xl font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input value={form.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="标题" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder="slug" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.icon} onChange={(e) => onChange({ icon: e.target.value })} placeholder="icon" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.banner_url} onChange={(e) => onChange({ banner_url: e.target.value })} placeholder="banner_url" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input type="number" value={form.duration_days} onChange={(e) => onChange({ duration_days: Number(e.target.value) })} placeholder="duration_days" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <select value={form.status} onChange={(e) => onChange({ status: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="active">active</option>
            <option value="ended">ended</option>
            <option value="archived">archived</option>
          </select>
          <input type="datetime-local" value={form.start_at} onChange={(e) => onChange({ start_at: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input type="datetime-local" value={form.end_at} onChange={(e) => onChange({ end_at: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.badge_id} onChange={(e) => onChange({ badge_id: e.target.value })} placeholder="badge_id（可空）" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 md:col-span-2" />
          <textarea value={form.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="描述" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 md:col-span-2" />
          <textarea value={form.rules} onChange={(e) => onChange({ rules: e.target.value })} placeholder='rules JSON，例如 {"target":"daily_log"}' rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 md:col-span-2" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">取消</button>
          <button type="button" onClick={onSubmit} disabled={pending} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {pending ? '提交中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function toForm(item?: AdminChallengeItem | null): ChallengeForm {
  if (!item) return emptyForm;
  return {
    title: item.title ?? '',
    slug: item.slug ?? '',
    description: item.description ?? '',
    icon: item.icon ?? '',
    banner_url: item.banner_url ?? '',
    duration_days: item.duration_days ?? 7,
    start_at: item.start_at ? item.start_at.slice(0, 16) : '',
    end_at: item.end_at ? item.end_at.slice(0, 16) : '',
    status: item.status ?? 'draft',
    rules: JSON.stringify(item.rules ?? {}, null, 2),
    badge_id: item.badge_id ?? '',
  };
}

export default function AdminChallenges() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminChallengeItem | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'challenges'],
    queryFn: () => get<{ challenges: AdminChallengeItem[] }>('/api/admin/challenges'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        duration_days: Number(form.duration_days),
        rules: form.rules ? JSON.parse(form.rules) : {},
        start_at: form.start_at || null,
        end_at: form.end_at || null,
        badge_id: form.badge_id || null,
        banner_url: form.banner_url || null,
        icon: form.icon || null,
        description: form.description || null,
      };

      if (editing) {
        return put(`/api/admin/challenges/${editing.id}`, payload);
      }

      return post('/api/admin/challenges', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success('挑战已保存');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存挑战失败');
    },
  });

  const rows = useMemo(() => data?.challenges ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Admin</p>
          <h1 className="mt-2 font-headline text-3xl font-black text-slate-900">挑战管理</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setOpen(true);
          }}
          className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          新建挑战
        </button>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1.6fr)_120px_100px_120px_160px_120px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>标题</span>
          <span>状态</span>
          <span>时长</span>
          <span>参与人数</span>
          <span>创建时间</span>
          <span className="text-right">操作</span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,1.6fr)_120px_100px_120px_160px_120px] items-center gap-4 border-b border-slate-100 px-6 py-4 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{item.title}</div>
                <div className="truncate text-xs text-slate-400">{item.slug}</div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-600">{item.status}</span>
              <span className="font-semibold text-slate-600">{item.duration_days} 天</span>
              <span className="font-semibold text-slate-600">{item.participant_count}</span>
              <span className="text-slate-500">{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(item.created_at))}</span>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(item);
                    setForm(toForm(item));
                    setOpen(true);
                  }}
                  className="text-sm font-bold text-blue-600 transition hover:text-blue-700"
                >
                  编辑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ChallengeModal
        open={open}
        title={editing ? '编辑挑战' : '新建挑战'}
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => setOpen(false)}
        onSubmit={() => saveMutation.mutate()}
        pending={saveMutation.isPending}
      />
    </div>
  );
}
