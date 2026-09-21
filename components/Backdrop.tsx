import Snow from "@/components/Snow";

/**
 * Pozadí pro všechny stránky hry: fotka rozsvíceného stromečku, ztmavení
 * a sněžení.
 *
 * Fotka je z Unsplash (licence dovoluje volné použití bez uvádění autora,
 * podrobnosti v `public/pozadi-LICENCE.txt`). Vybraná je záměrně **tmavá** —
 * na světlé by pestré UI zmizelo. Dvě velikosti: na mobil výřez na výšku, ať
 * se stromeček nezmenší na nic, na větší displeje širokoúhlá verze.
 *
 * Fialový závoj není kosmetika: sjednocuje teplou zlatou fotky s fialovou
 * paletou aplikace a drží kontrast pod textem.
 */
export default function Backdrop() {
  return (
    <>
      {/*
        Dvě velikosti, obě s vlastním výřezem. V širokoúhlé verzi je stromeček
        záměrně vlevo od středu: obsah je na středu, takže na středu by ho celý
        zakryl a z fotky by zbylo ploché fialovo. Posouvat to přes
        `background-position` nešlo — při `cover` fotka šířku vyplní přesně
        a není kam hýbat, takže je posun zapečený už ve výřezu obrázku.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/pozadi-mobil.webp')] bg-cover bg-center bg-no-repeat sm:bg-[url('/pozadi.webp')]"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] bg-night/35" />
      {/* Tmavší nahoře i dole, ať vynikne titulek a spodní okraj obsahu. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-night/75 via-transparent to-night/70"
      />
      <Snow />
    </>
  );
}
