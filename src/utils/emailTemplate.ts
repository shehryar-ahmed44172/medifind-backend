/**
 * One plain, branded layout for MediFind's transactional emails, returned as
 * both HTML and plain text. Deliverability-friendly: no scripts or remote
 * images, no app-scheme or localhost links, table layout with inline styles,
 * and user-supplied text is escaped.
 */
export interface EmailContent {
  /** Short heading shown at the top of the message */
  title: string;
  /** Recipient's name for the greeting (optional) */
  name?: string;
  /** Body paragraphs, plain text */
  paragraphs: string[];
  /** Optional one-time code shown large (verification / password reset) */
  code?: string;
  /** Optional small note under the body (e.g. "ignore this email if…") */
  note?: string;
  /** Optional https link button */
  action?: { label: string; url: string };
}

export const escapeHtml = (value: string): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Only real web links belong in email; app schemes and local addresses look like phishing to filters */
export const isPublicHttpsUrl = (url?: string): url is string =>
  !!url && /^https:\/\//i.test(url) && !/^https:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url);

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const { title, name, paragraphs, code, note } = content;
  const action = content.action && isPublicHttpsUrl(content.action.url) ? content.action : undefined;
  const year = new Date().getFullYear();

  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(t)}</p>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="padding:24px 28px 8px;font-size:20px;font-weight:bold;color:#2496A7;">Medi<span style="color:#04364E;">Find</span></td></tr>
<tr><td style="padding:8px 28px 4px;">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a;">${escapeHtml(title)}</h1>
${name ? p(`Hello ${name},`) : ''}
${paragraphs.map(p).join('\n')}
${code ? `<div style="margin:20px 0;padding:16px;border-radius:10px;background:#e2f0f3;text-align:center;font-size:30px;font-weight:bold;letter-spacing:8px;color:#04364E;">${escapeHtml(code)}</div>` : ''}
${action ? `<p style="margin:22px 0;text-align:center;"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#0C637E;color:#ffffff;font-weight:bold;text-decoration:none;">${escapeHtml(action.label)}</a></p>` : ''}
${note ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(note)}</p>` : ''}
</td></tr>
<tr><td style="padding:20px 28px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#94a3b8;">
MediFind &middot; Deaf-first emergency response, Pakistan<br>
You are receiving this because you have a MediFind account. &copy; ${year} MediFind
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    'MediFind',
    '',
    title,
    '',
    ...(name ? [`Hello ${name},`, ''] : []),
    ...paragraphs.flatMap((t) => [t, '']),
    ...(code ? [`Your code: ${code}`, ''] : []),
    ...(action ? [`${action.label}: ${action.url}`, ''] : []),
    ...(note ? [note, ''] : []),
    '--',
    'MediFind - Deaf-first emergency response, Pakistan',
    'You are receiving this because you have a MediFind account.',
  ].join('\n');

  return { html, text };
}

/** Plain-text version of any HTML email (used when a caller only provides HTML) */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|head|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&copy;/g, '(c)').replace(/&middot;/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
