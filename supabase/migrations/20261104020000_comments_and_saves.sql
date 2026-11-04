create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 300),
  created_at timestamptz not null default now()
);

create table public.post_saves (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_comments_post_id_idx on public.post_comments (post_id, created_at);
create index post_comments_user_id_idx on public.post_comments (user_id);
create index post_saves_user_id_idx on public.post_saves (user_id);

alter table public.post_comments enable row level security;
alter table public.post_saves enable row level security;

create policy "Comments are publicly readable"
  on public.post_comments for select to anon, authenticated using (true);
create policy "Users can comment as themselves"
  on public.post_comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete their own comments"
  on public.post_comments for delete to authenticated using ((select auth.uid()) = user_id);

-- Saved posts are private: users only ever see their own.
create policy "Users can read their own saves"
  on public.post_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can save posts as themselves"
  on public.post_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can unsave their own saves"
  on public.post_saves for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.post_comments to anon, authenticated;
grant insert (post_id, content) on public.post_comments to authenticated;
grant delete on public.post_comments to authenticated;
grant select, delete on public.post_saves to authenticated;
grant insert (post_id) on public.post_saves to authenticated;
