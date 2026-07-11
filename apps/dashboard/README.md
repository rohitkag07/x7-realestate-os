# X7 WhatsAI Assistant - Operator Dashboard Reference

The active dashboard now lives in the canonical repo root `src/`, not this `apps/dashboard/src` tree.
Use this file only as historical structure reference.

Canonical path:

```text
/Users/rohit/Projects/x7-realestate-os
```

Current runbook:

```text
WHATSAI_RUNBOOK.md
```

## Quickstart

```bash
cd /Users/rohit/Projects/x7-realestate-os
cp .env.example apps/dashboard/.env.local
npm install
pm2 start ecosystem.config.cjs --update-env
npm run prove:whatsai
npm run dev                        # http://localhost:3000
```

## Current Structure

```text
/Users/rohit/Projects/x7-realestate-os/src/
├── app/
│   ├── (auth)/login          - operator login
│   ├── (dashboard)/
│   │   ├── page.tsx          - KPI home
│   │   ├── leads             - current lead pipeline
│   │   ├── site-visits       - first vertical appointment flow
│   │   ├── bookings          - conversion records
│   │   ├── content           - deferred content calendar, not launch blocker
│   │   ├── campaigns         - deferred campaign operations, not launch blocker
│   │   ├── colony            - later society/resident vertical pack, not launch blocker
│   │   ├── reports           - analytics
│   │   └── settings          - business profile, integrations, readiness
│   └── guard                 - retained for society/visitor vertical behavior
├── components/
│   ├── ui/                   - shadcn primitives
│   ├── shared/               - Sidebar, KPI cards, charts
│   ├── leads/                - LeadPipeline, LeadCard, LeadModal
│   ├── content/              - ContentCalendar, ContentCard, MediaPreview
│   └── colony/               - ResidentTable, ComplaintKanban, VisitorLog
├── lib/
│   ├── supabase/             - Browser + server Supabase clients
│   ├── i18n.ts               - Hindi / English bilingual strings
│   └── utils.ts              - cn() and friends
└── types/
    └── database.ts           - TS types matching Supabase migrations
```

## Pivot UI Direction

New dashboard work should move from builder-only language to operator/business language:

- builder -> business
- project -> offering/location
- site visit -> appointment/visit/demo
- booking -> conversion
- colony -> society/resident vertical pack

Do not remove working real-estate pages yet. They are the first vertical pack and should be migrated gradually.
