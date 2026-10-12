import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Provider tokens stay encrypted server-side; the browser receives only an opaque cookie. */
export function sessionCodec(secret: string) {
  if (secret.length < 32) throw new Error("Strong Staging session encryption is required.");
  const key = createHash("sha256").update("vynox/supabase-auth/staging/session/v1\0").update(secret).digest();
  const aad = Buffer.from("vynox-supabase-auth-staging-v1");
  return {
    seal(value: unknown): string {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(aad);
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString("base64url");
    },
    open<T>(envelope: string): T {
      if (!/^[A-Za-z0-9_-]+$/.test(envelope) || envelope.length > 32768)
        throw new Error("Invalid encrypted session.");
      const bytes = Buffer.from(envelope, "base64url");
      if (bytes.length < 29) throw new Error("Invalid encrypted session.");
      const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      decipher.setAAD(aad);
      decipher.setAuthTag(bytes.subarray(12, 28));
      // Do not parse/use any plaintext before GCM final() authenticates the envelope.
      const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
      return JSON.parse(plaintext.toString("utf8")) as T;
    },
  };
}

export function cookieDigest(cookie: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(cookie)) throw new Error("Invalid opaque session.");
  return createHash("sha256").update(cookie).digest("hex");
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}
