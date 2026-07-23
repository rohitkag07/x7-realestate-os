-- WhatsAI Assistant: atomic Vercel webhook ingest and zero-cost scheduler trigger.

CREATE OR REPLACE FUNCTION public.ingest_whatsapp_inbound(
  p_phone_number_id text,
  p_phone text,
  p_contact_name text,
  p_provider_message_id text,
  p_message_type text,
  p_body text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_channel public.business_channels;
  selected_contact public.conversation_contacts;
  selected_thread public.conversation_threads;
  selected_message public.conversation_messages;
  selected_playbook_id uuid;
  selected_builder_id uuid;
BEGIN
  IF nullif(trim(p_phone_number_id), '') IS NULL
    OR nullif(trim(p_phone), '') IS NULL
    OR nullif(trim(p_provider_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'phone_number_id, phone, and provider_message_id are required';
  END IF;

  -- Meta can retry the same webhook concurrently. Serialize one provider message.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider_message_id, 0));

  SELECT *
  INTO selected_channel
  FROM public.business_channels
  WHERE is_active = true
    AND (
      phone_number_id = p_phone_number_id
      OR channel_id = p_phone_number_id
    )
  ORDER BY is_primary DESC, updated_at DESC
  LIMIT 1;

  IF selected_channel.id IS NULL OR selected_channel.business_id IS NULL THEN
    RAISE EXCEPTION 'No active business channel for phone_number_id %', p_phone_number_id;
  END IF;

  SELECT coalesce(business.builder_id, builder.id)
  INTO selected_builder_id
  FROM public.businesses AS business
  LEFT JOIN public.builders AS builder
    ON builder.id = business.id
  WHERE business.id = selected_channel.business_id;

  SELECT *
  INTO selected_message
  FROM public.conversation_messages
  WHERE provider_msg_id = p_provider_message_id
    AND direction = 'inbound'
  ORDER BY created_at
  LIMIT 1;

  IF selected_message.id IS NOT NULL THEN
    SELECT * INTO selected_thread
    FROM public.conversation_threads
    WHERE id = selected_message.thread_id;

    RETURN jsonb_build_object(
      'duplicate', true,
      'business_id', selected_channel.business_id,
      'business_channel_id', selected_channel.id,
      'contact_id', selected_message.contact_id,
      'thread_id', selected_message.thread_id,
      'playbook_id', selected_thread.playbook_id,
      'message_id', selected_message.id
    );
  END IF;

  INSERT INTO public.conversation_contacts (
    business_id,
    builder_id,
    phone,
    name,
    source,
    last_active_at,
    last_message_at,
    metadata
  )
  VALUES (
    selected_channel.business_id,
    selected_builder_id,
    p_phone,
    nullif(trim(p_contact_name), ''),
    'whatsapp',
    now(),
    now(),
    jsonb_build_object('wa_id', p_phone) || coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (business_id, phone)
  DO UPDATE SET
    name = coalesce(nullif(trim(EXCLUDED.name), ''), public.conversation_contacts.name),
    last_active_at = now(),
    last_message_at = now(),
    metadata = coalesce(public.conversation_contacts.metadata, '{}'::jsonb)
      || coalesce(EXCLUDED.metadata, '{}'::jsonb)
  RETURNING * INTO selected_contact;

  SELECT id
  INTO selected_playbook_id
  FROM public.assistant_playbooks
  WHERE business_id = selected_channel.business_id
    AND is_active = true
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1;

  INSERT INTO public.conversation_threads (
    business_id,
    builder_id,
    business_channel_id,
    contact_id,
    playbook_id,
    channel,
    status,
    ai_mode,
    unread_count,
    last_message_at,
    metadata
  )
  VALUES (
    selected_channel.business_id,
    selected_builder_id,
    selected_channel.id,
    selected_contact.id,
    selected_playbook_id,
    'whatsapp',
    'open',
    'assistant',
    1,
    now(),
    jsonb_build_object('phone_number_id', p_phone_number_id)
  )
  ON CONFLICT (business_channel_id, contact_id)
    WHERE business_channel_id IS NOT NULL AND contact_id IS NOT NULL
  DO UPDATE SET
    playbook_id = coalesce(public.conversation_threads.playbook_id, EXCLUDED.playbook_id),
    unread_count = public.conversation_threads.unread_count + 1,
    last_message_at = now(),
    metadata = coalesce(public.conversation_threads.metadata, '{}'::jsonb)
      || coalesce(EXCLUDED.metadata, '{}'::jsonb)
  RETURNING * INTO selected_thread;

  INSERT INTO public.conversation_messages (
    thread_id,
    contact_id,
    business_id,
    builder_id,
    direction,
    role,
    channel,
    message_type,
    content,
    body,
    provider_msg_id,
    status,
    agent,
    metadata
  )
  VALUES (
    selected_thread.id,
    selected_contact.id,
    selected_channel.business_id,
    selected_builder_id,
    'inbound',
    'user',
    'whatsapp',
    coalesce(nullif(trim(p_message_type), ''), 'text'),
    nullif(p_body, ''),
    nullif(p_body, ''),
    p_provider_message_id,
    'received',
    'vercel-whatsapp-webhook',
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO selected_message;

  UPDATE public.followup_jobs
  SET status = 'cancelled', error = 'customer_replied', updated_at = now()
  WHERE thread_id = selected_thread.id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'duplicate', false,
    'business_id', selected_channel.business_id,
    'business_channel_id', selected_channel.id,
    'contact_id', selected_contact.id,
    'thread_id', selected_thread.id,
    'playbook_id', selected_thread.playbook_id,
    'message_id', selected_message.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_whatsapp_inbound(text, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_whatsapp_inbound(text, text, text, text, text, text, jsonb)
  TO service_role;

-- Vercel Hobby only supports daily cron jobs. Supabase Cron invokes the secured
-- Vercel route every five minutes without requiring another paid runtime.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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
  SELECT decrypted_secret
  INTO scheduler_url
  FROM vault.decrypted_secrets
  WHERE name = 'whatsai_followup_cron_url'
  LIMIT 1;

  SELECT decrypted_secret
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

REVOKE ALL ON FUNCTION public.invoke_whatsai_followup_scheduler() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_whatsai_followup_scheduler() TO service_role, postgres;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'whatsai-followup-scheduler'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'whatsai-followup-scheduler',
    '*/5 * * * *',
    'select public.invoke_whatsai_followup_scheduler();'
  );
END;
$$;
