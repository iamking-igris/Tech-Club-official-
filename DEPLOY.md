# Tech Club Identity — Deploy & Supabase

## 1. Create Supabase project
1. https://supabase.com → New project
2. SQL Editor → paste and run `supabase/schema.sql`
3. Project Settings → API → copy **Project URL** and **anon public** key

## 2. Configure the app
```bash
cp .env.example .env
# edit .env with your URL and anon key
```

No auth is used. RLS policies in `schema.sql` allow open read/write for this internal tool.
Tighten policies later if the URL becomes public.

## 3. Run locally
```bash
npm install
npm run dev
```

## 4. Host online (Vercel)
```bash
npm i -g vercel
vercel
```
Add env vars in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Or Netlify / Cloudflare Pages — same two Vite env vars.

## Data mode
| Env set? | Behavior |
|----------|----------|
| Yes | Supabase is source of truth |
| No | localStorage (demo / offline) |

## Verify flow
1. Add member → ID `001`
2. Open Cards → download / print
3. Scanner or Verification → enter `001` → ✓ Verified
