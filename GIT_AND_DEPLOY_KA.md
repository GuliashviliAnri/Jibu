# JIBU — გაშვება, GitHub და Cloudflare

## ლოკალურად გაშვება

საჭიროა Node.js 22.13 ან უფრო ახალი.

```bash
npm ci
npm run dev
```

გახსენი `http://localhost:5173`.

`.env.local` უკვე შევსებულია. ის შენს კომპიუტერში დატოვე და GitHub-ზე არ ატვირთო. `.gitignore` ავტომატურად გამოტოვებს მას.

## GitHub-ზე ატვირთვა

```bash
git init
git add .
git commit -m "Initial JIBU release"
git branch -M main
git remote add origin შენი_რეპოზიტორის_ლინკი
git push -u origin main
```

თუ `origin already exists` გამოჩნდა:

```bash
git remote set-url origin შენი_რეპოზიტორის_ლინკი
git push -u origin main
```

## Supabase

Supabase SQL Editor-ში ერთხელ სრულად გაუშვი:

```text
supabase/migrations/20260904_jibu_core_v2.sql
```

## Cloudflare-ზე პირველად გაშვება

```bash
npm ci
npx wrangler login
npm run build
npx wrangler secret put SUPABASE_URL --config dist/server/wrangler.json
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config dist/server/wrangler.json
npx wrangler deploy --config dist/server/wrangler.json
```

ორივე `secret put` ბრძანება მოგთხოვს მნიშვნელობის შეყვანას. გამოიყენე `.env.local`-ში არსებული შესაბამისი მნიშვნელობები.

შემდეგი განახლებისას:

```bash
git pull
npm ci
npm run deploy
```
