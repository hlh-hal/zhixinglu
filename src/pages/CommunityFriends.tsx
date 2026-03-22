import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useDeleteFriend, useFriendRequests, useFriendSearch, useFriends, useRespondFriendRequest, useSendFriendRequest } from '../hooks/community/useFriends';
import { useAddComment, useComments, useDeleteComment, useFeed, useLike } from '../hooks/community/useFeed';
import { useLeaderboard } from '../hooks/community/useLeaderboard';
import { useAddSupervisionPartner, useConfirmPartner, useRemindPartner, useSupervisionPartners } from '../hooks/community/useSupervision';
import type { FeedActivityItem, FriendListItem } from '../types/community';

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; key?: React.Key }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_40px_100px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h3 className="font-headline text-xl font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="max-h-[calc(85vh-76px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-full bg-slate-100" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mb-2 h-4 w-full rounded-full bg-slate-100" />
      <div className="mb-2 h-4 w-4/5 rounded-full bg-slate-100" />
      <div className="h-4 w-2/3 rounded-full bg-slate-100" />
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">
      {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : name.slice(0, 1)}
    </div>
  );
}

function Comments({ activityId, currentUserId }: { activityId: string; currentUserId?: string }) {
  const { data, isLoading } = useComments(activityId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [content, setContent] = useState('');

  const submit = async () => {
    if (!content.trim()) return;
    try {
      await addComment.mutateAsync({ activityId, content });
      setContent('');
      toast.success('评论已发送');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '评论发送失败');
    }
  };

  const removeComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ activityId, commentId });
      toast.success('评论已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除评论失败');
    }
  };

  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <div className="mb-4 flex gap-3">
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的鼓励..." className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
        <button type="button" onClick={submit} disabled={addComment.isPending || !content.trim()} className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">发送</button>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-2xl bg-white" />
          <div className="h-16 rounded-2xl bg-white" />
        </div>
      ) : (data?.comments.length ?? 0) > 0 ? (
        <div className="space-y-3">
          {data!.comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Avatar name={comment.user.nickname || comment.user.username || '知'} avatarUrl={comment.user.avatar_url} />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{comment.user.nickname || comment.user.username || '匿名用户'}</div>
                    <div className="text-xs text-slate-400">{timeAgo(comment.created_at)}</div>
                  </div>
                </div>
                {currentUserId === comment.user.id ? (
                  <button type="button" onClick={() => removeComment(comment.id)} className="text-xs font-semibold text-slate-400 transition hover:text-rose-500">删除</button>
                ) : null}
              </div>
              <p className="text-sm leading-7 text-slate-600">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">还没有评论，写下第一句鼓励吧。</div>
      )}
    </div>
  );
}

function FeedCard({ activity, currentUserId }: { activity: FeedActivityItem; currentUserId?: string; key?: React.Key }) {
  const [openComments, setOpenComments] = useState(false);
  const like = useLike();

  return (
    <article className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex gap-4">
        <Avatar name={activity.actor.nickname || activity.actor.username || '知'} avatarUrl={activity.actor.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">{activity.actor.nickname || activity.actor.username || '匿名用户'}</div>
              <div className="text-xs text-slate-400">{timeAgo(activity.created_at)}</div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">{activity.activity_type}</span>
          </div>
          <p className="text-sm leading-7 text-slate-600">{activity.content || '记录了一次新的成长动态'}</p>
          {Object.keys(activity.metadata || {}).length > 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-slate-400">{key}</span>
                  <span className="text-right">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-5">
            <button type="button" onClick={() => like.mutate({ activityId: activity.id })} className={`inline-flex items-center gap-2 text-sm font-semibold transition ${activity.is_liked ? 'text-rose-500' : 'text-slate-400 hover:text-blue-600'}`}>
              <span className="material-symbols-outlined text-[20px]">favorite</span>
              {activity.like_count}
            </button>
            <button type="button" onClick={() => setOpenComments((v) => !v)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-blue-600">
              <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
              {activity.comment_count}
            </button>
          </div>
          {openComments ? <Comments activityId={activity.id} currentUserId={currentUserId} /> : null}
        </div>
      </div>
    </article>
  );
}

export default function CommunityFriends() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: feed, isLoading: loadingFeed, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed('latest');
  const { data: searchData, isFetching: searching } = useFriendSearch(keyword);
  const { data: requests } = useFriendRequests();
  const { data: friends, isLoading: loadingFriends } = useFriends();
  const { data: supervision } = useSupervisionPartners();
  const { data: leaderboard } = useLeaderboard('week', 'composite');
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const addPartner = useAddSupervisionPartner();
  const confirmPartner = useConfirmPartner();
  const remindPartner = useRemindPartner();
  const deleteFriend = useDeleteFriend();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.4 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const activities = useMemo(() => feed?.pages.flatMap((page) => page.activities) ?? [], [feed]);
  const inviteFriends = useMemo(() => (friends?.friends ?? []).filter((item) => !item.is_supervision_partner), [friends]);
  const podium = leaderboard?.leaderboard.slice(0, 3) ?? [];
  const rankList = leaderboard?.leaderboard.slice(3, 6) ?? [];

  const onSendRequest = async (addresseeId: string) => {
    try {
      await sendRequest.mutateAsync({ addressee_id: addresseeId });
      toast.success('好友申请已发送');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送好友申请失败');
    }
  };

  const onRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondRequest.mutateAsync({ id, action });
      toast.success(action === 'accept' ? '已通过好友申请' : '已拒绝好友申请');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '处理失败');
    }
  };

  const onDeleteFriend = async (id: string) => {
    try {
      await deleteFriend.mutateAsync(id);
      toast.success('已解除好友关系');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解除好友失败');
    }
  };

  const onAddPartner = async (friendId: string) => {
    try {
      await addPartner.mutateAsync({ friend_id: friendId });
      toast.success('已添加为监督伙伴');
      setInviteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加监督伙伴失败');
    }
  };

  const onConfirmPartner = async (partnerId: string) => {
    try {
      await confirmPartner.mutateAsync(partnerId);
      toast.success('已确认今日监督状态');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '确认失败');
    }
  };

  const onRemindPartner = async (partnerId: string) => {
    try {
      await remindPartner.mutateAsync(partnerId);
      toast.success('提醒已发送');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送提醒失败');
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Community Circle</p>
          <h1 className="font-headline text-4xl font-black tracking-tight text-slate-900">好友互动</h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">看见彼此的进步，提醒彼此别掉线，把孤独坚持变成互相托举。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            添加好友
          </button>
          <button type="button" onClick={() => setRequestsOpen(true)} className="relative inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
            <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
            好友申请
            {(requests?.requests.length ?? 0) > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{requests?.requests.length}</span> : null}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-black tracking-tight text-slate-900">好友动态</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">最新动态</span>
          </div>
          {loadingFeed ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : activities.length > 0 ? (
            <>
              {activities.map((activity) => <FeedCard key={activity.id} activity={activity} currentUserId={user?.id} />)}
              <div ref={sentinelRef} className="flex justify-center py-4 text-sm text-slate-400">
                {isFetchingNextPage ? '加载更多中...' : hasNextPage ? '继续向下查看更多动态' : '已经到底啦'}
              </div>
            </>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined text-3xl">dynamic_feed</span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">还没有好友动态</h3>
              <p className="text-sm leading-7 text-slate-500">还没有好友动态，添加好友看看大家的成长吧。</p>
            </div>
          )}
        </div>

        <div className="space-y-8 lg:col-span-4">
          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-headline text-xl font-black text-slate-900">我的监督伙伴</h3>
                <p className="mt-1 text-xs text-slate-400">{supervision?.current_count ?? 0} / {supervision?.max_partners ?? 10} 位</p>
              </div>
              <button type="button" onClick={() => setInviteOpen(true)} className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100">邀请好友</button>
            </div>
            <div className="space-y-4">
              {(supervision?.partners ?? []).length > 0 ? supervision!.partners.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <Avatar name={item.partner.nickname || item.partner.username || '友'} avatarUrl={item.partner.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-bold text-slate-900">{item.partner.nickname || item.partner.username || '未命名伙伴'}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.today_has_log ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{item.today_has_log ? '已打卡' : '待打卡'}</span>
                      </div>
                      <p className="mt-1 text-xs leading-6 text-slate-400">{item.today_goal || '对方今天还没有留下目标描述'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" disabled={item.today_confirmed || confirmPartner.isPending} onClick={() => onConfirmPartner(item.id)} className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${item.today_confirmed ? 'cursor-not-allowed bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{item.today_confirmed ? '今日已确认' : '确认'}</button>
                    <button type="button" disabled={item.today_reminded || remindPartner.isPending} onClick={() => onRemindPartner(item.id)} className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${item.today_reminded ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>{item.today_reminded ? '今日已提醒' : '提醒'}</button>
                  </div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">还没有监督伙伴，邀请一位好友一起坚持吧。</div>}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline text-xl font-black text-slate-900">周度排行</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">综合</span>
            </div>
            {podium.length > 0 ? (
              <>
                <div className="mb-6 flex items-end justify-center gap-4">
                  {podium.map((entry, index) => (
                    <div key={entry.user.id} className="flex flex-1 flex-col items-center">
                      <div className="mb-2"><Avatar name={entry.user.nickname || entry.user.username || '排'} avatarUrl={entry.user.avatar_url} /></div>
                      <div className="mb-2 text-center">
                        <div className="text-sm font-bold text-slate-900">{entry.user.nickname || entry.user.username}</div>
                        <div className="text-xs text-slate-400">{entry.score} 分</div>
                      </div>
                      <div className={`w-full rounded-t-2xl bg-blue-50 ${index === 0 ? 'h-24' : index === 1 ? 'h-16' : 'h-12'}`} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {rankList.map((entry) => (
                    <div key={entry.user.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${entry.user.id === user?.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold">{entry.rank}</span>
                        <span className="font-semibold">{entry.user.nickname || entry.user.username}</span>
                      </div>
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">本周还没有排行数据。</div>}
          </section>

          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-xl font-black text-slate-900">我的好友</h3>
              <span className="text-xs text-slate-400">{friends?.friends.length ?? 0} 位</span>
            </div>
            {loadingFriends ? (
              <div className="space-y-3"><div className="h-16 rounded-2xl bg-slate-100" /><div className="h-16 rounded-2xl bg-slate-100" /></div>
            ) : (friends?.friends.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {friends!.friends.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{item.friend.nickname || item.friend.username || '未命名好友'}</div>
                      <div className="text-xs text-slate-400">{item.today_has_log ? '今天已写日志' : '今天还没写日志'}</div>
                    </div>
                    <button type="button" onClick={() => onDeleteFriend(item.id)} className="text-xs font-semibold text-slate-400 transition hover:text-rose-500">解除</button>
                  </div>
                ))}
              </div>
            ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">还没有好友，先去搜索添加一个吧。</div>}
          </section>
        </div>
      </div>

      <Modal open={searchOpen} title="添加好友" onClose={() => setSearchOpen(false)}>
        <div className="space-y-5">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索用户名或昵称" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
          {searching ? (
            <div className="space-y-3"><div className="h-16 rounded-2xl bg-slate-100" /><div className="h-16 rounded-2xl bg-slate-100" /></div>
          ) : keyword.trim() ? (
            (searchData?.users.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {searchData!.users.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={item.nickname || item.username || '友'} avatarUrl={item.avatar_url} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{item.nickname || item.username || '未命名用户'}</div>
                        <div className="truncate text-xs text-slate-400">@{item.username || 'unknown'}</div>
                      </div>
                    </div>
                    {item.friendship_status === 'none' ? (
                      <button type="button" onClick={() => onSendRequest(item.id)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">添加好友</button>
                    ) : <span className={`rounded-full px-4 py-2 text-sm font-bold ${item.friendship_status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : item.friendship_status === 'pending_received' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{item.friendship_status === 'accepted' ? '已是好友' : item.friendship_status === 'pending_received' ? '待处理申请' : '已发送申请'}</span>}
                  </div>
                ))}
              </div>
            ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">没有找到相关用户。</div>
          ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">输入用户名或昵称开始搜索。</div>}
        </div>
      </Modal>

      <Modal open={requestsOpen} title="好友申请" onClose={() => setRequestsOpen(false)}>
        {(requests?.requests.length ?? 0) > 0 ? (
          <div className="space-y-4">
            {requests!.requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar name={request.requester.nickname || request.requester.username || '申'} avatarUrl={request.requester.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{request.requester.nickname || request.requester.username || '未命名用户'}</div>
                    <div className="text-xs text-slate-400">{timeAgo(request.created_at)}</div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-7 text-slate-500">{request.message || '对方想和你成为好友，一起互相监督成长。'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => onRespond(request.id, 'accept')} className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">接受</button>
                  <button type="button" onClick={() => onRespond(request.id, 'reject')} className="rounded-full bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-300">拒绝</button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">当前没有待处理的好友申请。</div>}
      </Modal>

      <Modal open={inviteOpen} title="邀请好友成为监督伙伴" onClose={() => setInviteOpen(false)}>
        {(inviteFriends.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {inviteFriends.map((friend: FriendListItem) => (
              <div key={friend.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{friend.friend.nickname || friend.friend.username || '未命名好友'}</div>
                  <div className="text-xs text-slate-400">{friend.today_has_log ? '今天已写日志' : '今天还没写日志'}</div>
                </div>
                <button type="button" onClick={() => onAddPartner(friend.friend.id)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">邀请</button>
              </div>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">没有可邀请的好友，先添加更多朋友吧。</div>}
      </Modal>
    </div>
  );
}
