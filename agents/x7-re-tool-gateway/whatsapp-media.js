const ALLOWED = Object.freeze({
  image: new Set(['image/jpeg', 'image/png']),
  video: new Set(['video/mp4']),
  document: new Set(['application/pdf']),
});

export function buildWhatsAppMediaPayload(input, { trustedHost } = {}) {
  const type = String(input?.media_type || '');
  const mime = String(input?.mime_type || '');
  const url = String(input?.url || '');
  if (!ALLOWED[type]?.has(mime)) throw new Error('Unsupported media type. Use JPEG, PNG, MP4, or PDF.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !trustedHost || parsed.hostname !== trustedHost) throw new Error('Media URL must be a signed URL from the configured Supabase project.');
  if (!input?.to) throw new Error('WhatsApp recipient is required.');
  const caption = String(input?.caption || '').slice(0, 1024);
  if (type === 'document') return { messaging_product: 'whatsapp', to: input.to, type, document: { link: url, filename: String(input?.filename || 'attachment.pdf').slice(0, 180), caption } };
  return { messaging_product: 'whatsapp', to: input.to, type, [type]: { link: url, caption } };
}
