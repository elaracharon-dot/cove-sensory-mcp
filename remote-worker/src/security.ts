const PRIVATE_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0a000000, 0x0affffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0a80000, 0xc0a8ffff]
];

function ipv4ToNumber(hostname: string): number | undefined {
  const pieces = hostname.split(".");
  if (pieces.length !== 4) return undefined;
  const octets = pieces.map((piece) => Number(piece));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return undefined;
  }
  return octets.reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

function isPrivateAddress(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }
  const ipv4 = ipv4ToNumber(normalized);
  return ipv4 !== undefined && PRIVATE_IPV4_RANGES.some(([start, end]) => ipv4 >= start && ipv4 <= end);
}

export function validatePublicMediaUrl(source: string): URL {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error("媒体来源必须是完整的 HTTPS 网址。");
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
    throw new Error("媒体来源必须是不含登录信息的公开 HTTPS 网址。");
  }
  if (isPrivateAddress(url.hostname)) {
    throw new Error("不允许访问本机或内网媒体地址。");
  }
  return url;
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const leftDigest = await crypto.subtle.digest("SHA-256", leftBytes);
  const rightDigest = await crypto.subtle.digest("SHA-256", rightBytes);
  const a = new Uint8Array(leftDigest);
  const b = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}
