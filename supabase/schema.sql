-- ============================================================
-- Forever Sweet · Supabase 初始化脚本
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴本文件 → Run
-- 说明：脚本可重复执行（幂等）。首次执行前请先阅读 README.md。
-- ============================================================

-- 1) 基础扩展
create extension if not exists pgcrypto;

-- 2) 数据表
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  body        text not null default '',
  images      text[] not null default '{}'::text[],
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.likes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_key    text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, user_key)
);

create index if not exists posts_created_idx  on public.posts(created_at desc);
create index if not exists posts_featured_idx on public.posts(featured) where featured;
create index if not exists comments_post_idx  on public.comments(post_id);
create index if not exists likes_post_idx     on public.likes(post_id);

-- 3) 行级安全（RLS）
alter table public.posts    enable row level security;
alter table public.comments enable row level security;
alter table public.likes    enable row level security;

-- posts：所有人可读；仅登录用户可增 / 改 / 删
drop policy if exists posts_read   on public.posts;
drop policy if exists posts_insert on public.posts;
drop policy if exists posts_update on public.posts;
drop policy if exists posts_delete on public.posts;

create policy posts_read   on public.posts for select using (true);
create policy posts_insert on public.posts for insert with check (auth.role() = 'authenticated');
create policy posts_update on public.posts for update using (auth.role() = 'authenticated');
create policy posts_delete on public.posts for delete using (auth.role() = 'authenticated');

-- comments：所有人可读、可发（无需登录，且不存昵称）；仅登录用户可删除
drop policy if exists comments_read   on public.comments;
drop policy if exists comments_insert on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_read   on public.comments for select using (true);
create policy comments_insert on public.comments for insert with check (true);
create policy comments_delete on public.comments for delete using (auth.role() = 'authenticated');

-- likes：所有人可读、可点赞 / 取消点赞
drop policy if exists likes_read   on public.likes;
drop policy if exists likes_insert on public.likes;
drop policy if exists likes_delete on public.likes;
create policy likes_read   on public.likes for select using (true);
create policy likes_insert on public.likes for insert with check (true);
create policy likes_delete on public.likes for delete using (true);

-- 4) 图片存储桶（公开可读，仅登录可上传 / 删除）
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists images_read   on storage.objects;
drop policy if exists images_insert on storage.objects;
drop policy if exists images_delete on storage.objects;
create policy images_read   on storage.objects for select using (bucket_id = 'images');
create policy images_insert on storage.objects for insert with check (bucket_id = 'images' and auth.role() = 'authenticated');
create policy images_delete on storage.objects for delete using (bucket_id = 'images' and auth.role() = 'authenticated');

-- ============================================================
-- 5) 显示名字（账户 → 帖子/评论作者）
--    幂等，可重复执行
-- ============================================================

-- 用户档案表：id = auth.users.id，display_name = 显示名字
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select using (auth.uid() = id);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

-- 给 posts / comments 增加作者字段（author_name 允许为空，避免未填作者时报错）
alter table public.posts    add column if not exists author_id   uuid;
alter table public.posts    add column if not exists author_name text default '';
alter table public.posts    alter column author_name drop not null;
alter table public.comments add column if not exists author_id   uuid;
alter table public.comments add column if not exists author_name text default '';
alter table public.comments alter column author_name drop not null;

-- 发布帖子时自动填作者
create or replace function public.set_post_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id   := auth.uid();
  new.author_name := coalesce((select display_name from public.profiles where id = auth.uid()), '');
  return new;
end $$;

drop trigger if exists trg_set_post_author on public.posts;
create trigger trg_set_post_author before insert on public.posts
  for each row execute function public.set_post_author();

-- 发评论时自动填作者（未登录评论 auth.uid() 为空 → 不显示名字）
create or replace function public.set_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id   := auth.uid();
  new.author_name := coalesce((select display_name from public.profiles where id = auth.uid()), '');
  return new;
end $$;

drop trigger if exists trg_set_comment_author on public.comments;
create trigger trg_set_comment_author before insert on public.comments
  for each row execute function public.set_comment_author();

-- 为已存在的用户补建档案
insert into public.profiles (id, display_name)
select id, coalesce(split_part(email, '@', 1), '')
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 6) 可选：示例数据（仅当 posts 表为空时插入，方便第一次打开就能看到效果）
--    不需要可整段删除，或直接跳过不执行。
-- ============================================================
insert into public.posts (title, body, featured)
select v.title, v.body, v.featured
from (values
  ('我们的第一天', E'今天是我们在一起的起点。\n\n往后的每一天，都想和你一起记录下来。', true),
  ('一次说走就走的旅行', E'周末临时起意去了海边。\n\n风很大，你笑着跑在我前面，那一刻觉得时间可以慢一点。', false)
) as v(title, body, featured)
where not exists (select 1 from public.posts limit 1);
