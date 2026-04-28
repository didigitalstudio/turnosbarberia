/**
 * Emails transaccionales vía Resend.
 *
 * No tira si falta RESEND_API_KEY — en dev devuelve `{ ok: true, skipped: true }`.
 * Hasta que verifiquemos un dominio propio usamos el remitente default de Resend.
 */

const DEFAULT_FROM = 'TurnosBarbería <onboarding@resend.dev>';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'info@didigitalstudio.com';

export type SendResult =
  | { ok: true; id?: string; skipped?: boolean }
  | { ok: false; error: string };

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: true, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from || DEFAULT_FROM,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch failed' };
  }
}

// ─── Helpers de composición ─────────────────────────────────────────────────

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Helvetica,Arial,sans-serif;color:#0E0E0E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border:1px solid #E3DFD6;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #E3DFD6;">
          <div style="font-family:'Instrument Serif',Times,serif;font-size:22px;letter-spacing:-0.3px;color:#0E0E0E;">TurnosBarbería</div>
        </td></tr>
        <tr><td style="padding:24px;font-size:14px;line-height:1.55;color:#0E0E0E;">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #E3DFD6;background:#F5F3EE;font-size:11px;color:#7A766E;">
          Este email fue enviado automáticamente por TurnosBarbería.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(label: string, href: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;background:#0E0E0E;color:#F5F3EE;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:13px;">${escapeHtml(label)}</a>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

// ─── Templates ───────────────────────────────────────────────────────────────

export async function sendAppointmentReminderToCustomer(args: {
  to: string;
  customerName: string;
  shopName: string;
  shopSlug: string;
  serviceName: string;
  barberName: string;
  startsAt: string; // ISO
}): Promise<SendResult> {
  const when = formatWhen(args.startsAt);
  const link = `${siteUrl()}/${args.shopSlug}/mis-turnos`;
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:26px;line-height:1.15;margin:0 0 6px;">Recordatorio de turno</div>
    <div style="color:#7A766E;font-size:12px;margin-bottom:16px;">en ${escapeHtml(args.shopName)}</div>
    <p>Hola ${escapeHtml(args.customerName)}, te esperamos mañana:</p>
    <ul style="padding-left:18px;margin:8px 0 18px;">
      <li><b>${escapeHtml(args.serviceName)}</b> con <b>${escapeHtml(args.barberName)}</b></li>
      <li>${escapeHtml(when)}</li>
    </ul>
    <p style="margin:18px 0 6px;">${button('Ver mi turno', link)}</p>
    <p style="color:#7A766E;font-size:12px;margin-top:18px;">Si no vas a poder ir, cancelalo desde la app así liberamos el horario para alguien más.</p>
  `;
  return sendEmail({ to: args.to, subject: `Mañana: ${args.serviceName} en ${args.shopName}`, html: shell('Recordatorio', body) });
}

export async function sendBookingConfirmationToCustomer(args: {
  to: string;
  customerName: string;
  shopName: string;
  shopSlug: string;
  serviceName: string;
  barberName: string;
  startsAt: string; // ISO
}): Promise<SendResult> {
  const when = formatWhen(args.startsAt);
  const link = `${siteUrl()}/${args.shopSlug}/mis-turnos`;
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:26px;line-height:1.15;margin:0 0 6px;">Turno confirmado</div>
    <div style="color:#7A766E;font-size:12px;margin-bottom:16px;">en ${escapeHtml(args.shopName)}</div>
    <p>Hola ${escapeHtml(args.customerName)}, reservaste:</p>
    <ul style="padding-left:18px;margin:8px 0 18px;">
      <li><b>${escapeHtml(args.serviceName)}</b> con <b>${escapeHtml(args.barberName)}</b></li>
      <li>${escapeHtml(when)}</li>
    </ul>
    <p style="margin:18px 0 6px;">${button('Ver mis turnos', link)}</p>
    <p style="color:#7A766E;font-size:12px;margin-top:18px;">Si no vas a poder ir, cancelá desde la app así liberamos el horario.</p>
  `;
  return sendEmail({ to: args.to, subject: `Turno confirmado en ${args.shopName}`, html: shell('Turno confirmado', body) });
}

export async function sendBookingNotificationToAdmin(args: {
  to: string;
  shopName: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
}): Promise<SendResult> {
  const when = formatWhen(args.startsAt);
  const time = new Date(args.startsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:24px;line-height:1.15;margin:0 0 6px;">Nuevo turno</div>
    <div style="color:#7A766E;font-size:12px;margin-bottom:16px;">${escapeHtml(args.shopName)}</div>
    <p><b>${escapeHtml(args.customerName)}</b> reservó a las <b>${escapeHtml(time)}</b> con <b>${escapeHtml(args.barberName)}</b>.</p>
    <p style="color:#7A766E;">${escapeHtml(when)} · ${escapeHtml(args.serviceName)}</p>
    <p style="margin-top:16px;">${button('Abrir agenda', `${siteUrl()}/shop`)}</p>
  `;
  return sendEmail({ to: args.to, subject: `Nuevo turno: ${args.customerName} a las ${time} con ${args.barberName}`, html: shell('Nuevo turno', body) });
}

export async function sendNewShopNotificationToSuperAdmin(args: {
  slug: string;
  name: string;
  ownerEmail: string;
}): Promise<SendResult> {
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:24px;line-height:1.15;margin:0 0 6px;">Nueva barbería — aprobar</div>
    <p>Se registró una barbería nueva:</p>
    <ul style="padding-left:18px;">
      <li><b>${escapeHtml(args.name)}</b></li>
      <li>Slug: <code>${escapeHtml(args.slug)}</code></li>
      <li>Owner: ${escapeHtml(args.ownerEmail)}</li>
    </ul>
    <p style="margin-top:16px;">${button('Revisar en /desarrollo', `${siteUrl()}/desarrollo`)}</p>
  `;
  return sendEmail({
    to: SUPER_ADMIN_EMAIL,
    subject: `Nueva barbería registrada: ${args.name}`,
    html: shell('Nueva barbería', body)
  });
}

export async function sendShopActivatedToOwner(args: {
  to: string;
  shopName: string;
  shopSlug: string;
}): Promise<SendResult> {
  const link = `${siteUrl()}/${args.shopSlug}`;
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:24px;line-height:1.15;margin:0 0 6px;">Tu barbería está activa</div>
    <p>Felicitaciones, <b>${escapeHtml(args.shopName)}</b> ya está visible para tus clientes.</p>
    <p>Tu link público:</p>
    <p><a href="${escapeAttr(link)}" style="color:#B6754C;font-weight:600;">${escapeHtml(link)}</a></p>
    <p style="margin-top:16px;">${button('Abrir mi panel', `${siteUrl()}/shop`)}</p>
  `;
  return sendEmail({ to: args.to, subject: `Tu barbería está activa: ${args.shopName}`, html: shell('Barbería activa', body) });
}

export async function sendOwnerPasswordReset(args: {
  to: string;
  tempPassword: string;
  shopName: string;
}): Promise<SendResult> {
  const link = `${siteUrl()}/login`;
  const body = `
    <div style="font-family:'Instrument Serif',Times,serif;font-size:24px;line-height:1.15;margin:0 0 6px;">Contraseña restablecida</div>
    <p>Para <b>${escapeHtml(args.shopName)}</b>. Entrá con esta contraseña temporal:</p>
    <p style="margin:14px 0;">
      <code style="display:inline-block;background:#F5F3EE;border:1px solid #E3DFD6;border-radius:8px;padding:10px 14px;font-size:16px;letter-spacing:1px;">${escapeHtml(args.tempPassword)}</code>
    </p>
    <p style="color:#7A766E;">Cambiala desde Ajustes apenas ingreses.</p>
    <p style="margin-top:16px;">${button('Ir a login', link)}</p>
  `;
  return sendEmail({ to: args.to, subject: 'Contraseña temporal de TurnosBarbería', html: shell('Contraseña', body) });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false
  });
}
