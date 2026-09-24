"use client";

import { useActionState, useState } from "react";
import {
  resetDrawsAction,
  saveParticipantsAction,
  type AdminState,
} from "@/app/actions";
import CandyButton from "@/components/CandyButton";

/**
 * Administrace pro organizátora: zadání pevného seznamu lidí a reset hry.
 *
 * Co tu vědomě NENÍ: výpis vylosovaných párů. Ani organizátor se nemá
 * dozvědět, kdo koho má — jinak by o překvapení přišel taky. Vidí jen počty.
 */
export default function AdminPanel({
  people,
  origin,
  progress,
  locked,
}: {
  people: { name: string; slug: string }[];
  /** Základ adresy pro osobní odkazy, např. `https://pipi-tree.vercel.app`. */
  origin: string;
  progress: { total: number; drawn: number };
  /** Už se losuje → seznam se nesmí měnit, jinak by se párování rozpadlo. */
  locked: boolean;
}) {
  const names = people.map((p) => p.name);
  const [saveState, save, saving] = useActionState<AdminState, FormData>(
    saveParticipantsAction,
    null,
  );
  const [resetState, reset, resetting] = useActionState<AdminState, FormData>(
    resetDrawsAction,
    null,
  );

  return (
    <div className="space-y-5">
      <Card title="Stav losování">
        <p className="text-2xl font-extrabold">
          <span className="text-gold">{progress.drawn}</span> z{" "}
          <span className="text-gold">{progress.total}</span> už losovalo
        </p>
        <p className="mt-1 text-sm text-cream/70">
          Páry se tu záměrně nezobrazují — ať máš překvapení i ty.
        </p>
        {progress.total > 0 && progress.drawn === progress.total && (
          <p className="mt-3 text-lg font-bold text-pine">
            🎉 Hotovo, vylosovali se všichni!
          </p>
        )}
      </Card>

      {people.length > 0 && <Links people={people} origin={origin} />}

      <Card title="Seznam lidí">
        {locked ? (
          <>
            <p className="text-cream/85">
              Už se losuje, takže seznam je zamčený. Změna jmen uprostřed losování by
              rozbila párování — nejdřív losování resetuj.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-cream/90">
              {names.map((name) => (
                <li key={name}>• {name}</li>
              ))}
            </ul>
          </>
        ) : (
          <form action={save} className="space-y-3">
            <label htmlFor="names" className="block text-sm text-cream/80">
              Jedno jméno na řádek, aspoň dva lidi. Piš <strong>jméno
              i příjmení</strong> — v losu se zobrazí přesně to, co tu zadáš,
              a podle samotného „Petra“ obdarovaný nepozná, o koho jde.
            </label>
            <textarea
              id="names"
              name="names"
              rows={10}
              defaultValue={names.join("\n")}
              placeholder={"Jana\nPetr\nŠtěpán\nŽofie"}
              className="w-full rounded-xl border-2 border-gold/60 bg-night/70 p-3 font-mono text-cream
                placeholder:text-cream/40 focus:border-gold focus:outline-none"
            />
            <CandyButton tone="pine" type="submit" disabled={saving}>
              {saving ? "Ukládám…" : "Uložit seznam"}
            </CandyButton>
          </form>
        )}
        <Result state={saveState} />
      </Card>

      <Card title="Reset losování">
        <p className="text-cream/85">
          Smaže <strong>všechny losy</strong> a losování začne od nuly. Seznam lidí
          zůstane. Vrátit to zpátky nejde.
        </p>
        <form action={reset} className="mt-3 flex flex-wrap items-center gap-3">
          <input
            name="confirm"
            placeholder="napiš RESET"
            aria-label="Potvrzení resetu"
            className="rounded-xl border-2 border-holly/70 bg-night/70 px-3 py-2 text-cream
              placeholder:text-cream/40 focus:border-holly focus:outline-none"
          />
          <CandyButton tone="holly" type="submit" disabled={resetting}>
            {resetting ? "Mažu…" : "Resetovat losy"}
          </CandyButton>
        </form>
        <Result state={resetState} />
      </Card>
    </div>
  );
}

/**
 * Osobní odkazy k rozeslání. Odkaz je odvozený ze jména, takže je krátký a dá
 * se nadiktovat po telefonu — a zároveň uhodnutelný, což je vědomá volba
 * (viz README). Každému pošli **jen ten jeho**.
 */
function Links({
  people,
  origin,
}: {
  people: { name: string; slug: string }[];
  origin: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API bez HTTPS nebo bez oprávnění — odkaz jde vždy označit myší.
      setCopied(null);
    }
  };

  const all = people.map((p) => `${p.name}: ${origin}/${p.slug}`).join("\n");

  return (
    <Card title="Osobní odkazy">
      <p className="text-sm text-cream/80">
        Každému pošli <strong>jen jeho vlastní</strong> odkaz. Kdo si ho uloží,
        vrátí se ke svému losu z jakéhokoli zařízení.
      </p>

      <ul className="mt-3 space-y-2">
        {people.map((p) => (
          <li
            key={p.slug}
            className="flex items-center justify-between gap-2 rounded-xl bg-night/60 px-3 py-2"
          >
            <span className="min-w-0">
              <span className="font-bold">{p.name}</span>
              <span className="block truncate text-sm text-frost">
                {origin}/{p.slug}
              </span>
            </span>
            <button
              onClick={() => copy(p.slug, `${origin}/${p.slug}`)}
              className="btn btn-gold shrink-0 px-3 py-1 text-sm"
            >
              {copied === p.slug ? "zkopírováno ✓" : "kopírovat"}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <CandyButton tone="plum" onClick={() => copy("__all__", all)}>
          {copied === "__all__" ? "Zkopírováno ✓" : "Kopírovat všechny"}
        </CandyButton>
      </div>
    </Card>
  );
}

function Result({ state }: { state: AdminState }) {
  if (!state) return null;
  return (
    <p className={`mt-3 font-bold ${state.ok ? "text-pine" : "text-holly"}`}>
      {state.ok ? "✅ " : "⚠️ "}
      {state.detail}
    </p>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-4 border-gold/70 bg-night/55 p-5">
      <h2 className="display mb-3 text-2xl">{title}</h2>
      {children}
    </section>
  );
}
