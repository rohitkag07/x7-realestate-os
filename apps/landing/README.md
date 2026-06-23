# X7 RealEstate OS — Landing Page Generator (Phase 4)

Next.js SSG app serving auto-generated landing pages per project.
URL: `https://[domain]/[builder-slug]/[project-slug]`

```bash
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3001
```

Sections (Blueprint 2.4): Hero → Location → Amenities → Gallery →
Pricing → Testimonials → FAQ → Site Visit → Footer. The booking form
posts to `/api/site-visit` which creates a lead + queues a Meta CAPI
`Lead` event. Meta Pixel + GTM fire per `landing_pages` config.
