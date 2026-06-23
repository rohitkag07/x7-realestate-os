# X7 RealEstate OS — Builder Dashboard

Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui dashboard for
Tier 2 Indian real estate builders. The frontend slice of Project NEEV.

## Quickstart

```bash
cp .env.local.example .env.local   # fill in Supabase + agent URLs
npm install
npm run dev                        # http://localhost:3000
```

## Structure

```
src/
├── app/
│   ├── (auth)/login          — Builder login
│   ├── (dashboard)/
│   │   ├── page.tsx          — KPI home
│   │   ├── leads             — Lead pipeline (Kanban)
│   │   ├── site-visits       — Site visit scheduler
│   │   ├── bookings          — Confirmed bookings
│   │   ├── content           — Content calendar
│   │   ├── campaigns         — Meta / Google ad campaigns
│   │   ├── colony            — Colony management (residents / complaints / visitors)
│   │   ├── reports           — Analytics
│   │   └── settings          — Builder profile, brand, integrations
│   └── guard                 — Mobile-only guard interface
├── components/
│   ├── ui/                   — shadcn primitives
│   ├── shared/               — Sidebar, KPI cards, charts
│   ├── leads/                — LeadPipeline, LeadCard, LeadModal
│   ├── content/              — ContentCalendar, ContentCard, MediaPreview
│   └── colony/               — ResidentTable, ComplaintKanban, VisitorLog
├── lib/
│   ├── supabase/             — Browser + server Supabase clients
│   ├── i18n.ts               — Hindi / English bilingual strings
│   └── utils.ts              — cn() and friends
└── types/
    └── database.ts           — TS types matching supabase/migrations/001
```

## Build phase

This commit corresponds to **Phase 1 — Foundation** of the blueprint:
schema migrations, dashboard shell, and component scaffolding. Sales
agent, content engine, ads engine, and colony agents live in the
`agents/` directory and are wired in subsequent phases.
