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
  names,
  progress,
  locked,
}: {
  names: string[];
  progress: { total: number; drawn: number };
  /** Už se losuje → seznam se nesmí měnit, jinak by se párování rozpadlo. */
  locked: boolean;
}) {
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
          <SeznamForm key={names.join("\n")} names={names} save={save} saving={saving} />
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
 * Formulář se seznamem. Text drží ve vlastním stavu: React po odeslání
 * formuláře nekontrolovaná pole vrací na `defaultValue`, takže při chybě
 * (třeba dvě stejná jména) by zmizelo všechno napsané. Po úspěšném uložení
 * se formulář přes `key` založí znovu s uloženým, očištěným seznamem.
 */
function SeznamForm({
  names,
  save,
  saving,
}: {
  names: string[];
  save: (formData: FormData) => void;
  saving: boolean;
}) {
  const [text, setText] = useState(names.join("\n"));

  return (
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
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Jana\nPetr\nŠtěpán\nŽofie"}
        className="w-full rounded-xl border-2 border-gold/60 bg-night/70 p-3 font-mono text-cream
          placeholder:text-cream/40 focus:border-gold focus:outline-none"
      />
      <CandyButton tone="pine" type="submit" disabled={saving}>
        {saving ? "Ukládám…" : "Uložit seznam"}
      </CandyButton>
    </form>
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
