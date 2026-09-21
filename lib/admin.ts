import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/**
 * Admin (zadání seznamu, reset) je za HTTP Basic heslem. Brána je v `proxy.ts`,
 * ale dokumentace Next.js k server actions je nekompromisní: „render-time
 * gating není bezpečnostní hranice“ — na action se dá poslat POST i mimo UI.
 * Proto se heslo kontroluje ještě jednou uvnitř každé admin akce.
 */

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function equals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Přišel požadavek se správným Basic heslem? */
export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const header = (await headers()).get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return equals(password, expected);
}
