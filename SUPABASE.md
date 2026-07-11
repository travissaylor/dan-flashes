# Supabase setup

The app has one explicit data-adapter switch: when `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` are present, server loaders and mutations use
Supabase. Without both values, public marketplace/detail reads use the isolated
development catalog in `src/data/mock-repository.server.ts`; authenticated
mutations fail with a configuration error instead of pretending to succeed.

## Hosted project

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Fill in the project URL and publishable key. The service-role key is optional
   and is not used by normal app requests. It must remain server-only.
3. Install/login to the Supabase CLI, then link and apply the versioned migration:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. In Authentication → URL Configuration, set the site URL for the deployed
   app and allow `https://YOUR_HOST/auth/callback`. OAuth providers should send
   their PKCE callback to that route.
5. Start the app with `npm run dev`. Do not expose
   `SUPABASE_SERVICE_ROLE_KEY` through a `VITE_`/`PUBLIC_` environment variable.

## Local Supabase

With Docker running:

```sh
npx supabase start
npx supabase db reset
```

Use the local API URL and publishable/anon key printed by `supabase status` in
`.env.local`. `db reset` recreates the database and applies every file in
`supabase/migrations` in order.

## Economy contract

Bones are integer `bigint` values. Signup awards 2,000 Bones after email
verification, daily claims award 250 Bones per UTC date, listings cost 100
Bones, and purchases apply a 12% house cut. These constants are duplicated in
`src/lib/economy.ts` for display/testing; PostgreSQL RPCs remain authoritative.

Balances and ledger rows have no direct client write grants. Shirt creation,
listing, purchasing, daily claims, and favorites use authenticated RPCs. Every
economy RPC validates `auth.uid()` itself, and fee/reward/purchase operations
lock affected rows and accept UUID idempotency keys.

PNG thumbnail/OG generation remains intentionally out of scope. The structured
pattern JSON in `patterns.definition` is the source of truth; a later media
service can consume that value after commit and store only derived render URLs.
