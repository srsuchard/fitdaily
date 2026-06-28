# FitDaily — Marketing / Beta Landing Page

A single-file, zero-build landing page to advertise FitDaily and collect beta-tester
emails. Just `index.html` + a copied app icon. Host it anywhere static.

## Files
- `index.html` — the whole site (HTML + CSS + JS inline). Responsive, dark-mode aware.
- `assets/` — app icon + favicon copied from the Expo project.

## Email collection (already wired to Supabase)
The signup form writes straight to the **`public.beta_signups`** table in the FitDaily
Supabase project — no third-party service. It's set up and live; nothing to configure.

- Schema/RLS: [`supabase/migrations/0005_beta_signups.sql`](../supabase/migrations/0005_beta_signups.sql)
- The page uses the public **anon/publishable** key. That key is safe to ship: RLS
  grants it `INSERT` only, so it **cannot read or harvest** the list.
- Duplicate emails return `409` and are shown as "already on the list" (not an error).
- A local copy is also kept in the visitor's browser as a belt-and-suspenders backup.

**Read your waitlist** in the Supabase dashboard → SQL editor:
```sql
select email, source, created_at from public.beta_signups order by created_at desc;
```
Or export it to CSV from the Table editor when you're ready to send TestFlight invites.

## 2. Preview locally
```bash
cd marketing
python3 -m http.server 8099
# open http://localhost:8099
```

## 3. Deploy (pick one, all free)
- **Netlify Drop** — drag the `marketing` folder onto https://app.netlify.com/drop.
- **Vercel** — `npx vercel` from inside `marketing/`.
- **GitHub Pages** — push the repo, enable Pages, point it at this folder (or copy
  `index.html` to a `/docs` folder on `main`).
- **Cloudflare Pages** — connect the repo, set the output dir to `marketing`.

## Customize
- Copy/headlines: edit the text in `index.html` (search for the section you want).
- Brand colors: the `:root` CSS variables at the top (`--accent` is FitDaily's `#FF5A3C`).
- Contact email: search for `samuel.suchard@gmail.com`.
- Social share image: add an `og:image` meta tag pointing to a hosted preview image.
