# WhatsAI Assistant - Project Overview

## What This Project Is Now

WhatsAI Assistant is a WhatsApp-first AI receptionist and lead conversion platform for Indian businesses.

It is a pivot from WhatsAI Assistant. The existing real-estate product remains the first vertical pack, but the core product direction is now horizontal.

## Product Goal

Replace missed WhatsApp replies and manual follow-up with one assistant stack:

1. capture every inbound WhatsApp message
2. answer basic business questions instantly
3. qualify the lead using a vertical playbook
4. book an appointment, site visit, demo, or callback
5. hand off hot or confused leads to the owner
6. send follow-up reminders
7. summarize the day for the owner

## First Customers

Prioritize WhatsApp-heavy Indian SMBs:

- real-estate builders and brokers
- clinics and healthcare practices
- coaching institutes
- gyms and dietitians
- local service businesses

## Current Reality

The repo already contains:

- a working dashboard shell
- major real-estate sales flows
- WhatsApp-oriented webhook and send paths
- major colony/society flows that can become a later vertical pack
- a Phase 6 local agent mesh with Summoner orchestration
- Supabase-backed persistence paths
- readiness and integration status surfaces

The remaining pivot work is mainly:

- create a generic business/profile/playbook layer
- generalize lead, conversation, appointment, and handoff language
- keep real estate as the first vertical playbook
- prove one 7-day trial flow end-to-end
- reduce dependency on fallback/demo behavior

## Current Business Strategy

Do not sell AI SaaS first. Sell a simple trial:

> 7-day WhatsApp AI receptionist trial for missed lead recovery and appointment/site-visit booking.

Target conversion:

- intro trial: free or Rs 999
- paid plan: Rs 2,999 to Rs 14,999 per month depending on volume and handoff needs
