import { describe, expect, it } from "vitest";
import { canStillFinish, drawReceiver, eligibleReceivers } from "@/lib/game/draw";

/** Deterministická náhoda, ať jsou pády testů reprodukovatelné. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomIntFrom(rng: () => number) {
  return (max: number) => Math.floor(rng() * max);
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([item, ...p]);
  });
  return out;
}

/**
 * Hrubou silou: existuje úplné párování dárců na příjemce, kde nikdo nedaruje
 * sám sobě? Referenční implementace, proti které ověřujeme `canStillFinish`
 * odvozené z Hallovy podmínky.
 */
function bruteForceHasMatching(givers: readonly string[], receivers: readonly string[]): boolean {
  if (givers.length !== receivers.length) return false;
  return permutations(receivers).some((order) => givers.every((g, i) => g !== order[i]));
}

describe("canStillFinish", () => {
  it("souhlasí s hrubou silou na všech malých kombinacích", () => {
    const pool = ["a", "b", "c", "d"];
    let checked = 0;

    // Všechny podmnožiny dárců × všechny stejně velké podmnožiny příjemců.
    const subsets = (xs: string[]): string[][] =>
      xs.reduce<string[][]>((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]]);

    for (const givers of subsets(pool)) {
      for (const receivers of subsets(pool)) {
        if (givers.length !== receivers.length) continue;
        for (const ordered of permutations(receivers)) {
          expect(canStillFinish(givers, ordered)).toBe(
            bruteForceHasMatching(givers, ordered),
          );
          checked++;
        }
      }
    }

    expect(checked).toBeGreaterThan(100);
  });

  it("uvázne jen když zbývá jeden člověk a je to on sám", () => {
    expect(canStillFinish(["a"], ["a"])).toBe(false);
    expect(canStillFinish(["a"], ["b"])).toBe(true);
    expect(canStillFinish([], [])).toBe(true);
  });

  it("nestejně velké množiny jsou nekonzistentní stav", () => {
    expect(canStillFinish(["a", "b"], ["a"])).toBe(false);
  });
});

describe("eligibleReceivers", () => {
  it("nikdy nenabídne losujícího sebe samého", () => {
    const options = eligibleReceivers("a", {
      remainingGivers: ["a", "b", "c"],
      remainingReceivers: ["a", "b", "c"],
    });
    expect(options).not.toContain("a");
    expect(options.sort()).toEqual(["b", "c"]);
  });

  it("vynechá volbu, po které by poslednímu zbylo jen jeho jméno", () => {
    // Losuje `a`. Zbývá ještě dárce `b`, volní příjemci jsou `b` a `c`.
    // Kdyby si `a` vzal `c`, musel by `b` darovat sám sobě.
    const options = eligibleReceivers("a", {
      remainingGivers: ["a", "b"],
      remainingReceivers: ["b", "c"],
    });
    expect(options).toEqual(["b"]);
  });

  it("poslednímu dárci zbyde jeho jediná legální možnost", () => {
    const options = eligibleReceivers("b", {
      remainingGivers: ["b"],
      remainingReceivers: ["c"],
    });
    expect(options).toEqual(["c"]);
  });
});

describe("drawReceiver", () => {
  it("nepustí k losování někoho, kdo už losoval", () => {
    const result = drawReceiver(
      "x",
      { remainingGivers: ["a", "b"], remainingReceivers: ["a", "b"] },
      () => 0,
    );
    expect(result).toBeNull();
  });

  it("celá hra vždy dojde do konce a je to derangement", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const pick = randomIntFrom(rng);
      const size = 2 + (seed % 9); // 2..10 lidí
      const people = Array.from({ length: size }, (_, i) => `p${i}`);

      // Losují v náhodném pořadí — nikdo nehlídá, kdo si otevře appku první.
      const order = [...people].sort(() => rng() - 0.5);

      let remainingGivers = [...people];
      let remainingReceivers = [...people];
      const pairs = new Map<string, string>();

      for (const giver of order) {
        const receiver = drawReceiver(
          giver,
          { remainingGivers, remainingReceivers },
          pick,
        );
        expect(receiver, `seed ${seed}: ${giver} nemá koho losovat`).not.toBeNull();
        pairs.set(giver, receiver!);
        remainingGivers = remainingGivers.filter((g) => g !== giver);
        remainingReceivers = remainingReceivers.filter((r) => r !== receiver);
      }

      // Každý daruje právě jednou…
      expect(pairs.size).toBe(size);
      // …každý dostane právě jeden dárek…
      expect(new Set(pairs.values()).size).toBe(size);
      // …a nikdo nedaruje sám sobě.
      for (const [giver, receiver] of pairs) expect(giver).not.toBe(receiver);
    }
  });

  it("koncovka: poslednímu zbyde jediná možnost a není to on sám", () => {
    // Sedm z osmi už losovalo. Poslední dárce `h` má mezi příjemci jen `a`.
    const options = eligibleReceivers("h", {
      remainingGivers: ["h"],
      remainingReceivers: ["a"],
    });
    expect(options).toEqual(["a"]);

    const drawn = drawReceiver(
      "h",
      { remainingGivers: ["h"], remainingReceivers: ["a"] },
      () => 0,
    );
    expect(drawn).toBe("a");
  });

  it("koncovka: kdo už dárek dostal, znovu se vylosovat nedá", () => {
    // `b` a `c` už někdo vylosoval, takže v `remainingReceivers` vůbec nejsou
    // a nabídnout se nemohou — ani omylem, ani při posledním losu.
    const options = eligibleReceivers("a", {
      remainingGivers: ["a", "d"],
      remainingReceivers: ["d", "e"],
    });
    expect(options).not.toContain("b");
    expect(options).not.toContain("c");
  });

  it("jediný zbylý příjemce nesmí být sám losující — to je neřešitelný stav", () => {
    // Kdyby hra do tohoto stavu dojela, nesmí vrátit „obdaruj sám sebe“,
    // ale hlasitě nic. Kontrola proveditelnosti tomu předchází už dřív.
    expect(
      drawReceiver("z", { remainingGivers: ["z"], remainingReceivers: ["z"] }, () => 0),
    ).toBeNull();
  });

  it("u dvou lidí je výsledek jednoznačný", () => {
    const first = drawReceiver(
      "a",
      { remainingGivers: ["a", "b"], remainingReceivers: ["a", "b"] },
      () => 0,
    );
    expect(first).toBe("b");
  });

  it("nabídne i toho, kdo už sám losoval, ale dárek ještě nemá", () => {
    // Důležité pro správnost: množina „kdo ještě nelosoval“ a množina
    // „koho ještě nikdo nedostal“ jsou dvě různé věci. `b` už losoval
    // (není mezi dárci), ale dárek ještě nedostal, takže se losovat má.
    const options = eligibleReceivers("a", {
      remainingGivers: ["a", "c", "d"],
      remainingReceivers: ["b", "c", "d"],
    });
    expect(options.sort()).toEqual(["b", "c", "d"]);
  });

  it("v koncovce vyloučí volbu, která by uvázla", () => {
    // Zbývá dárce `c` a příjemci `b`, `c`. Kdyby si `a` vzal `b`,
    // musel by `c` darovat sám sobě — takže mu zbývá jen `c`.
    const options = eligibleReceivers("a", {
      remainingGivers: ["a", "c"],
      remainingReceivers: ["b", "c"],
    });
    expect(options).toEqual(["c"]);
  });
});
