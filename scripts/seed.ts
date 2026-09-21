/**
 * Naplní databázi testovacími jmény.
 *
 *   npm run seed            # naplní, pokud se ještě nelosovalo
 *   npm run seed -- --force # smaže i rozehrané losy a začne znovu
 *
 * Tenhle seznam je **jediné místo**, kde jsou testovací jména zapsaná — ať se
 * nemusí hledat v historii příkazů. Klidně si ho přepiš.
 */
import { listParticipants, progress, replaceParticipants, resetDraws } from "@/lib/db/queries/game";

/**
 * Testovací obsazení — vždy **jméno i příjmení**, jako ve skutečné hře.
 * V losu se zobrazuje přesně to, co je tady, takže „Petr“ samotný by
 * obdarovanému nestačil k rozpoznání.
 *
 * Záměrně obsahuje pasti, na kterých se dá něco rozbít:
 *   - dva Petrové         → proto je příjmení potřeba (odkazy se liší)
 *   - Štěpán, Žofie, Řehoř → diakritika ve jménu i v písmenu dárku
 *   - Christián           → digraf „Ch“ je česky jedno písmeno
 *   - Cyril               → naopak samotné „C“ se na „Ch“ splést nesmí
 */
const TESTOVACI_JMENA = [
  "Jan Novák",
  "Petr Svoboda",
  "Petr Novotný",
  "Štěpán Říha",
  "Žofie Dvořáková",
  "Christián Hájek",
  "Cyril Bílek",
  "Řehoř Krátký",
];

async function main() {
  const force = process.argv.includes("--force");

  const before = await progress();
  if (before.drawn > 0) {
    if (!force) {
      console.error(
        `Už se losuje (${before.drawn} z ${before.total}). Seznam se v rozehrané hře měnit nesmí —\n` +
          "rozpadlo by se párování. Když je to opravdu jen test, spusť: npm run seed -- --force",
      );
      process.exit(1);
    }
    console.log(`Mažu ${before.drawn} rozehraných losů (--force).`);
    await resetDraws();
  }

  const result = await replaceParticipants(TESTOVACI_JMENA);
  if (!result.ok) {
    console.error("Nepovedlo se:", result.detail);
    process.exit(1);
  }

  const people = await listParticipants();
  console.log(result.detail);
  console.log("\njméno            odkaz");
  console.log("─".repeat(38));
  for (const p of people) console.log(`${p.name.padEnd(16)} /${p.slug}`);
  console.log("\nOdkazy k rozeslání najdeš i v /admin.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed selhal:", error);
  process.exit(1);
});
