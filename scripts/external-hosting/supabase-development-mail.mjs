import tls from "node:tls";
/**
 * Isolated Development SMTP setup/readback. Never prints credentials or email links.
 * No deployment, DNS, business-database or other-project operations.
 */
const ref = "nktstksmfpcsjnjbeqsk";
if (process.env.QXLAYER_EXTERNAL_ENVIRONMENT !== "development" ||
    process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_PROJECT_REF !== ref ||
    !process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev") ||
    !["development", "test"].includes(process.env.NODE_ENV ?? ""))
  throw Error("This operation requires the pinned isolated Replit Development runtime.");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_URL !== origin)
  throw Error("Exact Development origin required.");
const setup = process.env.QXLAYER_DEVELOPMENT_SUPABASE_AUTH_SETUP_TOKEN;
if (!setup) throw Error("Development-project-only setup authorization is missing.");
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
async function config(body) {
  const r = await fetch(url, {
    method: body ? "PATCH" : "GET", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${setup}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`Development Auth configuration request failed (${r.status}).`);
  return r.json();
}
const mode = process.argv[2];
if (!["configure", "verify", "smtp-check"].includes(mode)) throw Error("Use configure, verify or smtp-check.");
const before = await config();
if (before.site_url !== origin || before.mailer_autoconfirm !== false ||
    before.password_min_length < 12 || !before.mfa_totp_enroll_enabled || !before.mfa_totp_verify_enabled)
  throw Error("Existing Development authentication safety settings differ; review required.");
const expected = {
  smtp_host: "smtp.resend.com", smtp_port: "465", smtp_user: "resend",
  smtp_admin_email: "development-auth@quicklychan.xyz",
  smtp_sender_name: "VYNOX LAYER Development",
  mailer_subjects_confirmation: "Verify your VYNOX LAYER Development account",
  mailer_subjects_recovery: "Reset your VYNOX LAYER Development password",
  mailer_templates_confirmation_content:
    '<h2>Verify your VYNOX LAYER Development account</h2><p>This message is for the Development environment, not Staging or Production.</p><p><a href="{{ .SiteURL }}/verify-email?token_hash={{ .TokenHash }}&amp;type=signup">Verify Development email</a></p><p>If you did not register, ignore this message.</p>',
  mailer_templates_recovery_content:
    '<h2>Reset your VYNOX LAYER Development password</h2><p>This message is for the Development environment, not Staging or Production.</p><p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery">Reset Development password</a></p><p>If you did not request this, ignore this message. This does not remove two-factor authentication.</p>',
};
if (mode === "configure") {
  const smtpKey = process.env.QXLAYER_DEVELOPMENT_RESEND_SMTP_KEY;
  if (!smtpKey?.startsWith("re_")) throw Error("A separate Development send-only Resend SMTP key is required.");
  // Never substitute a Staging, connected/shared, or account-management credential.
  if (smtpKey === process.env.QXLAYER_STAGING_RESEND_SETUP_KEY)
    throw Error("Staging authorization cannot be reused for Development SMTP.");
  await config({ ...expected, smtp_pass: smtpKey });
}
const after = await config();
for (const [key, value] of Object.entries(expected))
  if (String(after[key]) !== value) throw Error(`Development mail readback differs for ${key}.`);
for (const key of ["site_url", "uri_allow_list", "mailer_autoconfirm", "password_min_length",
  "mfa_totp_enroll_enabled", "mfa_totp_verify_enabled"])
  if (after[key] !== before[key]) throw Error(`Protected Development authentication setting changed: ${key}.`);
if (!after.smtp_pass) throw Error("SMTP credential persistence is not indicated.");
if (mode === "smtp-check") {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw Error("Verified SMTP TLS is required.");
  const smtpKey = process.env.QXLAYER_DEVELOPMENT_RESEND_SMTP_KEY;
  if (!smtpKey?.startsWith("re_")) throw Error("Development SMTP authorization is missing.");
  const socket = tls.connect({ host: "smtp.resend.com", port: 465, servername: "smtp.resend.com", rejectUnauthorized: true });
  let buffer = "", waiter, pendingError;
  const replies = [];
  socket.setTimeout(15000, () => socket.destroy(Error("SMTP timeout")));
  socket.on("error", () => { pendingError = Error("Development SMTP connection failed."); waiter?.reject(pendingError); waiter = null; });
  socket.on("data", chunk => {
    buffer += chunk.toString();
    const lines = buffer.split("\r\n"); buffer = lines.pop() ?? "";
    for (const line of lines) if (/^\d{3} /.test(line)) {
      const code = Number(line.slice(0, 3));
      if (waiter) { const w = waiter; waiter = null; w.resolve(code); } else replies.push(code);
    }
  });
  const reply = () => pendingError ? Promise.reject(pendingError) : replies.length
    ? Promise.resolve(replies.shift()) : new Promise((resolve, reject) => { waiter = { resolve, reject }; });
  const command = async (line, expectedCode) => {
    socket.write(`${line}\r\n`);
    if (await reply() !== expectedCode) throw Error("Development SMTP authorization or sender check failed.");
  };
  try {
    if (await reply() !== 220 || !socket.authorized) throw Error("Verified SMTP connection unavailable.");
    await command("EHLO vynox-development.invalid", 250);
    await command(`AUTH PLAIN ${Buffer.from(`\0resend\0${smtpKey}`).toString("base64")}`, 235);
    await command("MAIL FROM:<development-auth@quicklychan.xyz>", 250);
    await command("RCPT TO:<delivered@resend.dev>", 250);
    await command("RSET", 250);
    await command("QUIT", 221);
    console.log(JSON.stringify({ developmentSmtpAuthenticated: true, developmentEnvelopeAccepted: true, tlsVerified: true, messageSent: false }));
  } finally { socket.destroy(); }
}
// Opaque SMTP password readback is never compared, logged or transmitted.
console.log(JSON.stringify({ developmentSmtpConfigured: true, developmentTemplatesVerified: true,
  confirmationRequired: true, passwordAndTotpPreserved: true, originAndRedirectsPreserved: true,
  mailDeliveryVerified: false, appMailReadinessChanged: false }));
