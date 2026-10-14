import { createHash } from "node:crypto";

type Session = { digest: string; subject: string };

/** Read-only historical proof: removing exactly one new Owner row must reproduce
 * the original full session fingerprint. Never rewrite the baseline or accept a
 * missing/substituted session merely because total counts look plausible. */
export function preservesSessionsWithOneOwnerAddition(
  previous: { count: number; hash: string }, current: Session[], owner: string,
): boolean {
  if (current.length !== previous.count + 1 ||
      new Set(current.map(row => row.digest)).size !== current.length) return false;
  return current.some((row, index) => row.subject === owner &&
    createHash("sha256").update(JSON.stringify(current.filter((_, i) => i !== index)))
      .digest("hex") === previous.hash);
}
