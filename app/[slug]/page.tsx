import { notFound, redirect } from "next/navigation";
import PersonalDraw from "@/components/PersonalDraw";
import Backdrop from "@/components/Backdrop";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  allNames,
  findParticipantByLooseSlug,
  getAssignment,
} from "@/lib/db/queries/game";

/** Stav hry se mění každým losem, takže se nesmí nic cachovat. */
export const dynamic = "force-dynamic";

/**
 * Osobní stránka jednoho člověka: `/jannovak`.
 *
 * Odkaz sám je identita. Je odvozený ze jména, tedy uhodnutelný — vědomá
 * volba ve prospěch jednoduchosti (viz README, sekce o tajnosti). Díky tomu se
 * los nedá ztratit: kdo si odkaz uloží, vrátí se k němu z jakéhokoli zařízení.
 */
export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isDatabaseConfigured()) notFound();

  const { slug } = await params;

  // Tolerujeme i jiný zápis (`/Jan-Novák`, `/JanNovak`) — přesný tvar si nikdo
  // nepamatuje. `catch` je jen kolem dotazu, aby nepohltil `redirect`/`notFound`,
  // které fungují přes výjimku.
  const person = await findParticipantByLooseSlug(slug).catch((error) => {
    console.error("[slug] databáze neodpovídá", error);
    return null;
  });
  if (!person) notFound();

  // Ať si uloží kanonickou adresu, ne svůj překlep.
  if (person.slug !== slug) redirect(`/${person.slug}`);

  const [names, assignment] = await Promise.all([allNames(), getAssignment(person.id)]);

  return (
    <>
      <Backdrop />
      <PersonalDraw person={person} names={names} initialAssignment={assignment} />
    </>
  );
}
