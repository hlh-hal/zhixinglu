-- Supabase Schema for 知行录 (Zhi Xing Lu)
-- This script is written to be friendly to both fresh installs and
-- incremental upgrades in an existing Supabase project.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

--------------------------------------------------------------------------------
-- 0. Shared Functions
--------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security invoker;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, username)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

--------------------------------------------------------------------------------
-- 1. Profiles (扩展用户信息 + 社群权限)
--------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text,
  username citext,
  avatar_url text,
  bio text,
  role text not null default 'user' check (role in ('user', 'admin')),
  total_points integer not null default 0 check (total_points >= 0),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles
  add column if not exists username citext,
  add column if not exists role text not null default 'user',
  add column if not exists total_points integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

create unique index if not exists profiles_username_key on public.profiles (username);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_nickname_idx on public.profiles (nickname);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

--------------------------------------------------------------------------------
-- 2. Daily Logs (每日日志)
--------------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  happy_things text,
  meaningful_things text,
  grateful_people text,
  improvements text,
  thoughts text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, date desc);

alter table public.daily_logs enable row level security;

drop policy if exists "Users can view own daily logs." on public.daily_logs;
drop policy if exists "Users can insert own daily logs." on public.daily_logs;
drop policy if exists "Users can update own daily logs." on public.daily_logs;
drop policy if exists "Users can delete own daily logs." on public.daily_logs;

create policy "Users can view own daily logs."
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily logs."
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily logs."
  on public.daily_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily logs."
  on public.daily_logs for delete
  using (auth.uid() = user_id);

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 3. Monthly Reviews (月度复盘)
--------------------------------------------------------------------------------
create table if not exists public.monthly_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  goals_review text,
  results_evaluation text,
  positive_analysis text,
  negative_analysis text,
  replay_simulation text,
  next_month_plan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, year, month)
);

alter table public.monthly_reviews
  drop constraint if exists monthly_reviews_month_check;

alter table public.monthly_reviews
  add constraint monthly_reviews_month_check check (month between 1 and 12);

create index if not exists monthly_reviews_user_period_idx
  on public.monthly_reviews (user_id, year desc, month desc);

alter table public.monthly_reviews enable row level security;

drop policy if exists "Users can view own monthly reviews." on public.monthly_reviews;
drop policy if exists "Users can insert own monthly reviews." on public.monthly_reviews;
drop policy if exists "Users can update own monthly reviews." on public.monthly_reviews;
drop policy if exists "Users can delete own monthly reviews." on public.monthly_reviews;

create policy "Users can view own monthly reviews."
  on public.monthly_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own monthly reviews."
  on public.monthly_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monthly reviews."
  on public.monthly_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own monthly reviews."
  on public.monthly_reviews for delete
  using (auth.uid() = user_id);

drop trigger if exists monthly_reviews_set_updated_at on public.monthly_reviews;
create trigger monthly_reviews_set_updated_at
  before update on public.monthly_reviews
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 4. Half Year Reviews (半年复盘)
--------------------------------------------------------------------------------
create table if not exists public.half_year_reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  year integer not null,
  half integer not null check (half in (1, 2)),
  goals_review text,
  results_confirmation text,
  below_expectations_analysis text,
  above_expectations_analysis text,
  how_to_replay text,
  future_plan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, year, half)
);

alter table public.half_year_reviews
  drop constraint if exists half_year_reviews_half_check;

alter table public.half_year_reviews
  add constraint half_year_reviews_half_check check (half in (1, 2));

create index if not exists half_year_reviews_user_period_idx
  on public.half_year_reviews (user_id, year desc, half desc);

alter table public.half_year_reviews enable row level security;

drop policy if exists "Users can view own half year reviews." on public.half_year_reviews;
drop policy if exists "Users can insert own half year reviews." on public.half_year_reviews;
drop policy if exists "Users can update own half year reviews." on public.half_year_reviews;
drop policy if exists "Users can delete own half year reviews." on public.half_year_reviews;

create policy "Users can view own half year reviews."
  on public.half_year_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own half year reviews."
  on public.half_year_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own half year reviews."
  on public.half_year_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own half year reviews."
  on public.half_year_reviews for delete
  using (auth.uid() = user_id);

drop trigger if exists half_year_reviews_set_updated_at on public.half_year_reviews;
create trigger half_year_reviews_set_updated_at
  before update on public.half_year_reviews
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 5. Notifications (通知)
--------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  type text not null default 'system' check (type in ('system', 'community', 'achievement')),
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in ('system', 'community', 'achievement'));

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications." on public.notifications;
drop policy if exists "Users can update own notifications." on public.notifications;
drop policy if exists "Users can insert own notifications." on public.notifications;
drop policy if exists "Users can delete own notifications." on public.notifications;

create policy "Users can view own notifications."
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can insert own notifications."
  on public.notifications for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update own notifications."
  on public.notifications for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete own notifications."
  on public.notifications for delete
  using (auth.uid() = user_id or public.is_admin());

--------------------------------------------------------------------------------
-- 6. Friendships (好友关系 / 申请)
--------------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  requester_low uuid generated always as (least(requester_id, addressee_id)) stored,
  requester_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  request_message text,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (requester_id <> addressee_id),
  unique (requester_low, requester_high)
);

create index if not exists friendships_requester_idx
  on public.friendships (requester_id, status, created_at desc);

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status, created_at desc);

alter table public.friendships enable row level security;

drop policy if exists "Users can view related friendships" on public.friendships;
drop policy if exists "Users can create friendship requests" on public.friendships;
drop policy if exists "Addressee can respond to friendship requests" on public.friendships;
drop policy if exists "Requester can delete pending friendship requests" on public.friendships;

create policy "Users can view related friendships"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

create policy "Users can create friendship requests"
  on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and responded_by is null
    and responded_at is null
  );

create policy "Addressee can respond to friendship requests"
  on public.friendships for update
  using (auth.uid() = addressee_id or public.is_admin())
  with check (auth.uid() = addressee_id or public.is_admin());

create policy "Requester can delete pending friendship requests"
  on public.friendships for delete
  using (auth.uid() = requester_id or public.is_admin());

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 7. Supervision Partners (监督伙伴)
--------------------------------------------------------------------------------
create table if not exists public.supervision_partners (
  id uuid default gen_random_uuid() primary key,
  user_low uuid references public.profiles(id) on delete cascade not null,
  user_high uuid references public.profiles(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (user_low < user_high),
  unique (user_low, user_high)
);

create index if not exists supervision_partners_low_idx
  on public.supervision_partners (user_low, status);

create index if not exists supervision_partners_high_idx
  on public.supervision_partners (user_high, status);

create or replace function public.enforce_supervision_partner_rules()
returns trigger as $$
declare
  pair_is_friend boolean;
  low_count integer;
  high_count integer;
begin
  select exists (
    select 1
    from public.friendships
    where requester_low = new.user_low
      and requester_high = new.user_high
      and status = 'accepted'
  ) into pair_is_friend;

  if not pair_is_friend then
    raise exception 'supervision partners must be accepted friends';
  end if;

  select count(*)
  into low_count
  from public.supervision_partners
  where status = 'active'
    and (user_low = new.user_low or user_high = new.user_low)
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  select count(*)
  into high_count
  from public.supervision_partners
  where status = 'active'
    and (user_low = new.user_high or user_high = new.user_high)
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if low_count >= 10 or high_count >= 10 then
    raise exception 'each user can have at most 10 active supervision partners';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

alter table public.supervision_partners enable row level security;

drop policy if exists "Users can view related supervision partners" on public.supervision_partners;
drop policy if exists "Users can create related supervision partners" on public.supervision_partners;
drop policy if exists "Users can update related supervision partners" on public.supervision_partners;
drop policy if exists "Users can delete related supervision partners" on public.supervision_partners;

create policy "Users can view related supervision partners"
  on public.supervision_partners for select
  using (auth.uid() in (user_low, user_high));

create policy "Users can create related supervision partners"
  on public.supervision_partners for insert
  with check (auth.uid() in (user_low, user_high) or public.is_admin());

create policy "Users can update related supervision partners"
  on public.supervision_partners for update
  using (auth.uid() in (user_low, user_high) or public.is_admin())
  with check (auth.uid() in (user_low, user_high) or public.is_admin());

create policy "Users can delete related supervision partners"
  on public.supervision_partners for delete
  using (auth.uid() in (user_low, user_high) or public.is_admin());

drop trigger if exists supervision_partners_rules on public.supervision_partners;
create trigger supervision_partners_rules
  before insert or update on public.supervision_partners
  for each row execute procedure public.enforce_supervision_partner_rules();

drop trigger if exists supervision_partners_set_updated_at on public.supervision_partners;
create trigger supervision_partners_set_updated_at
  before update on public.supervision_partners
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 8. Supervision Partner Confirmations (监督确认记录)
--------------------------------------------------------------------------------
create table if not exists public.supervision_partner_confirmations (
  id uuid default gen_random_uuid() primary key,
  supervision_partner_id uuid references public.supervision_partners(id) on delete cascade not null,
  confirmer_id uuid references public.profiles(id) on delete cascade not null,
  confirmed_user_id uuid references public.profiles(id) on delete cascade not null,
  confirm_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (confirmer_id <> confirmed_user_id),
  unique (supervision_partner_id, confirmer_id, confirmed_user_id, confirm_date)
);

create index if not exists supervision_partner_confirmations_partner_date_idx
  on public.supervision_partner_confirmations (supervision_partner_id, confirm_date desc);

create index if not exists supervision_partner_confirmations_confirmed_user_idx
  on public.supervision_partner_confirmations (confirmed_user_id, confirm_date desc);

alter table public.supervision_partner_confirmations enable row level security;

drop policy if exists "Users can view related confirmations" on public.supervision_partner_confirmations;
drop policy if exists "Users can create related confirmations" on public.supervision_partner_confirmations;

create policy "Users can view related confirmations"
  on public.supervision_partner_confirmations for select
  using (
    exists (
      select 1
      from public.supervision_partners sp
      where sp.id = supervision_partner_id
        and auth.uid() in (sp.user_low, sp.user_high)
    )
  );

create policy "Users can create related confirmations"
  on public.supervision_partner_confirmations for insert
  with check (
    auth.uid() = confirmer_id
    and exists (
      select 1
      from public.supervision_partners sp
      where sp.id = supervision_partner_id
        and auth.uid() in (sp.user_low, sp.user_high)
        and confirmed_user_id in (sp.user_low, sp.user_high)
    )
  );

--------------------------------------------------------------------------------
-- 9. Badges (成就勋章定义)
--------------------------------------------------------------------------------
create table if not exists public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug citext not null unique,
  description text,
  icon text,
  category text not null check (category in ('journal', 'community', 'special')),
  points integer not null default 0 check (points >= 0),
  rule_type text not null,
  unlock_rule jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists badges_category_active_idx
  on public.badges (category, is_active);

alter table public.badges enable row level security;

drop policy if exists "Authenticated users can view active badges" on public.badges;
drop policy if exists "Admins can insert badges" on public.badges;
drop policy if exists "Admins can update badges" on public.badges;
drop policy if exists "Admins can delete badges" on public.badges;

create policy "Authenticated users can view active badges"
  on public.badges for select
  using (auth.uid() is not null and (is_active = true or public.is_admin()));

create policy "Admins can insert badges"
  on public.badges for insert
  with check (public.is_admin());

create policy "Admins can update badges"
  on public.badges for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete badges"
  on public.badges for delete
  using (public.is_admin());

drop trigger if exists badges_set_updated_at on public.badges;
create trigger badges_set_updated_at
  before update on public.badges
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 10. Challenges (挑战定义)
--------------------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug citext not null unique,
  description text,
  icon text,
  banner_url text,
  duration_days integer not null check (duration_days > 0),
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  status text not null default 'draft' check (status in ('draft', 'published', 'active', 'ended', 'archived')),
  rules jsonb not null default '{}'::jsonb,
  badge_id uuid references public.badges(id) on delete set null,
  created_by uuid references public.profiles(id) on delete restrict not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists challenges_status_period_idx
  on public.challenges (status, start_at, end_at);

alter table public.challenges enable row level security;

drop policy if exists "Authenticated users can view published challenges" on public.challenges;
drop policy if exists "Admins can insert challenges" on public.challenges;
drop policy if exists "Admins can update challenges" on public.challenges;
drop policy if exists "Admins can delete challenges" on public.challenges;

create policy "Authenticated users can view published challenges"
  on public.challenges for select
  using (
    auth.uid() is not null
    and (status in ('published', 'active', 'ended') or public.is_admin())
  );

create policy "Admins can insert challenges"
  on public.challenges for insert
  with check (public.is_admin());

create policy "Admins can update challenges"
  on public.challenges for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete challenges"
  on public.challenges for delete
  using (public.is_admin());

drop trigger if exists challenges_set_updated_at on public.challenges;
create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 11. User Challenges (用户参与挑战)
--------------------------------------------------------------------------------
create table if not exists public.user_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'active' check (status in ('active', 'completed', 'quit', 'failed')),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  total_checkins integer not null default 0 check (total_checkins >= 0),
  last_checkin_date date,
  completed_at timestamp with time zone,
  unique (user_id, challenge_id)
);

create index if not exists user_challenges_user_idx
  on public.user_challenges (user_id, status, joined_at desc);

create index if not exists user_challenges_challenge_idx
  on public.user_challenges (challenge_id, status, joined_at desc);

alter table public.user_challenges enable row level security;

drop policy if exists "Users can view own challenge participation" on public.user_challenges;
drop policy if exists "Users can join challenges" on public.user_challenges;
drop policy if exists "Users can update own challenge participation" on public.user_challenges;
drop policy if exists "Users can delete own challenge participation" on public.user_challenges;

create policy "Users can view own challenge participation"
  on public.user_challenges for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can join challenges"
  on public.user_challenges for insert
  with check (auth.uid() = user_id);

create policy "Users can update own challenge participation"
  on public.user_challenges for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete own challenge participation"
  on public.user_challenges for delete
  using (auth.uid() = user_id or public.is_admin());

--------------------------------------------------------------------------------
-- 12. Challenge Checkins (挑战打卡)
--------------------------------------------------------------------------------
create table if not exists public.challenge_checkins (
  id uuid default gen_random_uuid() primary key,
  user_challenge_id uuid references public.user_challenges(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  checkin_date date not null default current_date,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_challenge_id, checkin_date)
);

create index if not exists challenge_checkins_user_date_idx
  on public.challenge_checkins (user_id, checkin_date desc);

create index if not exists challenge_checkins_challenge_date_idx
  on public.challenge_checkins (challenge_id, checkin_date desc);

alter table public.challenge_checkins enable row level security;

drop policy if exists "Users can view own challenge checkins" on public.challenge_checkins;
drop policy if exists "Users can create own challenge checkins" on public.challenge_checkins;
drop policy if exists "Users can update own challenge checkins" on public.challenge_checkins;
drop policy if exists "Users can delete own challenge checkins" on public.challenge_checkins;

create policy "Users can view own challenge checkins"
  on public.challenge_checkins for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can create own challenge checkins"
  on public.challenge_checkins for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can update own challenge checkins"
  on public.challenge_checkins for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete own challenge checkins"
  on public.challenge_checkins for delete
  using (auth.uid() = user_id or public.is_admin());

create or replace function public.update_user_challenge_streaks()
returns trigger as $$
declare
  v_last_date date;
begin
  select last_checkin_date
  into v_last_date
  from public.user_challenges
  where id = new.user_challenge_id;

  update public.user_challenges
  set
    current_streak = case
      when v_last_date = new.checkin_date - 1 then current_streak + 1
      when v_last_date = new.checkin_date then current_streak
      else 1
    end,
    total_checkins = total_checkins + 1,
    last_checkin_date = new.checkin_date,
    longest_streak = greatest(
      longest_streak,
      case
        when v_last_date = new.checkin_date - 1 then current_streak + 1
        when v_last_date = new.checkin_date then current_streak
        else 1
      end
    )
  where id = new.user_challenge_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists challenge_checkins_update_streaks on public.challenge_checkins;
create trigger challenge_checkins_update_streaks
  after insert on public.challenge_checkins
  for each row execute procedure public.update_user_challenge_streaks();

--------------------------------------------------------------------------------
-- 13. User Badges (用户获得勋章)
--------------------------------------------------------------------------------
create table if not exists public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  awarded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  awarded_by uuid references public.profiles(id) on delete set null,
  source_type text not null default 'system' check (source_type in ('system', 'admin', 'challenge', 'manual')),
  source_id uuid,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  unique (user_id, badge_id)
);

create index if not exists user_badges_user_awarded_idx
  on public.user_badges (user_id, awarded_at desc);

alter table public.user_badges enable row level security;

drop policy if exists "Users can view own badges" on public.user_badges;
drop policy if exists "Admins can award badges" on public.user_badges;
drop policy if exists "Admins can update user badges" on public.user_badges;
drop policy if exists "Admins can delete user badges" on public.user_badges;

create policy "Users can view own badges"
  on public.user_badges for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins can award badges"
  on public.user_badges for insert
  with check (public.is_admin());

create policy "Admins can update user badges"
  on public.user_badges for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete user badges"
  on public.user_badges for delete
  using (public.is_admin());

create or replace function public.apply_user_badge_points()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set total_points = total_points + new.points_awarded
    where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
    set total_points = greatest(0, total_points - old.points_awarded)
    where id = old.user_id;
    return old;
  end if;

  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists user_badges_apply_points_insert on public.user_badges;
create trigger user_badges_apply_points_insert
  after insert on public.user_badges
  for each row execute procedure public.apply_user_badge_points();

drop trigger if exists user_badges_apply_points_delete on public.user_badges;
create trigger user_badges_apply_points_delete
  after delete on public.user_badges
  for each row execute procedure public.apply_user_badge_points();

--------------------------------------------------------------------------------
-- 14. Activities (动态信息流)
--------------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null check (
    activity_type in (
      'daily_log_created',
      'monthly_review_created',
      'half_year_review_created',
      'challenge_joined',
      'challenge_checked_in',
      'badge_awarded',
      'friend_joined'
    )
  ),
  source_type text not null check (
    source_type in (
      'daily_log',
      'monthly_review',
      'half_year_review',
      'challenge',
      'challenge_checkin',
      'badge',
      'system'
    )
  ),
  source_id uuid,
  visibility text not null default 'friends' check (visibility in ('friends', 'public', 'private')),
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists activities_actor_created_idx
  on public.activities (actor_id, created_at desc);

create index if not exists activities_visibility_created_idx
  on public.activities (visibility, created_at desc);

alter table public.activities enable row level security;

drop policy if exists "Users can view visible activities" on public.activities;
drop policy if exists "Users can create own activities" on public.activities;
drop policy if exists "Users can update own activities" on public.activities;
drop policy if exists "Users can delete own activities" on public.activities;

create policy "Users can view visible activities"
  on public.activities for select
  using (
    actor_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'friends'
      and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and f.requester_low = least(actor_id, auth.uid())
          and f.requester_high = greatest(actor_id, auth.uid())
      )
    )
    or public.is_admin()
  );

create policy "Users can create own activities"
  on public.activities for insert
  with check (auth.uid() = actor_id or public.is_admin());

create policy "Users can update own activities"
  on public.activities for update
  using (auth.uid() = actor_id or public.is_admin())
  with check (auth.uid() = actor_id or public.is_admin());

create policy "Users can delete own activities"
  on public.activities for delete
  using (auth.uid() = actor_id or public.is_admin());

--------------------------------------------------------------------------------
-- 15. Activity Likes (动态点赞)
--------------------------------------------------------------------------------
create table if not exists public.activity_likes (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (activity_id, user_id)
);

create index if not exists activity_likes_activity_idx
  on public.activity_likes (activity_id, created_at desc);

alter table public.activity_likes enable row level security;

drop policy if exists "Users can view accessible activity likes" on public.activity_likes;
drop policy if exists "Users can like accessible activities" on public.activity_likes;
drop policy if exists "Users can unlike own likes" on public.activity_likes;

create policy "Users can view accessible activity likes"
  on public.activity_likes for select
  using (
    exists (
      select 1
      from public.activities a
      where a.id = activity_id
        and (
          a.actor_id = auth.uid()
          or a.visibility = 'public'
          or (
            a.visibility = 'friends'
            and exists (
              select 1
              from public.friendships f
              where f.status = 'accepted'
                and f.requester_low = least(a.actor_id, auth.uid())
                and f.requester_high = greatest(a.actor_id, auth.uid())
            )
          )
          or public.is_admin()
        )
    )
  );

create policy "Users can like accessible activities"
  on public.activity_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike own likes"
  on public.activity_likes for delete
  using (auth.uid() = user_id or public.is_admin());

--------------------------------------------------------------------------------
-- 16. Activity Comments (动态评论)
--------------------------------------------------------------------------------
create table if not exists public.activity_comments (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_comment_id uuid references public.activity_comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists activity_comments_activity_idx
  on public.activity_comments (activity_id, created_at asc);

create index if not exists activity_comments_user_idx
  on public.activity_comments (user_id, created_at desc);

alter table public.activity_comments enable row level security;

drop policy if exists "Users can view accessible activity comments" on public.activity_comments;
drop policy if exists "Users can comment on accessible activities" on public.activity_comments;
drop policy if exists "Users can update own comments" on public.activity_comments;
drop policy if exists "Users can delete own comments" on public.activity_comments;

create policy "Users can view accessible activity comments"
  on public.activity_comments for select
  using (
    exists (
      select 1
      from public.activities a
      where a.id = activity_id
        and (
          a.actor_id = auth.uid()
          or a.visibility = 'public'
          or (
            a.visibility = 'friends'
            and exists (
              select 1
              from public.friendships f
              where f.status = 'accepted'
                and f.requester_low = least(a.actor_id, auth.uid())
                and f.requester_high = greatest(a.actor_id, auth.uid())
            )
          )
          or public.is_admin()
        )
    )
  );

create policy "Users can comment on accessible activities"
  on public.activity_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.activity_comments for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete own comments"
  on public.activity_comments for delete
  using (auth.uid() = user_id or public.is_admin());

drop trigger if exists activity_comments_set_updated_at on public.activity_comments;
create trigger activity_comments_set_updated_at
  before update on public.activity_comments
  for each row execute procedure public.set_updated_at();

--------------------------------------------------------------------------------
-- 17. Leaderboard Snapshots (排行榜快照)
--------------------------------------------------------------------------------
create table if not exists public.leaderboard_snapshots (
  id uuid default gen_random_uuid() primary key,
  period_type text not null check (period_type in ('week', 'month', 'all_time')),
  period_start date not null,
  period_end date,
  metric_type text not null check (metric_type in ('journal_count', 'challenge_streak', 'achievement_points', 'composite')),
  user_id uuid references public.profiles(id) on delete cascade not null,
  score numeric(12, 2) not null default 0,
  rank integer not null check (rank > 0),
  rank_delta integer not null default 0,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (period_type, period_start, metric_type, user_id)
);

create index if not exists leaderboard_snapshots_period_idx
  on public.leaderboard_snapshots (period_type, period_start desc, metric_type, rank);

create index if not exists leaderboard_snapshots_user_idx
  on public.leaderboard_snapshots (user_id, metric_type, period_start desc);

alter table public.leaderboard_snapshots enable row level security;

drop policy if exists "Authenticated users can view leaderboard snapshots" on public.leaderboard_snapshots;
drop policy if exists "Admins can insert leaderboard snapshots" on public.leaderboard_snapshots;
drop policy if exists "Admins can update leaderboard snapshots" on public.leaderboard_snapshots;
drop policy if exists "Admins can delete leaderboard snapshots" on public.leaderboard_snapshots;

create policy "Authenticated users can view leaderboard snapshots"
  on public.leaderboard_snapshots for select
  using (auth.uid() is not null);

create policy "Admins can insert leaderboard snapshots"
  on public.leaderboard_snapshots for insert
  with check (public.is_admin());

create policy "Admins can update leaderboard snapshots"
  on public.leaderboard_snapshots for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete leaderboard snapshots"
  on public.leaderboard_snapshots for delete
  using (public.is_admin());

--------------------------------------------------------------------------------
-- 18. Auth Trigger for New User Profile
--------------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--------------------------------------------------------------------------------
-- 19. Schema Improvements (Incremental Migration)
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- 19.1 Notifications Extension
--------------------------------------------------------------------------------
alter table public.notifications
  add column if not exists sender_id uuid references public.profiles(id) on delete set null,
  add column if not exists related_type text,
  add column if not exists related_id uuid,
  add column if not exists action_url text;

update public.notifications
set type = 'system'
where type not in (
  'system',
  'friend_request',
  'friend_accepted',
  'supervision_remind',
  'challenge_invite',
  'achievement',
  'activity_like',
  'activity_comment'
);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'system',
      'friend_request',
      'friend_accepted',
      'supervision_remind',
      'challenge_invite',
      'achievement',
      'activity_like',
      'activity_comment'
    )
  );

create index if not exists notifications_sender_idx
  on public.notifications (sender_id, created_at desc);

create index if not exists notifications_related_idx
  on public.notifications (related_type, related_id);

drop policy if exists "Users can insert own notifications." on public.notifications;

create policy "Users can insert own notifications."
  on public.notifications for insert
  with check (
    auth.uid() = user_id
    or auth.uid() = sender_id
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 19.2 Friend Helper Function + Friendships Delete Policy
--------------------------------------------------------------------------------
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    user_a is not null
    and user_b is not null
    and user_a <> user_b
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and f.requester_low = least(user_a, user_b)
        and f.requester_high = greatest(user_a, user_b)
    );
$$;

drop policy if exists "Requester can delete pending friendship requests" on public.friendships;
drop policy if exists "Both sides can delete friendships" on public.friendships;

create policy "Both sides can delete friendships"
  on public.friendships for delete
  using (
    auth.uid() in (requester_id, addressee_id)
    or public.is_admin()
  );

--------------------------------------------------------------------------------
-- 19.3 Activities Counter Cache
--------------------------------------------------------------------------------
alter table public.activities
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0;

update public.activities a
set
  like_count = (
    select count(*)
    from public.activity_likes al
    where al.activity_id = a.id
  ),
  comment_count = (
    select count(*)
    from public.activity_comments ac
    where ac.activity_id = a.id
  );

create or replace function public.refresh_activity_counts(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.activities
  set
    like_count = (
      select count(*)
      from public.activity_likes
      where activity_id = p_activity_id
    ),
    comment_count = (
      select count(*)
      from public.activity_comments
      where activity_id = p_activity_id
    )
  where id = p_activity_id;
end;
$$;

create or replace function public.handle_activity_like_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_activity_counts(coalesce(new.activity_id, old.activity_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.handle_activity_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_activity_counts(coalesce(new.activity_id, old.activity_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists activity_likes_refresh_counts on public.activity_likes;
create trigger activity_likes_refresh_counts
  after insert or delete on public.activity_likes
  for each row execute procedure public.handle_activity_like_counts();

drop trigger if exists activity_comments_refresh_counts on public.activity_comments;
create trigger activity_comments_refresh_counts
  after insert or delete on public.activity_comments
  for each row execute procedure public.handle_activity_comment_counts();

--------------------------------------------------------------------------------
-- 19.4 Profiles Aggregate Stats
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists total_journals integer not null default 0,
  add column if not exists friend_count integer not null default 0,
  add column if not exists badge_count integer not null default 0;

create or replace function public.refresh_profile_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_journals integer := 0;
  v_longest_streak integer := 0;
  v_current_streak integer := 0;
  v_latest_log_date date;
begin
  if p_user_id is null then
    return;
  end if;

  select count(*), max(date)
  into v_total_journals, v_latest_log_date
  from public.daily_logs
  where user_id = p_user_id;

  if v_latest_log_date is not null then
    with ordered_dates as (
      select date, row_number() over (order by date) as rn
      from (
        select distinct date
        from public.daily_logs
        where user_id = p_user_id
      ) distinct_dates
    ),
    grouped_dates as (
      select date, date - rn::integer as grp
      from ordered_dates
    )
    select coalesce(max(group_size), 0)
    into v_longest_streak
    from (
      select count(*) as group_size
      from grouped_dates
      group by grp
    ) streak_groups;

    if v_latest_log_date >= current_date - 1 then
      with ordered_desc_dates as (
        select date, row_number() over (order by date desc) as rn
        from (
          select distinct date
          from public.daily_logs
          where user_id = p_user_id
        ) distinct_dates
      )
      select count(*)
      into v_current_streak
      from ordered_desc_dates
      where date = v_latest_log_date - (rn - 1)::integer;
    end if;
  end if;

  update public.profiles
  set
    current_streak = coalesce(v_current_streak, 0),
    longest_streak = coalesce(v_longest_streak, 0),
    total_journals = coalesce(v_total_journals, 0),
    friend_count = (
      select count(*)
      from public.friendships
      where status = 'accepted'
        and p_user_id in (requester_id, addressee_id)
    ),
    badge_count = (
      select count(*)
      from public.user_badges
      where user_id = p_user_id
    )
  where id = p_user_id;
end;
$$;

create or replace function public.handle_daily_logs_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_stats(old.user_id);
    return old;
  end if;

  perform public.refresh_profile_stats(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_profile_stats(old.user_id);
  end if;

  return new;
end;
$$;

create or replace function public.handle_friendships_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_profile_stats(coalesce(new.requester_id, old.requester_id));
  perform public.refresh_profile_stats(coalesce(new.addressee_id, old.addressee_id));

  if tg_op = 'UPDATE' then
    if old.requester_id is distinct from new.requester_id then
      perform public.refresh_profile_stats(old.requester_id);
    end if;

    if old.addressee_id is distinct from new.addressee_id then
      perform public.refresh_profile_stats(old.addressee_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_user_badges_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_profile_stats(coalesce(new.user_id, old.user_id));

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_profile_stats(old.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists daily_logs_refresh_profile_stats on public.daily_logs;
create trigger daily_logs_refresh_profile_stats
  after insert or update or delete on public.daily_logs
  for each row execute procedure public.handle_daily_logs_profile_stats();

drop trigger if exists friendships_refresh_profile_stats on public.friendships;
create trigger friendships_refresh_profile_stats
  after insert or update or delete on public.friendships
  for each row execute procedure public.handle_friendships_profile_stats();

drop trigger if exists user_badges_refresh_profile_stats on public.user_badges;
create trigger user_badges_refresh_profile_stats
  after insert or update or delete on public.user_badges
  for each row execute procedure public.handle_user_badges_profile_stats();

--------------------------------------------------------------------------------
-- 19.5 Badge Awarding and Unlock Functions
--------------------------------------------------------------------------------
create or replace function public.award_badge_to_user(
  p_user_id uuid,
  p_badge_id uuid,
  p_source_type text default 'system',
  p_source_id uuid default null,
  p_awarded_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge public.badges%rowtype;
  v_awarded_badge_id uuid;
begin
  if p_user_id is null or p_badge_id is null then
    return false;
  end if;

  select *
  into v_badge
  from public.badges
  where id = p_badge_id
    and is_active = true;

  if not found then
    return false;
  end if;

  insert into public.user_badges (
    user_id,
    badge_id,
    awarded_by,
    source_type,
    source_id,
    points_awarded
  )
  values (
    p_user_id,
    v_badge.id,
    p_awarded_by,
    p_source_type,
    p_source_id,
    v_badge.points
  )
  on conflict (user_id, badge_id) do nothing
  returning id into v_awarded_badge_id;

  if v_awarded_badge_id is null then
    return false;
  end if;

  insert into public.activities (
    actor_id,
    activity_type,
    source_type,
    source_id,
    visibility,
    content,
    metadata
  )
  values (
    p_user_id,
    'badge_awarded',
    'badge',
    v_badge.id,
    'friends',
    '获得了勋章：' || v_badge.name,
    jsonb_build_object(
      'badge_id', v_badge.id,
      'badge_name', v_badge.name,
      'badge_icon', v_badge.icon,
      'points', v_badge.points
    )
  );

  insert into public.notifications (
    user_id,
    sender_id,
    title,
    content,
    type,
    related_type,
    related_id,
    action_url
  )
  values (
    p_user_id,
    p_awarded_by,
    '解锁新勋章',
    '你已解锁勋章：' || v_badge.name,
    'achievement',
    'badge',
    v_badge.id,
    '/community/achievements'
  );

  return true;
end;
$$;

create or replace function public.check_and_unlock_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge record;
  v_target integer;
  v_actual integer;
begin
  if p_user_id is null then
    return;
  end if;

  perform public.refresh_profile_stats(p_user_id);

  for v_badge in
    select *
    from public.badges
    where is_active = true
      and rule_type in (
        'consecutive_journals',
        'total_journals',
        'challenges_completed',
        'total_likes_given',
        'friends_count',
        'total_comments'
      )
      and not exists (
        select 1
        from public.user_badges ub
        where ub.user_id = p_user_id
          and ub.badge_id = badges.id
      )
  loop
    v_target := coalesce(
      nullif(v_badge.unlock_rule ->> 'value', '')::integer,
      nullif(v_badge.unlock_rule ->> 'count', '')::integer,
      nullif(v_badge.unlock_rule ->> 'days', '')::integer,
      0
    );

    v_actual := 0;

    case v_badge.rule_type
      when 'consecutive_journals' then
        select current_streak into v_actual
        from public.profiles
        where id = p_user_id;
      when 'total_journals' then
        select total_journals into v_actual
        from public.profiles
        where id = p_user_id;
      when 'challenges_completed' then
        select count(*) into v_actual
        from public.user_challenges
        where user_id = p_user_id
          and status = 'completed';
      when 'total_likes_given' then
        select count(*) into v_actual
        from public.activity_likes
        where user_id = p_user_id;
      when 'friends_count' then
        select friend_count into v_actual
        from public.profiles
        where id = p_user_id;
      when 'total_comments' then
        select count(*) into v_actual
        from public.activity_comments
        where user_id = p_user_id;
      else
        v_actual := 0;
    end case;

    if coalesce(v_actual, 0) >= v_target and v_target > 0 then
      perform public.award_badge_to_user(
        p_user_id,
        v_badge.id,
        'system',
        null,
        null
      );
    end if;
  end loop;
end;
$$;

--------------------------------------------------------------------------------
-- 19.6 Activity Feed RLS Simplification
--------------------------------------------------------------------------------
drop policy if exists "Users can view visible activities" on public.activities;

create policy "Users can view visible activities"
  on public.activities for select
  using (
    actor_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'friends' and public.are_friends(actor_id, auth.uid()))
    or public.is_admin()
  );

drop policy if exists "Users can view accessible activity likes" on public.activity_likes;

create policy "Users can view accessible activity likes"
  on public.activity_likes for select
  using (
    exists (
      select 1
      from public.activities a
      where a.id = activity_id
        and (
          a.actor_id = auth.uid()
          or a.visibility = 'public'
          or (a.visibility = 'friends' and public.are_friends(a.actor_id, auth.uid()))
          or public.is_admin()
        )
    )
  );

drop policy if exists "Users can view accessible activity comments" on public.activity_comments;

create policy "Users can view accessible activity comments"
  on public.activity_comments for select
  using (
    exists (
      select 1
      from public.activities a
      where a.id = activity_id
        and (
          a.actor_id = auth.uid()
          or a.visibility = 'public'
          or (a.visibility = 'friends' and public.are_friends(a.actor_id, auth.uid()))
          or public.is_admin()
        )
    )
  );

--------------------------------------------------------------------------------
-- 19.7 Triggered Activities + Badge Checks
--------------------------------------------------------------------------------
create or replace function public.handle_daily_log_insert_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_profile_stats(new.user_id);

  insert into public.activities (
    actor_id,
    activity_type,
    source_type,
    source_id,
    visibility,
    content,
    metadata
  )
  values (
    new.user_id,
    'daily_log_created',
    'daily_log',
    new.id,
    'friends',
    '完成了今日日志',
    jsonb_build_object('date', new.date)
  );

  perform public.check_and_unlock_badges(new.user_id);

  return new;
end;
$$;

create or replace function public.handle_challenge_checkin_insert_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge_title text;
begin
  select title
  into v_challenge_title
  from public.challenges
  where id = new.challenge_id;

  insert into public.activities (
    actor_id,
    activity_type,
    source_type,
    source_id,
    visibility,
    content,
    metadata
  )
  values (
    new.user_id,
    'challenge_checked_in',
    'challenge_checkin',
    new.id,
    'friends',
    '完成了挑战打卡',
    jsonb_build_object(
      'challenge_id', new.challenge_id,
      'challenge_title', v_challenge_title,
      'checkin_date', new.checkin_date
    )
  );

  perform public.check_and_unlock_badges(new.user_id);

  return new;
end;
$$;

create or replace function public.handle_friendship_badge_checks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_profile_stats(coalesce(new.requester_id, old.requester_id));
  perform public.refresh_profile_stats(coalesce(new.addressee_id, old.addressee_id));

  if coalesce(new.status, old.status) = 'accepted' then
    perform public.check_and_unlock_badges(coalesce(new.requester_id, old.requester_id));
    perform public.check_and_unlock_badges(coalesce(new.addressee_id, old.addressee_id));
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_activity_like_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_unlock_badges(new.user_id);
  return new;
end;
$$;

create or replace function public.handle_activity_comment_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_unlock_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists daily_logs_after_insert_side_effects on public.daily_logs;
create trigger daily_logs_after_insert_side_effects
  after insert on public.daily_logs
  for each row execute procedure public.handle_daily_log_insert_side_effects();

drop trigger if exists challenge_checkins_after_insert_side_effects on public.challenge_checkins;
create trigger challenge_checkins_after_insert_side_effects
  after insert on public.challenge_checkins
  for each row execute procedure public.handle_challenge_checkin_insert_side_effects();

drop trigger if exists friendships_badge_checks on public.friendships;
create trigger friendships_badge_checks
  after insert or update on public.friendships
  for each row execute procedure public.handle_friendship_badge_checks();

drop trigger if exists activity_likes_badge_checks on public.activity_likes;
create trigger activity_likes_badge_checks
  after insert on public.activity_likes
  for each row execute procedure public.handle_activity_like_badges();

drop trigger if exists activity_comments_badge_checks on public.activity_comments;
create trigger activity_comments_badge_checks
  after insert on public.activity_comments
  for each row execute procedure public.handle_activity_comment_badges();

--------------------------------------------------------------------------------
-- 19.8 Supervision Reminders
--------------------------------------------------------------------------------
create table if not exists public.supervision_reminders (
  id uuid default gen_random_uuid() primary key,
  supervision_partner_id uuid references public.supervision_partners(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  reminder_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (sender_id <> receiver_id),
  unique (supervision_partner_id, reminder_date)
);

create index if not exists supervision_reminders_sender_idx
  on public.supervision_reminders (sender_id, reminder_date desc);

create index if not exists supervision_reminders_receiver_idx
  on public.supervision_reminders (receiver_id, reminder_date desc);

alter table public.supervision_reminders enable row level security;

drop policy if exists "Users can view related supervision reminders" on public.supervision_reminders;
drop policy if exists "Users can create related supervision reminders" on public.supervision_reminders;
drop policy if exists "Users can delete own supervision reminders" on public.supervision_reminders;

create policy "Users can view related supervision reminders"
  on public.supervision_reminders for select
  using (
    auth.uid() in (sender_id, receiver_id)
    or public.is_admin()
  );

create policy "Users can create related supervision reminders"
  on public.supervision_reminders for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.supervision_partners sp
      where sp.id = supervision_partner_id
        and sp.status = 'active'
        and sender_id in (sp.user_low, sp.user_high)
        and receiver_id in (sp.user_low, sp.user_high)
    )
  );

create policy "Users can delete own supervision reminders"
  on public.supervision_reminders for delete
  using (auth.uid() = sender_id or public.is_admin());

--------------------------------------------------------------------------------
-- 19.9 Management Functions
--------------------------------------------------------------------------------
create or replace function public.generate_leaderboard_snapshot(
  p_period_type text default 'week',
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date;
  v_period_end date;
begin
  if p_period_type = 'week' then
    v_period_start := date_trunc('week', p_reference_date::timestamp)::date;
    v_period_end := v_period_start + 6;
  elsif p_period_type = 'month' then
    v_period_start := date_trunc('month', p_reference_date::timestamp)::date;
    v_period_end := (date_trunc('month', p_reference_date::timestamp) + interval '1 month - 1 day')::date;
  elsif p_period_type = 'all_time' then
    v_period_start := date '1970-01-01';
    v_period_end := p_reference_date;
  else
    raise exception 'unsupported period_type: %', p_period_type;
  end if;

  delete from public.leaderboard_snapshots
  where period_type = p_period_type
    and period_start = v_period_start;

  with user_stats as (
    select
      p.id as user_id,
      coalesce((
        select count(*)
        from public.daily_logs dl
        where dl.user_id = p.id
          and dl.date between v_period_start and v_period_end
      ), 0) as journal_count,
      coalesce((
        select max(uc.current_streak)
        from public.user_challenges uc
        where uc.user_id = p.id
      ), 0) as challenge_streak,
      coalesce(p.total_points, 0) as achievement_points
    from public.profiles p
  ),
  metric_rows as (
    select p_period_type as period_type, v_period_start as period_start, v_period_end as period_end,
      'journal_count'::text as metric_type, user_id, journal_count::numeric as score,
      jsonb_build_object('journal_count', journal_count) as stats
    from user_stats
    union all
    select p_period_type, v_period_start, v_period_end,
      'challenge_streak', user_id, challenge_streak::numeric,
      jsonb_build_object('challenge_streak', challenge_streak)
    from user_stats
    union all
    select p_period_type, v_period_start, v_period_end,
      'achievement_points', user_id, achievement_points::numeric,
      jsonb_build_object('achievement_points', achievement_points)
    from user_stats
    union all
    select p_period_type, v_period_start, v_period_end,
      'composite', user_id,
      (journal_count * 10 + challenge_streak * 5 + achievement_points)::numeric,
      jsonb_build_object(
        'journal_count', journal_count,
        'challenge_streak', challenge_streak,
        'achievement_points', achievement_points
      )
    from user_stats
  ),
  ranked_rows as (
    select
      period_type,
      period_start,
      period_end,
      metric_type,
      user_id,
      score,
      rank() over (partition by metric_type order by score desc, user_id asc) as rank,
      stats
    from metric_rows
  ),
  previous_ranks as (
    select distinct on (metric_type, user_id)
      metric_type,
      user_id,
      rank
    from public.leaderboard_snapshots
    where period_type = p_period_type
      and period_start < v_period_start
    order by metric_type, user_id, period_start desc, created_at desc
  )
  insert into public.leaderboard_snapshots (
    period_type,
    period_start,
    period_end,
    metric_type,
    user_id,
    score,
    rank,
    rank_delta,
    stats
  )
  select
    r.period_type,
    r.period_start,
    r.period_end,
    r.metric_type,
    r.user_id,
    r.score,
    r.rank,
    coalesce(pr.rank - r.rank, 0),
    r.stats
  from ranked_rows r
  left join previous_ranks pr
    on pr.metric_type = r.metric_type
   and pr.user_id = r.user_id;
end;
$$;

create or replace function public.auto_update_challenge_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  update public.challenges
  set status = 'active'
  where status in ('published', 'draft')
    and start_at is not null
    and start_at <= timezone('utc'::text, now())
    and (end_at is null or end_at >= timezone('utc'::text, now()));

  update public.challenges
  set status = 'ended'
  where status in ('published', 'active')
    and end_at is not null
    and end_at < timezone('utc'::text, now());

  update public.user_challenges uc
  set
    status = 'completed',
    completed_at = coalesce(uc.completed_at, timezone('utc'::text, now()))
  from public.challenges c
  where uc.challenge_id = c.id
    and uc.status = 'active'
    and uc.total_checkins >= c.duration_days;

  update public.user_challenges uc
  set status = 'failed'
  from public.challenges c
  where uc.challenge_id = c.id
    and uc.status = 'active'
    and c.status = 'ended'
    and uc.total_checkins < c.duration_days;

  for v_user in
    select distinct user_id
    from public.user_challenges
    where status = 'completed'
  loop
    perform public.check_and_unlock_badges(v_user.user_id);
  end loop;
end;
$$;

--------------------------------------------------------------------------------
-- 20. Settings Support
--------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create table if not exists public.notification_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  daily_log_reminder boolean not null default true,
  monthly_review_reminder boolean not null default true,
  half_year_reminder boolean not null default false,
  auto_save_notification boolean not null default true,
  friend_supervision_reminder boolean not null default true,
  challenge_checkin_reminder boolean not null default true,
  leaderboard_change boolean not null default false,
  badge_unlock boolean not null default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notification_settings enable row level security;

drop policy if exists "Users can view own notification settings" on public.notification_settings;
create policy "Users can view own notification settings"
  on public.notification_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification settings" on public.notification_settings;
create policy "Users can insert own notification settings"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification settings" on public.notification_settings;
create policy "Users can update own notification settings"
  on public.notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute procedure public.set_updated_at();
