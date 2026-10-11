import { HttpError } from "../../lib/errors";

export function mailReady() {
  return !!(process.env.QXLAYER_AUTH_MAIL_FROM && process.env.QXLAYER_AUTH_RESEND_KEY);
}
export async function sendAuthMail(to: string, subject: string, url: string) {
  if (!mailReady()) throw new HttpError(503, "MAIL_UNAVAILABLE: Verification and recovery require a configured mail sender.");
  // Preserve the configured mailbox/domain, changing only the display branding.
  const mailbox = process.env.QXLAYER_AUTH_MAIL_FROM!.trim().match(/(?:^|<)([^\s<>]+@[^\s<>]+)>?$/)?.[1];
  if (!mailbox) throw new HttpError(503, "Email sender configuration is invalid.");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.QXLAYER_AUTH_RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `VYNOX LAYER <${mailbox}>`, to: [to], subject,
       text: `${subject}\n\n${url}\n\nThis link expires. If you did not request it, ignore this email.\n\nVYNOX LAYER` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new HttpError(503, "Email delivery failed. Please try again later.");
}
