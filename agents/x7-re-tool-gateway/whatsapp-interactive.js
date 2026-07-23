export function buildButtonMessage({ to, body, buttons, header, header_media: headerMedia, footer }) {
  const normalizedButtons = normalizeButtons(buttons);
  if (!body?.trim()) throw new Error('Interactive button body is required');
  if (!normalizedButtons.length || normalizedButtons.length > 3) throw new Error('Interactive buttons require 1 to 3 replies');
  return {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: compact({
      type: 'button',
      header: buildHeader(header, headerMedia),
      body: { text: body.trim() },
      footer: footer?.trim() ? { text: footer.trim() } : undefined,
      action: {
        buttons: normalizedButtons.map((button) => ({
          type: 'reply',
          reply: { id: button.payload, title: button.title },
        })),
      },
    }),
  };
}

function buildHeader(header, media) {
  if (media?.url && ['image', 'video', 'document'].includes(media.type)) {
    return {
      type: media.type,
      [media.type]: compact({
        link: media.url,
        filename: media.type === 'document' ? media.filename : undefined,
      }),
    };
  }
  return header?.trim() ? { type: 'text', text: header.trim() } : undefined;
}

export function buildListMessage({ to, body, buttonText, sections, header, footer }) {
  if (!body?.trim()) throw new Error('Interactive list body is required');
  if (!buttonText?.trim()) throw new Error('Interactive list button text is required');
  const normalizedSections = (sections ?? []).map((section, sectionIndex) => ({
    title: String(section.title || `Options ${sectionIndex + 1}`).trim().slice(0, 24),
    rows: (section.rows ?? []).map((row) => ({
      id: String(row.payload || row.id || '').trim(),
      title: String(row.title || '').trim().slice(0, 24),
      description: row.description ? String(row.description).trim().slice(0, 72) : undefined,
    })),
  })).filter((section) => section.rows.length);
  const rows = normalizedSections.flatMap((section) => section.rows);
  if (!rows.length || rows.length > 10) throw new Error('Interactive lists require 1 to 10 rows');
  if (rows.some((row) => !row.id || !row.title)) throw new Error('Every list row requires a payload and title');
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error('List row payloads must be unique');
  return {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: compact({
      type: 'list',
      header: header?.trim() ? { type: 'text', text: header.trim() } : undefined,
      body: { text: body.trim() },
      footer: footer?.trim() ? { text: footer.trim() } : undefined,
      action: {
        button: buttonText.trim().slice(0, 20),
        sections: normalizedSections.map((section) => ({
          ...section,
          rows: section.rows.map(compact),
        })),
      },
    }),
  };
}

export function buildTemplateMessage({ to, name, language = 'en_US', bodyParameters = [], components = [] }) {
  if (!name?.trim()) throw new Error('Template name is required');
  const templateComponents = components.length
    ? components
    : bodyParameters.length
      ? [{
          type: 'body',
          parameters: bodyParameters.map((value) => ({ type: 'text', text: String(value) })),
        }]
      : undefined;
  return {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'template',
    template: compact({
      name: name.trim(),
      language: { code: language },
      components: templateComponents,
    }),
  };
}

function normalizeButtons(buttons) {
  const normalized = (buttons ?? []).map((button, index) => ({
    title: String(button.title || '').trim().slice(0, 20),
    payload: String(button.payload || button.id || `button-${index + 1}`).trim().slice(0, 256),
  }));
  if (normalized.some((button) => !button.title || !button.payload)) throw new Error('Every button requires a title and payload');
  if (new Set(normalized.map((button) => button.payload)).size !== normalized.length) throw new Error('Button payloads must be unique');
  return normalized;
}

function normalizePhone(value) {
  const phone = String(value || '').replace(/\D/g, '');
  if (phone.length < 8) throw new Error('A valid destination phone is required');
  return phone;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
