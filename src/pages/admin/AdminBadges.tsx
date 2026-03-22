import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, put } from '../../lib/apiClient';
import type { AdminBadgeItem } from '../../types/community';

type BadgeForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rule_type: string;
  unlock_rule: string;
  is_active: boolean;
};

const emptyForm: BadgeForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  category: 'journal',
  points: 0,
  rule_type: 'total_journals',
  unlock_rule: '{"count": 1}',
  is_active: true,
};

function BadgeModal({
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
  form: BadgeForm;
  onChange: (patch: Partial<BadgeForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.75rem] bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.18)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-headline text-2xl font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="名称" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder="slug" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.icon} onChange={(e) => onChange({ icon: e.target.value })} placeholder="icon" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <select value={form.category} onChange={(e) => onChange({ category: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
            <option value="journal">journal</option>
            <option value="community">community</option>
            <option value="special">special</option>
          </select>
          <input type="number" value={form.points} onChange={(e) => onChange({ points: Number(e.target.value) })} placeholder="积分" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <input value={form.rule_type} onChange={(e) => onChange({ rule_type: e.target.value })} placeholder="rule_type" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          <textarea value={form.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="描述" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 md:col-span-2" />
          <textarea value={form.unlock_rule} onChange={(e) => onChange({ unlock_rule: e.target.value })} placeholder='unlock_rule JSON，例如 {"value":7}' rows={5} className="rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 md:col-span-2" />
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 md:col-span-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
            是否启用
          </label>
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

function toForm(item?: AdminBadgeItem | null): BadgeForm {
  if (!item) return emptyForm;
  return {
    name: item.name ?? '',
    slug: item.slug ?? '',
    description: item.description ?? '',
    icon: item.icon ?? '',
    category: item.category ?? 'journal',
    points: item.points ?? 0,
    rule_type: item.rule_type ?? 'total_journals',
    unlock_rule: JSON.stringify(item.unlock_rule ?? {}, null, 2),
    is_active: item.is_active ?? true,
  };
}

export default function AdminBadges() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBadgeItem | null>(null);
  const [form, setForm] = useState<BadgeForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'badges'],
    queryFn: () => get<{ badges: AdminBadgeItem[] }>('/api/admin/badges'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        points: Number(form.points),
        icon: form.icon || null,
        description: form.description || null,
        unlock_rule: form.unlock_rule ? JSON.parse(form.unlock_rule) : {},
      };

      if (editing) {
        return put(`/api/admin/badges/${editing.id}`, payload);
      }

      return post('/api/admin/badges', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success('勋章已保存');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存勋章失败');
    },
  });

  const rows = useMemo(() => data?.badges ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Admin</p>
          <h1 className="mt-2 font-headline text-3xl font-black text-slate-900">勋章管理</h1>
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
          新建勋章
        </button>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[90px_minmax(0,1.4fr)_120px_90px_180px_100px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>图标</span>
          <span>名称</span>
          <span>分类</span>
          <span>积分</span>
          <span>规则</span>
          <span className="text-right">操作</span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid grid-cols-[90px_minmax(0,1.4fr)_120px_90px_180px_100px] items-center gap-4 border-b border-slate-100 px-6 py-4 text-sm last:border-b-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined">{item.icon || 'workspace_premium'}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{item.name}</div>
                <div className="truncate text-xs text-slate-400">{item.slug}</div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-600">{item.category}</span>
              <span className="font-semibold text-slate-600">{item.points}</span>
              <span className="truncate text-xs text-slate-500">{item.rule_type}</span>
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

      <BadgeModal
        open={open}
        title={editing ? '编辑勋章' : '新建勋章'}
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={() => setOpen(false)}
        onSubmit={() => saveMutation.mutate()}
        pending={saveMutation.isPending}
      />
    </div>
  );
}
