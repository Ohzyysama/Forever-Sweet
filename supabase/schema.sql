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

-- comments：所有人可读、可发（无需登录，且不存昵称）
drop policy if exists comments_read   on public.comments;
drop policy if exists comments_insert on public.comments;
create policy comments_read   on public.comments for select using (true);
create policy comments_insert on public.comments for insert with check (true);

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
-- 5) 可选：示例数据（仅当 posts 表为空时插入，方便第一次打开就能看到效果）
--    不需要可整段删除，或直接跳过不执行。
-- ============================================================
insert into public.posts (title, body, featured)
select v.title, v.body, v.featured
from (values
  ('我们的第一天', E'今天是我们在一起的起点。\n\n往后的每一天，都想和你一起记录下来。', true),
  ('一次说走就走的旅行', E'周末临时起意去了海边。\n\n风很大，你笑着跑在我前面，那一刻觉得时间可以慢一点。', false)
) as v(title, body, featured)
where not exists (select 1 from public.posts limit 1);
