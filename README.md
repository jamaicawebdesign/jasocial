# JaSocial 🇯🇲

A Jamaica-rooted social community for sharing island life, finding your people, and connecting with home. Built with React, TypeScript, Vite, and Supabase.

## What’s here

- Responsive community feed with search, topic filters, post likes, and demo content
- Supabase email magic-link authentication
- Persistent posts and likes, with row-level security
- Profile creation when a new account is created
- Jamaican community-inspired design for desktop and mobile

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

The app runs in a read-only demo mode until connected to Supabase. To enable accounts, posting, and persistent likes:

1. Create a Supabase project.
2. In the project SQL editor, run [`supabase/migrations/20261104000000_initial_schema.sql`](supabase/migrations/20261104000000_initial_schema.sql).
3. Copy the project URL and anon/publishable key from **Project Settings → API** into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. In Supabase **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and add your production domain to the redirect URLs.
5. Restart the dev server.

Never put a Supabase service-role key in a `VITE_` variable. The browser should only use the anon/publishable key; row-level security protects user data.

## Production build

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host and configure the same two public Supabase environment variables in the host settings.

## Marketplace

The **Marketplace** tab lets members open a vendor shop (one per account), list products priced in JMD, and be contacted by buyers via WhatsApp. Filter by category, parish, or search. Run `supabase/migrations/20261104010000_marketplace.sql` after the initial migration. The `verified` badge can only be set by an admin in the Supabase dashboard.
