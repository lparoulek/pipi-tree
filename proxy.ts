import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Brána pro /admin (v Next.js 16 se `middleware.ts` jmenuje `proxy.ts`).
 *
 * Drží se doporučení z dokumentace: žádné sdílené moduly ani databáze, jen
 * porovnání s proměnnou prostředí. Skutečná kontrola oprávnění je ještě jednou
 * uvnitř každé admin akce (`lib/admin.ts`), protože na server action se dá
 * poslat POST i mimo UI.
 */
export function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  // Bez nastaveného hesla je administrace zavřená — lepší než otevřená všem.
  if (!expected) {
    return new NextResponse("Administrace není nastavená (chybí ADMIN_PASSWORD).", {
      status: 503,
    });
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password === expected) return NextResponse.next();
  }

  return new NextResponse("Přihlas se.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pipi Tree admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
