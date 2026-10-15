import tls from "node:tls";

// Authenticate and check the sender envelope only. Never issue DATA or log replies.
export async function checkProductionSmtp(smtpKey) {
  const socket = tls.connect({ host: "smtp.resend.com", port: 465,
    servername: "smtp.resend.com", rejectUnauthorized: true });
  let buffer = "", waiter, failure;
  const replies = [];
  socket.setTimeout(15000, () => socket.destroy(Error("SMTP_TIMEOUT")));
  socket.on("error", () => {
    failure = Error("SMTP_CONNECTION_FAILED");
    waiter?.reject(failure); waiter = null;
  });
  socket.on("data", chunk => {
    buffer += chunk.toString();
    if (buffer.length > 32768) return socket.destroy(Error("SMTP_REPLY_LIMIT"));
    const lines = buffer.split("\r\n"); buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!/^\d{3} /.test(line)) continue;
      const code = Number(line.slice(0, 3));
      if (waiter) { const w = waiter; waiter = null; w.resolve(code); }
      else replies.push(code);
    }
  });
  const reply = () => failure ? Promise.reject(failure) : replies.length
    ? Promise.resolve(replies.shift())
    : new Promise((resolve, reject) => { waiter = { resolve, reject }; });
  const command = async (line, expected) => {
    socket.write(`${line}\r\n`);
    if (await reply() !== expected) throw Error("SMTP_AUTH_OR_ENVELOPE_FAILED");
  };
  try {
    if (await reply() !== 220 || !socket.authorized) throw Error("SMTP_TLS_FAILED");
    await command("EHLO vynox-production.invalid", 250);
    await command(`AUTH PLAIN ${Buffer.from(`\0resend\0${smtpKey}`).toString("base64")}`, 235);
    await command("MAIL FROM:<production-auth@quicklychan.xyz>", 250);
    await command("RCPT TO:<delivered@resend.dev>", 250);
    await command("RSET", 250);
    await command("QUIT", 221);
    return { smtpAuthenticated: true, senderEnvelopeAccepted: true, tlsVerified: true,
      messageSent: false };
  } finally {
    socket.destroy();
  }
}
