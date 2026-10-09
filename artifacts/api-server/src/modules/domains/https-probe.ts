import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

/** Block SSRF, including IPv4-mapped IPv6 and mixed public/private DNS responses. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    // Canonicalize expanded/mixed notation before checking mapped/private ranges.
    address = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  }
  if (address.toLowerCase().startsWith("::ffff:")) {
    const tail = address.slice(7);
    if (isIP(tail) === 4) return isPublicAddress(tail);
    const match = /^([a-f0-9]{1,4}):([a-f0-9]{1,4})$/i.exec(tail);
    if (!match) return false;
    const number = (parseInt(match[1], 16) * 65536) + parseInt(match[2], 16);
    return isPublicAddress([24, 16, 8, 0].map(shift => (number >>> shift) & 255).join("."));
  }
  if (isIP(address) === 6) {
    // Only globally routable unicast; exclude documentation and special-use space.
    return /^[23]/i.test(address) && !/^2001:(?:db8|0|2|10|20)(?::|$)/i.test(address) && !/^2002:/i.test(address);
  }
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export async function fetchHostingProof(domain: string, nonce: string): Promise<string> {
  let dnsDeadline: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(domain, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => { dnsDeadline = setTimeout(() => reject(new Error("dns_timeout")), 4000); }),
  ]).finally(() => clearTimeout(dnsDeadline));
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error("unsafe_dns");
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    // DNS pinning prevents a rebind between validation and the actual connection.
    // TLS hostname validation remains enabled; redirects are deliberately rejected.
    const req = request({
      hostname: domain, servername: domain, family: pinned.family, port: 443, method: "GET",
      path: `/api/public/domains/${encodeURIComponent(domain)}/hosting-proof/${nonce}`,
      lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
      rejectUnauthorized: true, headers: { Accept: "application/json", "User-Agent": "QXLayer-domain-verification/1" },
    }, res => {
      if (res.statusCode !== 200 || !res.headers["content-type"]?.includes("application/json")) {
        res.resume(); reject(new Error("wrong_route")); return;
      }
      let body = "";
      res.on("data", chunk => {
        body += chunk.toString();
        if (body.length > 4096) { res.destroy(); reject(new Error("large_response")); }
      });
      res.on("error", reject);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (typeof data.proof !== "string" || !/^[a-f0-9]{64}$/.test(data.proof)) throw new Error("bad_proof");
          resolve(data.proof);
        } catch { reject(new Error("bad_proof")); }
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error("timeout")), 6000);
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end();
  });
}
