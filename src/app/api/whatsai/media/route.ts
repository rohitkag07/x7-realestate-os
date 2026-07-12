import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'whatsai-media';
const MAX_BYTES = 16 * 1024 * 1024;
const mediaTypes = new Map([
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['video/mp4', 'video'],
  ['application/pdf', 'document'],
] as const);
const idSchema = z.string().uuid();

export async function POST(request: Request) {
  const form = await request.formData();
  const businessId = idSchema.safeParse(form.get('business_id'));
  const playbookId = idSchema.safeParse(form.get('playbook_id'));
  const ruleId = z.string().trim().min(1).max(60).safeParse(form.get('rule_id'));
  const file = form.get('file');
  if (!businessId.success || !playbookId.success || !ruleId.success || !(file instanceof File)) {
    return fail('Business, playbook, rule, and file are required.', 400);
  }
  if (file.size < 1 || file.size > MAX_BYTES) return fail('Files must be between 1 byte and 16 MB.', 400);

  const verified = await verifiedBusinessAccess(businessId.data);
  if (!verified.ok) return fail(verified.error, verified.status);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectMime(bytes);
  if (!detectedMime || !mediaTypes.has(detectedMime)) return fail('Only JPEG, PNG, MP4, and PDF files are accepted.', 400);

  const supabase = createServiceClient();
  const { data: playbook } = await (supabase.from('assistant_playbooks') as any)
    .select('id, business_id')
    .eq('id', playbookId.data)
    .eq('business_id', businessId.data)
    .maybeSingle();
  if (!playbook) return fail('The selected playbook no longer belongs to this business.', 403);

  const safeName = safeFileName(file.name, detectedMime);
  const storagePath = `${businessId.data}/${playbookId.data}/${ruleId.data}/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: detectedMime,
    upsert: false,
  });
  if (upload.error) return fail(`Upload failed: ${upload.error.message}`, 502);

  const mediaType = mediaTypes.get(detectedMime)!;
  const inserted = await (supabase.from('playbook_media_assets') as any).insert({
    business_id: businessId.data,
    playbook_id: playbookId.data,
    rule_id: ruleId.data,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    media_type: mediaType,
    mime_type: detectedMime,
    file_name: safeName,
    file_size_bytes: file.size,
    status: 'ready',
  }).select().single();
  if (inserted.error || !inserted.data) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return fail('Upload could not be recorded safely. Please try again.', 502);
  }
  const preview = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 15 * 60);
  return NextResponse.json({
    ok: true,
    asset: toClientAsset(inserted.data, preview.data?.signedUrl ?? null),
  });
}

export async function GET(request: Request) {
  const assetId = idSchema.safeParse(new URL(request.url).searchParams.get('asset_id'));
  if (!assetId.success) return fail('A valid asset_id is required.', 400);
  const session = await sessionBuilderId();
  if (!session.ok) return fail(session.error, session.status);
  const supabase = createServiceClient();
  const { data: asset } = await (supabase.from('playbook_media_assets') as any)
    .select('*').eq('id', assetId.data).eq('business_id', session.builderId).eq('status', 'ready').maybeSingle();
  if (!asset) return fail('Attachment not found.', 404);
  const preview = await supabase.storage.from(BUCKET).createSignedUrl(asset.storage_path, 15 * 60);
  return NextResponse.json({ ok: true, asset: toClientAsset(asset, preview.data?.signedUrl ?? null) });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const assetId = idSchema.safeParse(body?.asset_id);
  if (!assetId.success) return fail('A valid asset_id is required.', 400);
  const session = await sessionBuilderId();
  if (!session.ok) return fail(session.error, session.status);
  const supabase = createServiceClient();
  const { data: asset } = await (supabase.from('playbook_media_assets') as any)
    .select('*').eq('id', assetId.data).eq('business_id', session.builderId).eq('status', 'ready').maybeSingle();
  if (!asset) return fail('Attachment not found.', 404);
  const remove = await supabase.storage.from(BUCKET).remove([asset.storage_path]);
  if (remove.error) return fail(`Could not remove attachment: ${remove.error.message}`, 502);
  const archived = await (supabase.from('playbook_media_assets') as any).update({ status: 'deleted' }).eq('id', asset.id);
  if (archived.error) return fail('Attachment removed but audit status could not be updated. Contact support.', 502);
  return NextResponse.json({ ok: true });
}

async function verifiedBusinessAccess(businessId: string) {
  const session = await sessionBuilderId();
  if (!session.ok) return session;
  if (session.builderId !== businessId) return { ok: false as const, status: 403, error: 'You can only upload media for your own business.' };
  return session;
}

async function sessionBuilderId() {
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    const builderId = typeof user?.app_metadata?.builder_id === 'string' ? user.app_metadata.builder_id : null;
    if (error || !user || !builderId) return { ok: false as const, status: 401, error: 'Sign in with your business account to manage attachments.' };
    return { ok: true as const, builderId };
  } catch {
    return { ok: false as const, status: 503, error: 'Authentication is not configured for this environment.' };
  }
}

function detectMime(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp') return 'video/mp4';
  return null;
}

function safeFileName(name: string, mime: string) {
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'video/mp4' ? 'mp4' : 'pdf';
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'attachment';
  return `${base}.${extension}`;
}

function toClientAsset(asset: Record<string, unknown>, previewUrl: string | null) {
  return {
    id: asset.id,
    storage_path: asset.storage_path,
    media_type: asset.media_type,
    media_name: asset.file_name,
    media_mime_type: asset.mime_type,
    media_size_bytes: asset.file_size_bytes,
    preview_url: previewUrl,
  };
}

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
