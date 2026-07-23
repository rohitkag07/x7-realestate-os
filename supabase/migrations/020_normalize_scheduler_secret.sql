CREATE OR REPLACE FUNCTION public.invoke_whatsai_followup_scheduler()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  scheduler_url text;
  scheduler_secret text;
  request_id bigint;
BEGIN
  SELECT btrim(decrypted_secret)
  INTO scheduler_url
  FROM vault.decrypted_secrets
  WHERE name = 'whatsai_followup_cron_url'
  LIMIT 1;

  SELECT btrim(decrypted_secret)
  INTO scheduler_secret
  FROM vault.decrypted_secrets
  WHERE name = 'whatsai_followup_cron_secret'
  LIMIT 1;

  IF nullif(scheduler_url, '') IS NULL OR nullif(scheduler_secret, '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := scheduler_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || scheduler_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
  INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_whatsai_followup_scheduler()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_whatsai_followup_scheduler()
  TO service_role, postgres;
