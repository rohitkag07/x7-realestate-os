export type WhatsAppQuickReplyButton = {
  title: string;
  payload: string;
};

export type WhatsAppListSection = {
  title: string;
  rows: Array<{ title: string; payload: string; description?: string }>;
};

export type WhatsAppMedia = {
  type: 'image' | 'video' | 'document';
  url: string;
  caption?: string;
  filename?: string;
};

export type WhatsAppCloudMessage =
  | { type: 'text'; body: string; previewUrl?: boolean }
  | { type: 'media'; media: WhatsAppMedia }
  | {
      type: 'buttons';
      body: string;
      buttons: WhatsAppQuickReplyButton[];
      media?: WhatsAppMedia | null;
      footer?: string;
    }
  | {
      type: 'list';
      body: string;
      buttonText: string;
      sections: WhatsAppListSection[];
      header?: string;
      footer?: string;
    }
  | {
      type: 'template';
      name: string;
      language?: string;
      bodyParameters?: string[];
      components?: Array<Record<string, unknown>>;
    };

export type SendWhatsAppInput = {
  to: string;
  phoneNumberId: string;
  accessToken?: string | null;
  message: WhatsAppCloudMessage;
};

export type WhatsAppSendResult = {
  ok: boolean;
  messageId: string | null;
  status: 'sent' | 'failed';
  error: string | null;
  responseStatus: number | null;
};

export async function sendWhatsAppCloudMessage(input: SendWhatsAppInput): Promise<WhatsAppSendResult> {
  const token = input.accessToken
    || process.env.WHATSAPP_ACCESS_TOKEN
    || process.env.WHATSAPP_TOKEN
    || '';
  const phoneNumberId = String(input.phoneNumberId || '').trim();
  if (!token || !phoneNumberId) {
    return failed('WhatsApp phone number ID or access token is missing.', null);
  }

  let payload: Record<string, unknown>;
  try {
    payload = buildPayload(input.to, input.message);
  } catch (error) {
    return failed(error instanceof Error ? error.message : 'Invalid WhatsApp message.', null);
  }

  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return failed(
        body?.error?.message || `Meta Graph request failed (${response.status}).`,
        response.status,
      );
    }
    return {
      ok: true,
      messageId: body?.messages?.[0]?.id ?? null,
      status: 'sent',
      error: null,
      responseStatus: response.status,
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : 'WhatsApp send failed.', null);
  }
}

function buildPayload(to: string, message: WhatsAppCloudMessage) {
  const base = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
  };

  switch (message.type) {
    case 'text':
      if (!message.body.trim()) throw new Error('WhatsApp text body is required.');
      return {
        ...base,
        type: 'text',
        text: { body: message.body.trim(), preview_url: message.previewUrl ?? true },
      };
    case 'media':
      return { ...base, ...mediaPayload(message.media) };
    case 'buttons': {
      const buttons = normalizeButtons(message.buttons);
      if (!message.body.trim()) throw new Error('Interactive button body is required.');
      return {
        ...base,
        type: 'interactive',
        interactive: compact({
          type: 'button',
          header: message.media ? interactiveMediaHeader(message.media) : undefined,
          body: { text: message.body.trim() },
          footer: message.footer?.trim() ? { text: message.footer.trim() } : undefined,
          action: {
            buttons: buttons.map((button) => ({
              type: 'reply',
              reply: { id: button.payload, title: button.title },
            })),
          },
        }),
      };
    }
    case 'list': {
      const sections = normalizeSections(message.sections);
      if (!message.body.trim() || !message.buttonText.trim()) {
        throw new Error('Interactive list body and button text are required.');
      }
      return {
        ...base,
        type: 'interactive',
        interactive: compact({
          type: 'list',
          header: message.header?.trim() ? { type: 'text', text: message.header.trim() } : undefined,
          body: { text: message.body.trim() },
          footer: message.footer?.trim() ? { text: message.footer.trim() } : undefined,
          action: {
            button: message.buttonText.trim().slice(0, 20),
            sections,
          },
        }),
      };
    }
    case 'template': {
      if (!message.name.trim()) throw new Error('WhatsApp template name is required.');
      const components = message.components?.length
        ? message.components
        : message.bodyParameters?.length
          ? [{
              type: 'body',
              parameters: message.bodyParameters.map((value) => ({ type: 'text', text: String(value) })),
            }]
          : undefined;
      return {
        ...base,
        type: 'template',
        template: compact({
          name: message.name.trim(),
          language: { code: message.language || 'en_US' },
          components,
        }),
      };
    }
  }
}

function mediaPayload(media: WhatsAppMedia) {
  validateMedia(media);
  const content = compact({
    link: media.url,
    caption: media.caption?.slice(0, 1024),
    filename: media.type === 'document'
      ? (media.filename || 'attachment.pdf').slice(0, 180)
      : undefined,
  });
  return { type: media.type, [media.type]: content };
}

function interactiveMediaHeader(media: WhatsAppMedia) {
  validateMedia(media);
  return {
    type: media.type,
    [media.type]: compact({
      link: media.url,
      filename: media.type === 'document'
        ? (media.filename || 'attachment.pdf').slice(0, 180)
        : undefined,
    }),
  };
}

function validateMedia(media: WhatsAppMedia) {
  if (!['image', 'video', 'document'].includes(media.type)) {
    throw new Error('Unsupported WhatsApp media type.');
  }
  const url = new URL(media.url);
  if (url.protocol !== 'https:') throw new Error('WhatsApp media URL must use HTTPS.');
}

function normalizeButtons(buttons: WhatsAppQuickReplyButton[]) {
  const normalized = (buttons ?? []).slice(0, 3).map((button, index) => ({
    title: String(button.title || '').trim().slice(0, 20),
    payload: String(button.payload || `button-${index + 1}`).trim().slice(0, 256),
  }));
  if (!normalized.length || normalized.some((button) => !button.title || !button.payload)) {
    throw new Error('Interactive messages require 1 to 3 valid quick-reply buttons.');
  }
  if (new Set(normalized.map((button) => button.payload)).size !== normalized.length) {
    throw new Error('Quick-reply payloads must be unique.');
  }
  return normalized;
}

function normalizeSections(sections: WhatsAppListSection[]) {
  const normalized = (sections ?? []).map((section, sectionIndex) => ({
    title: String(section.title || `Options ${sectionIndex + 1}`).trim().slice(0, 24),
    rows: (section.rows ?? []).map((row) => ({
      id: String(row.payload || '').trim().slice(0, 200),
      title: String(row.title || '').trim().slice(0, 24),
      description: row.description?.trim().slice(0, 72),
    })),
  })).filter((section) => section.rows.length);
  const rows = normalized.flatMap((section) => section.rows);
  if (!rows.length || rows.length > 10 || rows.some((row) => !row.id || !row.title)) {
    throw new Error('Interactive lists require 1 to 10 valid rows.');
  }
  return normalized;
}

function normalizePhone(value: string) {
  const phone = String(value || '').replace(/\D/g, '');
  if (phone.length < 8) throw new Error('A valid WhatsApp recipient is required.');
  return phone;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null),
  );
}

function failed(error: string, responseStatus: number | null): WhatsAppSendResult {
  return { ok: false, messageId: null, status: 'failed', error, responseStatus };
}
