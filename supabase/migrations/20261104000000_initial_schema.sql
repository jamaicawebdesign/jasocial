create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null default 'JaSocial member',
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,24}$')
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id);
create index post_likes_user_id_idx on public.post_likes (user_id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'islandfriend'));
  candidate := regexp_replace(candidate, '[^a-z0-9_]', '', 'g');
  candidate := left(candidate, 15);
  if char_length(candidate) < 3 then
    candidate := 'ja_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'JaSocial member'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select to anon, authenticated using (true);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Posts are publicly readable"
  on public.posts for select to anon, authenticated using (true);
create policy "Authenticated users can create their own posts"
  on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own posts"
  on public.posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Likes are publicly readable"
  on public.post_likes for select to anon, authenticated using (true);
create policy "Users can like posts as themselves"
  on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can remove their own likes"
  on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles, public.posts, public.post_likes to anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.post_likes to authenticated;
