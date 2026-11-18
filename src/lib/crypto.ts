import { createHash, randomBytes, createHmac, timingSafeEqual } from "crypto";
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export function hmacSha256Hex(secret: string, msg: string) { return createHmac("sha256", secret).update(msg).digest("hex"); }
export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex"), bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}
