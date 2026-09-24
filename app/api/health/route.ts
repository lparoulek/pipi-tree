import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/lib/db/client";

/** Jednoduchý health check — jede databáze? Užitečné po deployi. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, detail: "chybí DATABASE_URL" }, { status: 503 });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] databáze neodpovídá", error);
    // Jen kód chyby (`28P01`, `ENOTFOUND`, `ERR_INVALID_URL`…), ne zprávu —
    // ta může obsahovat adresu serveru. Kód stačí, aby se po deployi dalo
    // poznat, co je špatně, bez lovení v logu Vercelu.
    const kod =
      error instanceof Error ? ((error as Error & { code?: string }).code ?? error.name) : "neznámá";
    return Response.json({ ok: false, detail: "databáze neodpovídá", kod }, { status: 503 });
  }
}
