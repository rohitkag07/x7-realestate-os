# X7 RealEstate OS - Code Standards

## General

- use ESM for agents
- use TypeScript strict mode in dashboard code
- keep environment defaults explicit
- prefer ASCII unless the file already uses non-ASCII deliberately

## APIs

- validate request bodies
- keep error responses structured
- keep health endpoints lightweight
- do not spread vendor logic across many services if Tool Gateway can own it

## Data

- Supabase is the source of truth
- prefer append/audit style logging where relevant
- keep builder/project context explicit in mutations

## Frontend

- dashboard should prefer Supabase-first reads with safe fallback behavior
- avoid dead routes and fake “coming soon” placeholders
- keep mobile and desktop layouts usable

## Docs

- if the repo reality changes, update the working docs and blueprint snapshot
