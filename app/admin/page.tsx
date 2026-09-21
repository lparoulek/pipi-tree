import { headers } from "next/headers";
import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";
import { isDatabaseConfigured } from "@/lib/db/client";
import { hasAnyDraw, listParticipants, progress } from "@/lib/db/queries/game";

/** Stav hry se mění losováním, takže žádná cache. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Pipi Tree — administrace" };

/**
 * Administrace. Přístup hlídá HTTP Basic v `proxy.ts`; každá akce si
 * oprávnění kontroluje ještě sama (`lib/admin.ts`).
 */
export default async function AdminPage() {
  if (!isDatabaseConfigured()) {
    return (
      <Shell>
        <p className="text-cream/85">
          Chybí <code className="rounded bg-night px-1">DATABASE_URL</code>. Bez databáze
          se seznam lidí nikam neuloží.
        </p>
      </Shell>
    );
  }

  // JSX se staví až za try/catch — chyby při renderu by se do něj nezachytily
  // (a ESLint na to správně upozorňuje). Tady hlídáme jen dotazy do databáze.
  let data: {
    people: { name: string; slug: string }[];
    origin: string;
    stats: { total: number; drawn: number };
    locked: boolean;
  };

  try {
    const [people, stats, started, head] = await Promise.all([
      listParticipants(),
      progress(),
      hasAnyDraw(),
      headers(),
    ]);

    // Odkazy se skládají z hostitele požadavku, ať fungují lokálně i na Vercelu.
    const host = head.get("host") ?? "localhost:3000";
    const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

    data = {
      people: people.map((p) => ({ name: p.name, slug: p.slug })),
      origin: `${proto}://${host}`,
      stats,
      locked: started,
    };
  } catch (error) {
    console.error("[admin] nepodařilo se načíst stav", error);
    return (
      <Shell>
        <p className="text-cream/85">
          Databáze neodpovídá. Zkontroluj připojení a jestli jsou vytvořené tabulky
          (<code className="rounded bg-night px-1">npm run db:push</code>).
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <AdminPanel
        people={data.people}
        origin={data.origin}
        progress={data.stats}
        locked={data.locked}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="display text-4xl">Administrace</h1>
        <Link href="/" className="text-frost underline hover:text-gold">
          ← zpátky na losování
        </Link>
      </header>
      {children}
    </main>
  );
}
