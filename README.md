# JIBU

JIBU-ს სრული ვებაპლიკაცია: მთავარი სივრცე, უძრავი ქონება, რუკა, მარკეტპლეისი, სერვისები, ბიზნესი, საზოგადოება, პროფილი და Supabase ავტორიზაცია/მონაცემები.

## სწრაფი გაშვება

საჭიროა Node.js `22.13+` და npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

შემდეგ გახსენი `http://localhost:5173`.

`.env.local`-ში ჩაწერე შენი Supabase Project URL და Publishable Key. `service_role` გასაღები ბრაუზერში ან Git-ში არასოდეს ჩაწერო.

## მონაცემთა ბაზა

Supabase Dashboard → SQL Editor-ში გაუშვი `supabase/migrations/20260904_jibu_core_v2.sql`.

ამ migration-ში შედის პროფილები, საფულე, განცხადებები, ფოტოები, ნახვები, რჩეულები, VIP/Turbo ისტორია, VIP Broker, გადახდები, შეტყობინებები, Storage bucket-ები და RLS წესები.

დეტალური Git და Cloudflare deployment ინსტრუქცია იხილე [GIT_AND_DEPLOY_KA.md](./GIT_AND_DEPLOY_KA.md)-ში. ეს ვერსია დამოუკიდებელი Cloudflare პროექტია და `.openai` საქაღალდე არ სჭირდება.

## შემოწმება

```bash
npm run build
npm test
```
