import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Velké tlačítko. Vzhled — gradient, lesk, vrstvený stín — je ve třídách
 * `.btn*` v `app/globals.css`; tady zůstává jen volba odstínu a velikosti.
 * Vrstvené `box-shadow` se v Tailwindu jako inline hodnoty psát nedají
 * rozumně, proto to výjimečně není utilitami.
 */

const TONES = {
  holly: "btn-holly",
  pine: "btn-pine",
  gold: "btn-gold",
  candy: "btn-candy",
  plum: "btn-plum",
} as const;

const SIZES = {
  md: "px-6 py-3 text-lg",
  lg: "px-9 py-4 text-2xl",
} as const;

export type CandyTone = keyof typeof TONES;

export default function CandyButton({
  tone = "holly",
  size = "md",
  /** Zlatý prstenec pro tu jednu hlavní akci na stránce. */
  hero = false,
  className = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  tone?: CandyTone;
  size?: keyof typeof SIZES;
  hero?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={`btn ${TONES[tone]} ${SIZES[size]} ${hero ? "btn-hero" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
