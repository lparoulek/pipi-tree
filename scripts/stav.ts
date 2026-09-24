/**
 * Vypíše stav hry z příkazové řádky.
 *
 *   npm run stav            # jména, odkazy a kolik lidí už losovalo
 *   npm run stav -- --pary  # NAVÍC vylosované páry (rozbije překvapení!)
 *
 * Bez `--pary` vypisuje totéž co /admin, tedy jen počty — aplikace páry
 * záměrně nikde nezobrazuje, ani organizátorovi.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { draws, participants } from "@/lib/db/schema";
import { listGroups, listParticipants, progress } from "@/lib/db/queries/game";
import { giftLetter } from "@/lib/game/letters";

async function main() {
  const [people, groups, stats] = await Promise.all([listParticipants(), listGroups(), progress()]);

  if (people.length === 0) {
    console.log("Seznam je prázdný. Naplň ho: npm run seed");
    process.exit(0);
  }

  console.log("jméno            odkaz");
  console.log("─".repeat(38));
  for (const p of people) console.log(`${p.name.padEnd(16)} /${p.slug}`);

  const skupiny = groups.filter((g) => g.length > 1);
  if (skupiny.length > 0) {
    console.log("\nnavzájem se nelosují:");
    for (const g of skupiny) console.log(`  ${g.join(" + ")}`);
  }

  console.log(`\nvylosováno: ${stats.drawn} z ${stats.total}`);

  if (!process.argv.includes("--pary")) {
    console.log("(páry se nevypisují — spusť s --pary, jen když o překvapení nejde)");
    process.exit(0);
  }

  // Ladicí výpis. V ostré hře tímhle přijdeš o překvapení.
  const rows = await db
    .select({ giver: participants.name, receiverId: draws.receiverId })
    .from(draws)
    .innerJoin(participants, eq(participants.id, draws.giverId));

  const byId = new Map(people.map((p) => [p.id, p.name]));
  console.log("\n⚠️  PÁRY (spoiler):");
  for (const row of rows) {
    const receiver = byId.get(row.receiverId) ?? "?";
    console.log(
      `  ${row.giver.padEnd(16)} → ${receiver.padEnd(16)} (dárek na ${giftLetter(receiver)})`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Nepovedlo se:", error);
  process.exit(1);
});
