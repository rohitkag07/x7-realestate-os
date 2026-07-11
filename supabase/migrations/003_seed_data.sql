-- =====================================================================
-- WhatsAI Assistant — Seed Data for Development
-- =====================================================================
-- Creates one demo builder ("Shree Krishna Developers") in Indore with
-- one active project ("Krishna Greens, Super Corridor"), 20 plots,
-- a handful of leads in every pipeline stage, a site visit, a booking,
-- some content calendar entries, an ad campaign, and a couple of
-- colony residents with complaints + visitors.
--
-- Safe to re-run: every insert is gated by ON CONFLICT DO NOTHING on a
-- stable natural key.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Builder
-- ---------------------------------------------------------------------
INSERT INTO public.builders (id, name, company_name, phone, email, city, whatsapp_number, plan, status, brand_colors)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Rohit Kag',
  'Shree Krishna Developers',
  '+919876543210',
  'rohit@shreekrishna.in',
  'Indore',
  '+919876543210',
  'growth',
  'active',
  '{"primary":"#0F172A","accent":"#F59E0B"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 2. Project
-- ---------------------------------------------------------------------
INSERT INTO public.projects (
  id, builder_id, name, slug, location, city, latitude, longitude,
  total_plots, available_plots, price_range_min, price_range_max,
  rera_number, project_type, amenities, nearby_landmarks, status, launched_at
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Krishna Greens',
  'krishna-greens-super-corridor',
  'Super Corridor, Near IT Park',
  'Indore',
  22.7245,
  75.8636,
  120,
  87,
  18,
  45,
  'P-MP-IND-2026-00123',
  'plots',
  ARRAY['Wide 40ft Roads','Garden','24x7 Security','Club House','Underground Drainage','Street Lights','RERA Approved'],
  '[
    {"name":"Indore Airport","type":"transport","distance_km":12},
    {"name":"IT Park","type":"office","distance_km":3},
    {"name":"DPS School","type":"school","distance_km":2.5},
    {"name":"Apollo Hospital","type":"hospital","distance_km":4}
  ]'::jsonb,
  'active',
  now() - interval '60 days'
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 3. Plots — 20 sample plots
-- ---------------------------------------------------------------------
INSERT INTO public.plots (project_id, plot_number, block, area_sqft, dimension, facing, price_per_sqft, total_price, status)
SELECT
  '22222222-2222-2222-2222-222222222222',
  'A-' || lpad(n::text, 3, '0'),
  'A',
  CASE WHEN n % 3 = 0 THEN 1500 WHEN n % 3 = 1 THEN 1200 ELSE 1000 END,
  CASE WHEN n % 3 = 0 THEN '30x50' WHEN n % 3 = 1 THEN '30x40' ELSE '25x40' END,
  (ARRAY['North','East','West','South','Corner'])[(n % 5) + 1],
  2400,
  CASE WHEN n % 3 = 0 THEN 3600000 WHEN n % 3 = 1 THEN 2880000 ELSE 2400000 END,
  CASE WHEN n <= 13 THEN 'available' WHEN n <= 17 THEN 'token' ELSE 'booked' END
FROM generate_series(1, 20) AS n
ON CONFLICT (project_id, plot_number) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. Leads — across every stage of the pipeline
-- ---------------------------------------------------------------------
INSERT INTO public.leads (id, project_id, builder_id, name, phone, source, budget_range, purpose, timeline, lead_score, lead_stage, temperature, notes)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Rajesh Sharma',       '+919811112201', 'meta_ad',      '25-40L', 'self_use',   'immediate',  82, 'new',              'hot',  'Clicked Meta ad, asked for brochure'),
  ('a0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Priya Verma',         '+919811112202', 'whatsapp',     '15-25L', 'investment', '3_months',   65, 'qualified',        'warm', 'Budget conscious, wants east-facing'),
  ('a0000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sunil Yadav',         '+919811112203', 'google_ad',    '40L+',   'self_use',   'immediate',  91, 'visit_scheduled',  'hot',  'Senior IT manager, looking at corner plot'),
  ('a0000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ankit Patil',         '+919811112204', 'referral',     '25-40L', 'investment', '6_months+',  55, 'visited',          'warm', 'Visited Saturday, will discuss with wife'),
  ('a0000001-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Deepak Joshi',        '+919811112205', 'walk_in',      '15-25L', 'self_use',   'immediate',  88, 'booked',           'hot',  'Token paid via UPI, plot A-018'),
  ('a0000001-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Manisha Kulkarni',    '+919811112206', 'ghost_closer', '40L+',   'investment', 'immediate',  78, 'negotiation',      'hot',  'NRI client, video call scheduled'),
  ('a0000001-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Vivek Agrawal',       '+919811112207', 'meta_ad',      '25-40L', 'undecided',  '3_months',   42, 'lost',             'cold', 'Chose competitor, price-sensitive')
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 5. Site visit (the scheduled one)
-- ---------------------------------------------------------------------
INSERT INTO public.site_visits (lead_id, project_id, scheduled_date, scheduled_time, status, interest_level)
VALUES (
  'a0000001-0000-0000-0000-000000000003',
  '22222222-2222-2222-2222-222222222222',
  (now() + interval '1 day')::date,
  '14:00',
  'confirmed',
  'very_high'
)
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 6. Booking (Deepak's plot A-018)
-- ---------------------------------------------------------------------
INSERT INTO public.bookings (lead_id, project_id, plot_id, token_amount, total_amount, payment_mode, payment_reference, status)
SELECT
  'a0000001-0000-0000-0000-000000000005',
  '22222222-2222-2222-2222-222222222222',
  p.id,
  50000,
  2400000,
  'upi',
  'UTR-23051198765',
  'token_paid'
FROM public.plots p
WHERE p.project_id = '22222222-2222-2222-2222-222222222222'
  AND p.plot_number = 'A-018'
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 7. Content calendar (next 3 days)
-- ---------------------------------------------------------------------
INSERT INTO public.content_calendar (project_id, builder_id, content_type, platform, pillar, caption, caption_hindi, scheduled_for, status, generated_by)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'post',   'instagram', 'location_advantage',  'Why Super Corridor is the next investment goldmine of Indore', 'Super Corridor — Indore ka agla investment goldmine kyun hai?',                 now() + interval '1 day',  'scheduled', 'gpt-4o'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'reel',   'instagram', 'construction_update', 'Watch our colony come to life — Week 12 drone update',          'Hamari colony banti dekhein — 12ve hafte ka drone update',                       now() + interval '2 days', 'scheduled', 'remotion'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'video',  'youtube',   'investment_logic',    'Plot vs Apartment — 5-year ROI compared',                       'Plot vs Flat — 5 saal mein kaun zyada return deta hai?',                         now() + interval '3 days', 'draft',     'remotion')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 8. Ad campaign
-- ---------------------------------------------------------------------
INSERT INTO public.ad_campaigns (project_id, builder_id, platform, campaign_name, campaign_type, objective, budget_daily, budget_spent, leads_generated, cpl, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'meta',
  'Krishna Greens — Click-to-WhatsApp May',
  'click_to_whatsapp',
  'MESSAGES',
  1500,
  18750,
  127,
  148,
  'active'
)
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 9. Residents (post-sale, for Colony Management demo)
-- ---------------------------------------------------------------------
INSERT INTO public.residents (id, project_id, plot_id, name, phone, email, status, move_in_date)
SELECT
  'b0000001-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  p.id,
  'Amit Khandelwal',
  '+919811113301',
  'amit@example.com',
  'owner',
  current_date - interval '90 days'
FROM public.plots p
WHERE p.project_id = '22222222-2222-2222-2222-222222222222'
  AND p.plot_number = 'A-018'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.residents (id, project_id, plot_id, name, phone, email, status, move_in_date)
SELECT
  'b0000001-0000-0000-0000-000000000002',
  '22222222-2222-2222-2222-222222222222',
  p.id,
  'Sneha Iyer',
  '+919811113302',
  'sneha@example.com',
  'owner',
  current_date - interval '60 days'
FROM public.plots p
WHERE p.project_id = '22222222-2222-2222-2222-222222222222'
  AND p.plot_number = 'A-019'
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 10. Maintenance invoices
-- ---------------------------------------------------------------------
INSERT INTO public.maintenance_invoices (project_id, resident_id, month, amount, due_date, status)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'b0000001-0000-0000-0000-000000000001', to_char(current_date, 'YYYY-MM'), 2500, current_date + interval '10 days', 'pending'),
  ('22222222-2222-2222-2222-222222222222', 'b0000001-0000-0000-0000-000000000002', to_char(current_date, 'YYYY-MM'), 2500, current_date + interval '10 days', 'paid')
ON CONFLICT (resident_id, month) DO NOTHING;


-- ---------------------------------------------------------------------
-- 11. Complaint
-- ---------------------------------------------------------------------
INSERT INTO public.complaints (project_id, resident_id, category, description, priority, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'b0000001-0000-0000-0000-000000000001',
  'water',
  'Pani 2 din se nahi aa raha hai A-018 mein. Please dekhein.',
  'high',
  'open'
)
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- 12. Visitor entry
-- ---------------------------------------------------------------------
INSERT INTO public.visitors (project_id, resident_id, visitor_name, visitor_phone, purpose, visitor_type, approval_status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'b0000001-0000-0000-0000-000000000001',
  'Ramesh — Electrician',
  '+919811114401',
  'Fan repair',
  'service',
  'approved'
)
ON CONFLICT DO NOTHING;


-- =====================================================================
-- END OF SEED
-- =====================================================================
