/**
 * Ověří pravidla hry proti skutečné databázi — koncovku i souběh.
 *
 *   npm run kontrola -- --force
 *
 * **Je to destruktivní**: opakovaně maže a znovu rozehrává losy, takže si
 * vyžádá `--force` a odmítne běžet, když je rozehraná hra. Na ostrá data
 * ji nepouštěj.
 *
 * Co kontroluje:
 *   1. poslední člověk v osudí vylosuje úspěšně a ne sám sebe
 *   2. každý dostane právě jeden dárek
 *   3. druhý los téhož dárce se odmítne, bez prozrazení
 *   4. souběh: všichni losují naráz → nikdy dva téhož obdarovaného
 *   5. souběh: tentýž člověk ve dvou kartách → uspěje právě jedna
 *   a pořád: nikdo neobdaroval nikoho z vlastní skupiny (pár, domácnost)
 */
import { getAssignment, listGroups, listParticipants, performDraw, progress, resetDraws } from "@/lib/db/queries/game";

let fail = 0;
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}${extra ? " — " + extra : ""}`);
  if (!ok) fail++;
};

async function main() {
  if (!process.argv.includes("--force")) {
    console.error(
      "Kontrola opakovaně maže losy. Spusť ji jen na testovací databázi:\n" +
        "  npm run kontrola -- --force",
    );
    process.exit(1);
  }

  const people = await listParticipants();
  if (people.length < 3) {
    console.error("Potřebuju aspoň tři lidi. Naplň seznam: npm run seed");
    process.exit(1);
  }
  const n = people.length;

  // Jméno → skupina. Pro kontrolu „ne partnerovi“ v každém kole.
  const groupOfName = new Map(
    (await listGroups()).flatMap((g, i) => g.map((name) => [name, i] as const)),
  );
  const sameGroup = (giver: string, receiver: string) =>
    groupOfName.get(giver) === groupOfName.get(receiver);

  // --- 1. Koncovka -------------------------------------------------------
  await resetDraws();
  for (const giver of people.slice(0, n - 1)) {
    const r = await performDraw(giver.id);
    if (r.status !== "ok") {
      check(`losuje ${giver.name}`, false, r.status);
      process.exit(1);
    }
  }
  check(`${n - 1} z ${n} vylosováno`, (await progress()).drawn === n - 1);

  const last = people[n - 1];
  const lastResult = await performDraw(last.id);
  check("poslední v osudí uspěl", lastResult.status === "ok", lastResult.status);
  if (lastResult.status === "ok") {
    check(
      "poslední neobdaroval sám sebe",
      lastResult.assignment.receiverName !== last.name,
      `${last.name} → ${lastResult.assignment.receiverName}`,
    );
  }

  // --- 2. Každý dostane právě jednou ------------------------------------
  const receivers = (await Promise.all(people.map((p) => getAssignment(p.id)))).map(
    (a) => a?.receiverName,
  );
  check("všichni mají los", receivers.every(Boolean));
  check("žádný obdarovaný dvakrát", new Set(receivers).size === n, `${new Set(receivers).size}/${n}`);
  check("nikdo neobdarovává sám sebe", people.every((p, i) => receivers[i] !== p.name));
  check(
    "nikdo neobdarovává nikoho ze své skupiny",
    people.every((p, i) => !sameGroup(p.name, receivers[i]!)),
  );

  // --- 3. Jen jedno losování --------------------------------------------
  const again = await performDraw(people[0].id);
  check("druhý los odmítnut", again.status === "already-drawn", again.status);
  check("odmítnutí neprozradí jméno", !("assignment" in again));

  // --- 4. Souběh: všichni naráz -----------------------------------------
  let badRounds = 0;
  let collisions = 0;
  let inGroup = 0;
  const ROUNDS = 8;
  for (let round = 0; round < ROUNDS; round++) {
    await resetDraws();
    const results = await Promise.all(people.map((p) => performDraw(p.id)));
    if (results.filter((r) => r.status === "ok").length !== n) badRounds++;
    const got = results.flatMap((r) => (r.status === "ok" ? [r.assignment.receiverName] : []));
    if (new Set(got).size !== got.length) collisions++;
    results.forEach((r, i) => {
      if (r.status === "ok" && sameGroup(people[i].name, r.assignment.receiverName)) inGroup++;
    });
  }
  check(`${ROUNDS} kol × ${n} souběžných losů: vždy všichni uspěli`, badRounds === 0, `${badRounds} kol selhalo`);
  check("nikdy si dva nevylosovali téhož obdarovaného", collisions === 0, `${collisions} kolizí`);
  check("ani v souběhu nikdo neobdaroval svou skupinu", inGroup === 0, `${inGroup} případů`);

  // --- 5. Souběh: tentýž člověk dvakrát ---------------------------------
  let doubles = 0;
  for (let round = 0; round < 10; round++) {
    await resetDraws();
    const giver = people[round % n];
    const both = await Promise.all([performDraw(giver.id), performDraw(giver.id)]);
    if (both.filter((r) => r.status === "ok").length !== 1) doubles++;
  }
  check("dvě karty téhož člověka: uspěje právě jedna", doubles === 0, `${doubles} odchylek`);

  await resetDraws();
  console.log(
    fail === 0
      ? "\nVŠE OK — hra je prázdná, můžeš losovat."
      : `\nSELHÁNÍ: ${fail}`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Kontrola spadla:", error);
  process.exit(1);
});
