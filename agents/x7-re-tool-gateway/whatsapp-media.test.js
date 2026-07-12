import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMediaPayload } from './whatsapp-media.js';

test('builds Meta video payload only for signed Supabase MP4 URLs', () => {
  const payload = buildWhatsAppMediaPayload({ to: '917869161842', media_type: 'video', mime_type: 'video/mp4', url: 'https://demo.supabase.co/storage/v1/object/sign/whatsai-media/a.mp4?token=x', caption: 'Tour' }, { trustedHost: 'demo.supabase.co' });
  assert.equal(payload.type, 'video');
  assert.equal(payload.video.link.includes('token=x'), true);
});

test('rejects public or mismatched media URLs', () => {
  assert.throws(() => buildWhatsAppMediaPayload({ to: '9178', media_type: 'image', mime_type: 'image/jpeg', url: 'https://example.com/x.jpg' }, { trustedHost: 'demo.supabase.co' }));
});
