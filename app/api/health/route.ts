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
    return Response.json({ ok: false, detail: "databáze neodpovídá" }, { status: 503 });
  }
}
