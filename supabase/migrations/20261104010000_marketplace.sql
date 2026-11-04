create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text not null check (char_length(trim(description)) between 1 and 300),
  parish text not null check (parish in (
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary', 'St. Ann', 'Trelawny',
    'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine'
  )),
  category text not null check (category in (
    'Food & Drink', 'Fashion', 'Art & Craft', 'Beauty', 'Home & Garden', 'Services'
  )),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text not null check (char_length(trim(description)) between 1 and 300),
  price_jmd numeric(12, 2) not null check (price_jmd > 0),
  category text not null check (category in (
    'Food & Drink', 'Fashion', 'Art & Craft', 'Beauty', 'Home & Garden', 'Services'
  )),
  image_url text check (image_url is null or image_url ~* '^https://'),
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create index vendors_parish_idx on public.vendors (parish);
create index products_vendor_id_idx on public.products (vendor_id);
create index products_category_idx on public.products (category);
create index products_created_at_idx on public.products (created_at desc);

alter table public.vendors enable row level security;
alter table public.products enable row level security;

create policy "Vendors are publicly readable"
  on public.vendors for select to anon, authenticated using (true);
create policy "Users can open their own shop"
  on public.vendors for insert to authenticated with check ((select auth.uid()) = owner_id and verified = false);
create policy "Owners can update their shop"
  on public.vendors for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners can delete their shop"
  on public.vendors for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Products are publicly readable"
  on public.products for select to anon, authenticated using (true);
create policy "Vendors can list products in their shop"
  on public.products for insert to authenticated
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = (select auth.uid())));
create policy "Vendors can update their products"
  on public.products for update to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = (select auth.uid())));
create policy "Vendors can delete their products"
  on public.products for delete to authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = (select auth.uid())));

-- "verified" is set by admins only; owners cannot grant it to themselves.
grant select on public.vendors, public.products to anon, authenticated;
grant insert (name, description, parish, category, whatsapp) on public.vendors to authenticated;
grant update (name, description, parish, category, whatsapp) on public.vendors to authenticated;
grant delete on public.vendors to authenticated;
grant insert (vendor_id, name, description, price_jmd, category, image_url, in_stock) on public.products to authenticated;
grant update (name, description, price_jmd, category, image_url, in_stock) on public.products to authenticated;
grant delete on public.products to authenticated;
