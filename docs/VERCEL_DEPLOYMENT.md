# Vercel Deployment

Cantina V1 is designed to run as a Next.js web application on Vercel with managed PostgreSQL. Docker is not required.

## Runtime topology

```text
Browser
  → Vercel Next.js application
    → Vercel Functions
      → Managed PostgreSQL through DATABASE_URL
```

## Deployment sequence

1. Import `patricktran1/cantina` into Vercel as a Next.js project.
2. In **Storage**, provision Prisma Postgres or Neon and connect it to the project.
3. Confirm `DATABASE_URL` is available to Production and Preview deployments.
4. Deploy the project.
5. Visit `/api/health` and confirm that `persistence` is `postgresql`.
6. Create a purchase request and verify that it appears on the dashboard, transaction ledger, and audit log.

## Build behavior

`npm install` generates Prisma Client. Vercel then runs the `vercel-build` script:

```bash
prisma db push --skip-generate && next build
```

This is optimized for the first MVP deployment. Move to committed migrations and `prisma migrate deploy` before operating independent staging and production release cycles.

## Environment variables

```text
DATABASE_URL                  required
OPENAI_API_KEY                optional
OPENAI_REASONING_MODEL        optional
CANTINA_DEMO_USER_EMAIL       optional
CANTINA_DEMO_ORG_SLUG         optional
```

The first database-backed request bootstraps the demo organization, agent, mandate, supplier offers, chart of accounts, and simulated opening credits using idempotent upserts.

## Verification checklist

- `/api/health` returns HTTP 200.
- Health reports `postgresql` persistence.
- Dashboard loads without database errors.
- One idempotency key creates exactly one purchase.
- Nova Compute is selected for the seeded sample request.
- The purchase reaches `SETTLED`.
- Ledger transactions remain balanced.
- Audit events remain visible after redeployment.
