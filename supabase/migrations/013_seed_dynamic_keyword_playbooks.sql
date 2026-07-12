BEGIN;

UPDATE public.assistant_playbooks
SET keyword_replies = '[
  {"id":"price","label":"Price","keywords":["price","rate","cost","budget"],"match_type":"word","reply":"Prices depend on plot size and location. Share your budget and we will send the best available options.","priority":100,"enabled":true,"handoff":false},
  {"id":"location","label":"Location","keywords":["location","map","address"],"match_type":"word","reply":"We will share the project location and Google Maps pin. Which area are you coming from?","priority":90,"enabled":true,"handoff":false},
  {"id":"site-visit","label":"Site visit","keywords":["visit","site visit","dekhna"],"match_type":"contains","reply":"Site visits are available this week. Share your preferred day and time.","priority":80,"enabled":true,"handoff":false}
]'::jsonb,
    fallback_reply = 'Thanks for your property inquiry. Our team will review your question and reply shortly.',
    playbook_version = playbook_version + 1
WHERE is_active = true
  AND vertical = 'real_estate'
  AND jsonb_array_length(keyword_replies) = 0;

UPDATE public.assistant_playbooks
SET keyword_replies = '[
  {"id":"fees","label":"Course fees","keywords":["fees","fee","price"],"match_type":"word","reply":"Course fees depend on the selected program. Which course are you interested in?","priority":100,"enabled":true,"handoff":false},
  {"id":"demo","label":"Demo class","keywords":["demo","trial class","sample class"],"match_type":"contains","reply":"A demo class can be arranged. Share the student class and preferred day.","priority":90,"enabled":true,"handoff":false},
  {"id":"batch","label":"Batch timings","keywords":["batch","timing","schedule"],"match_type":"word","reply":"We have weekday and weekend batches. Which course and timing do you prefer?","priority":80,"enabled":true,"handoff":false}
]'::jsonb,
    fallback_reply = 'Thanks for your course inquiry. A counsellor will reply shortly.',
    playbook_version = playbook_version + 1
WHERE is_active = true
  AND vertical = 'coaching'
  AND jsonb_array_length(keyword_replies) = 0;

COMMIT;
