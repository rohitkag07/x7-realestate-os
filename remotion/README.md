# X7 RealEstate OS — Remotion Video Factory (Phase 3)

9 data-driven compositions rendered to MP4 for Instagram/Facebook/YouTube.

```bash
npm install
npm run dev            # Remotion Studio preview
npm run render:batch   # render content-calendar.json → ./out/*.mp4
```

Compositions: PropertyWalkthrough, PriceReveal, LocationExplainer,
ConstructionUpdate, TestimonialReel, BeforeAfter, InvestmentComparison,
FestivalCreative, AdCreative — each in platform-specific aspect ratios.

The content-agent calls the tool-gateway's `/remotion/render` endpoint
with `{ composition, props, output_name }`; props are built from
project + builder data in Supabase.
