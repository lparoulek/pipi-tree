import { describe, expect, it } from "vitest";
import { assignSlugs, toSlug, toSlugFromUrl } from "@/lib/game/slug";

describe("toSlug", () => {
  it("udělá z jména jednoduchý odkaz", () => {
    expect(toSlug("Jan Novák")).toBe("jannovak");
  });

  it("zahodí českou diakritiku", () => {
    expect(toSlug("Štěpán")).toBe("stepan");
    expect(toSlug("Žofie Řehořová")).toBe("zofierehorova");
    expect(toSlug("Kůň")).toBe("kun");
    expect(toSlug("Ďáblík Ťopan")).toBe("dabliktopan");
  });

  it("vyhodí mezery, pomlčky, tečky a diakritické znaky", () => {
    expect(toSlug("Anna-Marie Nováková")).toBe("annamarienovakova");
    expect(toSlug("  Jana   M.  ")).toBe("janam");
  });

  it("čísla ve jméně zůstanou", () => {
    expect(toSlug("Jana 2")).toBe("jana2");
  });

  it("z nepoužitelného jména vrátí prázdno", () => {
    expect(toSlug("🎄🎁")).toBe("");
    expect(toSlug("   ")).toBe("");
  });
});

describe("toSlug jako oprava překlepů v odkazu", () => {
  // Přesný tvar odkazu si nikdo nepamatuje. Všechny tyhle zápisy musí vést
  // na stejného člověka — na tom stojí `findParticipantByLooseSlug`.
  it("srovná všechny tvary, které člověk může napsat", () => {
    const variants = [
      "Jan Novák",
      "jan novak",
      "Jan-Novák",
      "jan-novak",
      "JanNovak",
      "jan_novak",
      "jan.novak",
      "  Jan  Novák  ",
      "JAN NOVÁK",
      "jannovak",
    ];
    for (const v of variants) {
      expect(toSlug(v), `tvar ${JSON.stringify(v)}`).toBe("jannovak");
    }
  });

  it("nesrovná dva různé lidi na jedno", () => {
    expect(toSlug("Jan Novák")).not.toBe(toSlug("Jana Novotná"));
  });

  it("číselnou příponu z kolize nechá být", () => {
    // Kdo dostal `jannovak2`, musí se na svůj odkaz pořád dostat.
    expect(toSlug("jannovak2")).toBe("jannovak2");
  });
});

describe("toSlugFromUrl", () => {
  it("dekóduje diakritiku z adresního řádku", () => {
    // Bez dekódování by z %C3%A1 vyšlo „c3a1“ a odkaz by skončil na 404.
    expect(toSlugFromUrl("Jan-Nov%C3%A1k")).toBe("jannovak");
    expect(toSlugFromUrl("JAN%20NOV%C3%81K")).toBe("jannovak");
    expect(toSlugFromUrl("%C5%A0t%C4%9Bp%C3%A1n")).toBe("stepan");
  });

  it("zvládne i nezakódovaný vstup", () => {
    expect(toSlugFromUrl("jannovak")).toBe("jannovak");
    expect(toSlugFromUrl("Jan-Novák")).toBe("jannovak");
  });

  it("na rozbitém escapu nespadne", () => {
    expect(() => toSlugFromUrl("%")).not.toThrow();
    expect(() => toSlugFromUrl("jan%zznovak")).not.toThrow();
    expect(toSlugFromUrl("%")).toBe("");
  });
});

describe("assignSlugs", () => {
  it("dá každému vlastní odkaz", () => {
    expect(assignSlugs(["Jana", "Petr"])).toEqual([
      { name: "Jana", slug: "jana" },
      { name: "Petr", slug: "petr" },
    ]);
  });

  it("kolizi rozliší číslem — jinak by si dva viděli do losů", () => {
    const result = assignSlugs(["Jana Nováková", "Jan Anováková", "Jana Nováková "]);
    expect(result.map((r) => r.slug)).toEqual([
      "jananovakova",
      "jananovakova2",
      "jananovakova3",
    ]);
  });

  it("jméno bez použitelných znaků dostane náhradní odkaz", () => {
    const result = assignSlugs(["🎄", "Petr"]);
    expect(result[0].slug).toBe("clen1");
    expect(result[1].slug).toBe("petr");
  });

  it("slugy jsou vždy unikátní", () => {
    const names = ["Ann", "Anna", "ann", "A n n", "Änn"];
    const slugs = assignSlugs(names).map((r) => r.slug);
    expect(new Set(slugs).size).toBe(names.length);
  });
});
