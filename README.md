# Building Rent Management

Rent, building, tenant, invoice, advance payment, expense, and operator management built with Next.js, Supabase Auth, Prisma, and PostgreSQL.

## Architecture

The project follows a simple three-layer structure:

- **Client and routes**: `app/` and `components/`
  - App Router pages render the admin, operator, login, and invoice experiences.
  - Shared presentation lives in `components/`.
- **Server and business rules**: `lib/actions/`, `lib/auth.ts`, `middleware.ts`
  - Server actions validate form input and enforce admin/building access.
  - Authentication is checked by Supabase middleware and server-side guards.
  - Database access must not be added to client components.
- **Database**: `prisma/` and `lib/prisma.ts`
  - `prisma/schema.prisma` is the source of truth for PostgreSQL models.
  - `lib/prisma.ts` provides the server-only Prisma client singleton.
  - Apply schema changes with `npx prisma db push` for the current Supabase workflow.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the Supabase values.

3. Generate Prisma Client and sync the database:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

## Environment variables

Keep `.env` local. Never commit it or expose the service-role key to browser code.

Required variables:

- `DATABASE_URL`: Supabase pooler URL for application queries.
- `DIRECT_URL`: Supabase direct URL used by Prisma schema operations.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase browser-safe anonymous key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used for admin user management.

## Vercel deployment

- Framework preset: **Next.js**
- Build command: `npm run build`
- Output directory: leave empty
- Install command: `npm install`
- Add all variables above to Production, Preview, and Development environments.

After changing environment variables, redeploy without using the old build cache.

## Verification

Before pushing changes:

```bash
npx tsc --noEmit
npm run build
```
