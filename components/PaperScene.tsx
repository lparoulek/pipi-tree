/**
 * Vánoční krajina z vystřiženého papíru: hory, kopce, perníková vesnička,
 * les, závěj a v rozích dva ozdobené stromky.
 *
 * Dojem papíru nedělají obrázky, ale tři triky: každá vrstva je jedna plochá
 * silueta, vrhá `drop-shadow` na vrstvu za sebou (`.papir` v `globals.css`)
 * a přes všechno leží jemné zrno.
 *
 * Tvary jsou generované z náhody **s pevným semínkem** — ze stejného důvodu
 * jako vločky: jiná čísla na serveru a v prohlížeči by rozbila hydrataci.
 * Počítá se jednou při načtení modulu, ne při každém vykreslení.
 *
 * Krajinné vrstvy sdílejí jeden `viewBox` a `xMidYMax slice`, takže se
 * zarovnávají ke spodnímu okraji a na úzkém mobilu se jen ořízne do stran.
 * Proto jsou generované po celé šířce: ať se ořízne cokoli, vypadá to celé.
 * Stromky a měsíc jsou mimo — kdyby byly ve scéně, na mobilu by je ořez
 * uřízl, tak se kotví k rohům obrazovky.
 *
 * Každá vrstva má `--hloubka`: o kolik pixelů se nejvýš posune, když se
 * hne myš (viz `PaperParallax`). Bližší vrstva = větší posun.
 */

import PaperParallax from "@/components/PaperParallax";

const W = 1600;
const H = 900;
/** Spodek siluet leží pod okrajem, aby paralaxa neodkryla mezeru. */
const DNO = H + 120;

type Bod = [number, number];

function nahoda(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zaokrouhlení na desetiny — kratší `d` a žádné plovoucí ocásky. */
const n = (v: number) => Math.round(v * 10) / 10;
const mezi = (a: Bod, b: Bod, t: number): Bod => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * Všechny podcesty se kreslí po směru hodinových ručiček. Při výplni
 * `nonzero` by se překryvy opačně točených tvarů vyrušily a v lese by
 * vznikly díry.
 */
function hreben(r: () => number, zaklad: number, rozkmit: number, krok: number) {
  const body: Bod[] = [];
  for (let x = -80; x < W + 80 + krok; x += krok * (0.75 + r() * 0.5)) {
    body.push([x, zaklad + (r() * 2 - 1) * rozkmit]);
  }
  let d = `M${n(body[0][0])} ${DNO} L${n(body[0][0])} ${n(body[0][1])}`;
  for (let i = 1; i < body.length - 1; i++) {
    const [sx, sy] = mezi(body[i], body[i + 1], 0.5);
    d += ` Q${n(body[i][0])} ${n(body[i][1])} ${n(sx)} ${n(sy)}`;
  }
  const posledni = body[body.length - 1];
  d += ` L${n(posledni[0])} ${n(posledni[1])} L${n(posledni[0])} ${DNO} Z`;

  /** Přibližná výška hřebene — stačí k „zasazení“ domků a stromů. */
  const vyskaNa = (x: number) => {
    const i = body.findIndex((b) => b[0] > x);
    if (i <= 0) return body[0][1];
    return mezi(body[i - 1], body[i], (x - body[i - 1][0]) / (body[i][0] - body[i - 1][0]))[1];
  };
  return { d, vyskaNa };
}

function hory(r: () => number) {
  const body: Bod[] = [];
  let x = -100;
  let vrchol = r() > 0.5;
  while (x < W + 200) {
    body.push([x, vrchol ? 410 + r() * 80 : 545 + r() * 30]);
    x += 90 + r() * 120;
    vrchol = !vrchol;
  }
  let d = `M${n(body[0][0])} ${DNO}`;
  for (const [bx, by] of body) d += ` L${n(bx)} ${n(by)}`;
  d += ` L${n(body[body.length - 1][0])} ${DNO} Z`;

  // Sněhové čepice s cik-cak spodním okrajem, jen na opravdových vrcholech.
  let cepice = "";
  for (let i = 1; i < body.length - 1; i++) {
    const v = body[i];
    if (v[1] > body[i - 1][1] || v[1] > body[i + 1][1]) continue;
    const L = mezi(v, body[i - 1], 0.3);
    const P = mezi(v, body[i + 1], 0.3);
    const z1 = mezi(L, P, 0.33);
    const z2 = mezi(L, P, 0.66);
    cepice +=
      `M${n(v[0])} ${n(v[1])} L${n(P[0])} ${n(P[1])} L${n(z2[0])} ${n(z2[1] - 10)}` +
      ` L${n((z1[0] + z2[0]) / 2)} ${n(z1[1] + 4)} L${n(z1[0])} ${n(z1[1] - 10)} L${n(L[0])} ${n(L[1])} Z`;
  }
  return { d, cepice };
}

function smrk(x: number, pata: number, h: number) {
  const kmen = h * 0.12;
  const tw = Math.max(2, h * 0.04);
  let d = `M${n(x - tw)} ${n(pata - kmen - 4)} L${n(x + tw)} ${n(pata - kmen - 4)} L${n(x + tw)} ${n(pata)} L${n(x - tw)} ${n(pata)} Z`;
  for (let i = 0; i < 3; i++) {
    const vrch = pata - h + i * (h - kmen) * 0.27;
    const spod = Math.min(vrch + (h - kmen) * 0.46, pata - kmen);
    const pul = h * (0.16 + i * 0.08);
    d += ` M${n(x)} ${n(vrch)} L${n(x + pul)} ${n(spod)} L${n(x - pul)} ${n(spod)} Z`;
  }
  return d;
}

function vesnice(r: () => number) {
  const zem = hreben(r, 690, 14, 180);
  const c = { komin: "", zed: "", strecha: "", snih: "", okna: "", dvere: "" };

  for (let x = 30 + r() * 60; x < W + 40; x += 150 + r() * 120) {
    const w = 46 + r() * 30;
    const h = 34 + r() * 20;
    const pata = zem.vyskaNa(x + w / 2) + 12;
    const hore = pata - h;
    const presah = 8;
    const vrch: Bod = [x + w / 2, hore - (24 + r() * 14)];
    const levy: Bod = [x - presah, hore];
    const pravy: Bod = [x + w + presah, hore];

    if (r() > 0.45) {
      const kx = x + w * 0.68;
      c.komin += `M${n(kx)} ${n(vrch[1] + 4)} L${n(kx + 9)} ${n(vrch[1] + 4)} L${n(kx + 9)} ${n(hore)} L${n(kx)} ${n(hore)} Z `;
    }
    c.zed += `M${n(x)} ${n(hore)} L${n(x + w)} ${n(hore)} L${n(x + w)} ${n(pata)} L${n(x)} ${n(pata)} Z `;
    c.strecha += `M${n(levy[0])} ${n(levy[1])} L${n(vrch[0])} ${n(vrch[1])} L${n(pravy[0])} ${n(pravy[1])} Z `;

    const sL = mezi(vrch, levy, 0.72);
    const sP = mezi(vrch, pravy, 0.72);
    c.snih +=
      `M${n(vrch[0])} ${n(vrch[1] - 4)} L${n(sP[0] + 3)} ${n(sP[1])} L${n(sP[0] - 2)} ${n(sP[1] + 7)}` +
      ` L${n(vrch[0])} ${n(vrch[1] + 11)} L${n(sL[0] + 2)} ${n(sL[1] + 7)} L${n(sL[0] - 3)} ${n(sL[1])} Z `;

    const s = 9 + r() * 3;
    const oy = hore + h * 0.28;
    const oken = w > 60 ? 2 : 1;
    for (let i = 0; i < oken; i++) {
      const ox = oken === 1 ? x + w * 0.25 - s / 2 : x + w * (0.22 + i * 0.4) - s / 2;
      c.okna += `M${n(ox)} ${n(oy)} L${n(ox + s)} ${n(oy)} L${n(ox + s)} ${n(oy + s)} L${n(ox)} ${n(oy + s)} Z `;
    }
    if (oken === 1) {
      const dx = x + w * 0.62;
      c.dvere += `M${n(dx)} ${n(pata - 22)} L${n(dx + 11)} ${n(pata - 22)} L${n(dx + 11)} ${n(pata)} L${n(dx)} ${n(pata)} Z `;
    }
  }
  return { zem: zem.d, ...c };
}

function les(r: () => number) {
  const zem = hreben(r, 780, 16, 200);
  let tmave = "";
  let svetle = "";
  for (let x = -30; x < W + 40; x += 22 + r() * 30) {
    if (r() < 0.22) continue;
    const strom = smrk(x, zem.vyskaNa(x) + 16, 60 + r() * 75);
    if (r() > 0.5) tmave += strom + " ";
    else svetle += strom + " ";
  }
  return { zem: zem.d, tmave, svetle };
}

function zavej(r: () => number) {
  const zem = hreben(r, 858, 12, 240);
  const hule = [260, 700, 1370].map((x) => {
    const x0 = x + (r() * 2 - 1) * 30;
    const pata = zem.vyskaNa(x0) + 24;
    const vrch = pata - 70 - r() * 20;
    return `M${n(x0)} ${n(pata)} L${n(x0)} ${n(vrch)} A12 12 0 0 1 ${n(x0 + 24)} ${n(vrch)} L${n(x0 + 24)} ${n(vrch + 10)}`;
  });
  return { zem: zem.d, hule };
}

function hvezdy(r: () => number) {
  return Array.from({ length: 110 }, (_, i) => {
    const trpyt = r() < 0.55;
    const doba = 2 + r() * 3;
    return {
      key: i,
      x: n(r() * W),
      y: n(r() * 470),
      r: n(0.8 + r() * 1.6),
      zlata: r() < 0.3,
      // Záporné zpoždění — viz vločky ve `Snow.tsx`.
      styl: trpyt ? { animationDuration: `${n(doba)}s`, animationDelay: `${n(-r() * doba)}s` } : undefined,
    };
  });
}

type Ozdoba = { x: number; y: number; r: number; barva: string };
const BARVY_OZDOB = ["fill-holly", "fill-gold", "fill-candy", "fill-frost", "fill-plum"] as const;

function stromek(seed: number) {
  const r = nahoda(seed);
  const cx = 120;
  let d = `M${cx - 12} 360 L${cx + 12} 360 L${cx + 12} 400 L${cx - 12} 400 Z`;
  const ozdoby: Ozdoba[] = [];
  for (let i = 0; i < 4; i++) {
    const vrch = 44 + i * 68;
    const spod = vrch + 116;
    const pul = 42 + i * 24;
    // Spodní hrana patra je prohnutá — rovná vypadala jako trojúhelník z geometrie.
    d += ` M${cx} ${vrch} L${cx + pul} ${spod} Q${cx} ${spod + 20} ${cx - pul} ${spod} Z`;
    const kusu = 2 + i;
    for (let k = 0; k < kusu; k++) {
      const t = (k + 0.5) / kusu;
      ozdoby.push({
        x: n(cx - pul * 0.8 + t * pul * 1.6 + (r() * 2 - 1) * 5),
        y: n(spod - 4 + Math.sin(t * Math.PI) * 12 - r() * 8),
        r: n(5 + r() * 3),
        barva: BARVY_OZDOB[Math.floor(r() * BARVY_OZDOB.length)],
      });
    }
  }
  return { d, ozdoby };
}

function hvezda(cx: number, cy: number, R: number) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const uhel = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : R * 0.45;
    d += `${i === 0 ? "M" : "L"}${n(cx + Math.cos(uhel) * rr)} ${n(cy + Math.sin(uhel) * rr)} `;
  }
  return d + "Z";
}

const r = nahoda(20261224);
const HVEZDY = hvezdy(r);
const HORY = hory(r);
const KOPCE = hreben(r, 600, 28, 170).d;
const VESNICE = vesnice(r);
const LES = les(r);
const ZAVEJ = zavej(r);
const STROMKY = [stromek(24), stromek(12)];
const HVEZDA_NA_SPICI = hvezda(120, 40, 24);

const scena = "papir-vrstva absolute inset-0 h-full w-full overflow-visible";
const hloubka = (px: number) => ({ "--hloubka": px }) as React.CSSProperties;
const vrstva = (px: number, stin: number) => ({ "--hloubka": px, "--stin": stin }) as React.CSSProperties;

export default function PaperScene() {
  return (
    <PaperParallax>
      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="papir-zar" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="rozmazane" />
            <feMerge>
              <feMergeNode in="rozmazane" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="papir-zrno">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      <svg className={scena} style={hloubka(3)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        {HVEZDY.map((h) => (
          <circle
            key={h.key}
            cx={h.x}
            cy={h.y}
            r={h.r}
            className={`${h.zlata ? "fill-gold" : "fill-cream"} ${h.styl ? "anim-twinkle" : ""}`}
            style={h.styl}
          />
        ))}
      </svg>

      <svg
        style={hloubka(5)}
        className="papir-vrstva papir papir-mesic absolute top-3 right-3 w-14 sm:top-[7%] sm:right-[8%] sm:w-28"
        viewBox="-50 -50 100 100"
      >
        <circle r="44" className="fill-cream" />
        <circle cx="-14" cy="-10" r="10" className="fill-paper-snow" />
        <circle cx="13" cy="9" r="7" className="fill-paper-snow" />
        <circle cx="-5" cy="20" r="5" className="fill-paper-snow" />
        <circle cx="19" cy="-17" r="4" className="fill-paper-snow" />
      </svg>

      <svg className={`papir ${scena}`} style={vrstva(8, 3)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={HORY.d} className="fill-paper-far" />
        <path d={HORY.cepice} className="fill-paper-hill" />
      </svg>

      <svg className={`papir ${scena}`} style={vrstva(12, 4)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={KOPCE} className="fill-paper-hill" />
      </svg>

      <svg className={`papir ${scena}`} style={vrstva(17, 5)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={VESNICE.komin} className="fill-paper-wall" />
        <path d={VESNICE.zed} className="fill-paper-wall" />
        <path d={VESNICE.strecha} className="fill-holly" />
        <path d={VESNICE.snih} className="fill-cream" />
        <path d={VESNICE.okna} className="fill-gold" filter="url(#papir-zar)" />
        <path d={VESNICE.dvere} className="fill-night-2" />
        <path d={VESNICE.zem} className="fill-paper-snow" />
      </svg>

      <svg className={`papir ${scena}`} style={vrstva(24, 6)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={LES.tmave} className="fill-paper-pine" />
        <path d={LES.svetle} className="fill-pine" />
        <path d={LES.zem} className="fill-paper-drift" />
      </svg>

      <svg className={`papir ${scena}`} style={vrstva(32, 7)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        {/* Cukrová hůl: krémový tah a přes něj přerušovaný červený = proužky. */}
        {ZAVEJ.hule.map((d) => (
          <g key={d} fill="none" strokeLinecap="round" strokeWidth="9">
            <path d={d} className="stroke-cream" />
            <path d={d} className="stroke-holly" strokeDasharray="7 8" strokeLinecap="butt" />
          </g>
        ))}
        <path d={ZAVEJ.zem} className="fill-cream" />
      </svg>

      {STROMKY.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 240 400"
          className={`papir-vrstva papir absolute bottom-0 aspect-[3/5] h-[24vh] max-h-[440px] sm:h-[42vh] ${i === 0 ? "-left-10" : "-right-10"}`}
          style={vrstva(42, 8)}
        >
          <path d={s.d} className="fill-paper-pine" />
          {s.ozdoby.map((o) => (
            <g key={`${o.x}-${o.y}`}>
              <circle cx={o.x} cy={o.y} r={o.r} className={o.barva} />
              <circle cx={o.x - o.r * 0.35} cy={o.y - o.r * 0.35} r={o.r * 0.3} className="fill-cream" opacity="0.7" />
            </g>
          ))}
          <path d={HVEZDA_NA_SPICI} className="fill-gold" filter="url(#papir-zar)" />
        </svg>
      ))}

      <svg className="papir-zrno absolute inset-0 h-full w-full">
        <rect width="100%" height="100%" filter="url(#papir-zrno)" />
      </svg>
    </PaperParallax>
  );
}
