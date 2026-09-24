import { describe, expect, it } from "vitest";
import { auditDraws, type AuditDraw, type AuditPerson } from "@/lib/game/audit";

// a+b jsou pár, c, d, e jednotlivci.
const people: AuditPerson[] = [
  { id: "a", groupKey: "ab" },
  { id: "b", groupKey: "ab" },
  { id: "c", groupKey: "c" },
  { id: "d", groupKey: "d" },
  { id: "e", groupKey: "e" },
];

const draw = (pairs: string): AuditDraw[] =>
  pairs
    .split(" ")
    .filter(Boolean)
    .map((p) => ({ giverId: p[0], receiverId: p[1] }));

const failed = (d: AuditDraw[]) =>
  auditDraws(people, d)
    .checks.filter((c) => !c.ok)
    .map((c) => c.label);

describe("auditDraws", () => {
  it("dokončené správné losování projde celé", () => {
    const audit = auditDraws(people, draw("ac bd ce da eb"));
    expect(audit.complete).toBe(true);
    expect(audit.checks.every((c) => c.ok)).toBe(true);
    expect(audit.checks.map((c) => c.label)).toContain(
      "Všichni vylosovali a každý dostane právě jeden dárek",
    );
  });

  it("rozehrané losování, které jde dokončit, projde", () => {
    const audit = auditDraws(people, draw("ac bd"));
    expect(audit.complete).toBe(false);
    expect(audit.checks.every((c) => c.ok)).toBe(true);
  });

  it("bez losů je všechno v pořádku", () => {
    expect(failed([])).toEqual([]);
  });

  it("odhalí los uvnitř páru", () => {
    expect(failed(draw("ab bc ca de ed"))).toContain(
      "Nikdo si nevylosoval partnera ani nikoho z domácnosti",
    );
  });

  it("odhalí dárek sám sobě", () => {
    expect(failed(draw("cc"))).toContain("Nikdo si nevylosoval sám sebe");
  });

  it("odhalí dva dárky pro jednoho", () => {
    expect(failed(draw("ac bc"))).toContain("Nikdo nedostal dva dárky");
  });

  it("odhalí dvojí los téhož dárce", () => {
    expect(failed(draw("ac ad"))).toContain("Nikdo nelosoval dvakrát");
  });

  it("odhalí los někoho, kdo v seznamu není", () => {
    expect(failed(draw("xc"))).toContain("Každý los patří lidem ze seznamu");
  });

  it("odhalí rozehrané losování, které už dokončit nejde", () => {
    // c, d, e rozdali a dostali mezi sebou; zbyl jen pár a+b sám na sebe.
    expect(failed(draw("cd de ec"))).toContain("Zbytek losování jde dokončit");
  });

  it("výsledek neobsahuje žádná jména ani ID", () => {
    const text = JSON.stringify(auditDraws(people, draw("ab cc")));
    for (const id of ["\"a\"", "\"b\"", "\"c\""]) expect(text).not.toContain(id);
  });
});
