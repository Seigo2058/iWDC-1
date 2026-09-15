/* eslint-disable @next/next/no-img-element -- tiny local SVGs positioned by
   percentage insets; next/image adds nothing for them */

/** Where each allergen's glyph sits inside its square box, copied from the
 *  Figma "Allergens" component set: the outer inset places the glyph's
 *  bounding box, and the (mostly negative) inner inset lets its stroke spill
 *  past that box. CSS `inset` shorthand order. */
const GLYPH_INSETS: Record<string, { outer: string; inner: string }> = {
  shrimp: { outer: "12.5% 13.89% 11.62% 12.5%", inner: "-2.75% -2.83%" },
  shellfish: { outer: "17.44% 11.88% 16.67% 11.88%", inner: "-3.16% -2.73%" },
  crab: { outer: "12.5%", inner: "-2.85% -2.78% -2.78% -2.78%" },
  fish: { outer: "20.83% 8.33% 20.83% 12.5%", inner: "-3.57% -3.12% -3.57% -2.63%" },
  beef: { outer: "14.49% 10.15% 15.95% 9.57%", inner: "-3% -2.6%" },
  chicken: { outer: "3.47% 1.39% -0.7% 1.39%", inner: "0" },
  egg: { outer: "16.67% 8.33% 12.5% 8.33%", inner: "-2.94% -2.5%" },
  milk: { outer: "12.5% 29.17% 12.5% 33.33%", inner: "-5.56% -11.11%" },
  apple: { outer: "8.33% 17.88% 16.86% 17.88%", inner: "-3.4% -3.24% -2.78% -3.24%" },
  banana: { outer: "5.98% -6.34% -6.34% 5.98%", inner: "0" },
  kiwi: { outer: "16.71% 12.5% 14.66% 13.46%", inner: "-3.04% -2.81%" },
  treeNuts: { outer: "16.67% 20.32% 12.5% 19.87%", inner: "-2.94% -3.48% -3.1% -3.48%" },
  peanuts: { outer: "16.67% 25% 15.52% 20.83%", inner: "-1.23% -3.85% -2.36% -3.85%" },
  lupine: { outer: "-3.5% -3.59% -2.83% -2.74%", inner: "0" },
  soy: { outer: "12.5% 16.67%", inner: "-2.78% -3.13%" },
  celery: { outer: "-5.44% -5.14% -8.14% -8.44%", inner: "0" },
  mushroom: { outer: "19.52% 12.95% 18.63% 12.87%", inner: "-3.37% -2.81%" },
  gluten: { outer: "12.5%", inner: "-2.78%" },
  gelatin: { outer: "12.5% 11.28% 16.67% 11.28%", inner: "-3.59% -2.69% -2.94% -2.69%" },
};

/** The same for the bigger, finer-stroked glyphs of the allergy selection
 *  cards (Figma: Allergen Card, 49px), in public/images/allergens/card. */
const CARD_GLYPH_INSETS: Record<string, { outer: string; inner: string }> = {
  shrimp: { outer: "12.5% 13.89% 11.62% 12.5%", inner: "-2.69% -2.77%" },
  shellfish: { outer: "17.44% 11.88% 16.67% 11.88%", inner: "-3.1% -2.68% -3.09% -2.68%" },
  crab: { outer: "12.5%", inner: "-2.79% -2.72% -2.72% -2.72%" },
  fish: { outer: "16.67% 5.56% 12.56% 4.17%", inner: "0 0 0 -0.97%" },
  beef: { outer: "14.49% 10.15% 15.95% 9.57%", inner: "-2.93% -2.54%" },
  chicken: { outer: "16.67% 7.18% 12.72% 8.33%", inner: "-2.89% -2.42%" },
  egg: { outer: "16.67% 8.33% 12.5% 8.33%", inner: "-2.88% -2.45%" },
  milk: { outer: "12.5% 29.17% 12.5% 33.33%", inner: "-2.72% -5.44%" },
  apple: { outer: "8.33% 17.88% 16.86% 17.88%", inner: "-3.33% -3.18% -2.73% -3.18%" },
  banana: { outer: "5.98% -6.34% -6.34% 5.98%", inner: "0" },
  kiwi: { outer: "16.71% 12.5% 14.66% 13.46%", inner: "-2.97% -2.76%" },
  treeNuts: { outer: "12.5% 20.83% 9.58% 20.83%", inner: "-1.96% 0 0 0" },
  peanuts: { outer: "16.67% 25% 15.52% 20.83%", inner: "-1.17% -3.77% -2.29% -3.77%" },
  lupine: { outer: "-3.5% -3.59% -2.83% -2.74%", inner: "0" },
  soy: { outer: "12.5% 16.67%", inner: "-2.72% -3.06%" },
  celery: { outer: "-5.44% -5.14% -8.14% -8.44%", inner: "0" },
  mushroom: { outer: "13.08% 20.66% 14.27% 17.47%", inner: "-2.81% -3.3%" },
  gluten: { outer: "13.44% 13.44% 14.44% 14.44%", inner: "-2.83% -2.83% -2% -2%" },
  gelatin: { outer: "12.5% 11.28% 16.67% 11.28%", inner: "-3.51% -2.64% -2.88% -2.64%" },
};

export function hasAllergenIcon(id: string): boolean {
  return id in GLYPH_INSETS;
}

/** A selection card's allergen glyph, drawn in the current text color
 *  (orange, or white on a selected card): the SVG is used as a mask, so its
 *  own stroke color doesn't matter. Size it with `className`. Decorative. */
export function AllergenCardIcon({ id, className = "" }: { id: string; className?: string }) {
  const insets = CARD_GLYPH_INSETS[id];
  if (!insets) return null;

  const mask = `url(/images/allergens/card/${id}.svg) center / 100% 100% no-repeat`;
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-clip ${className}`}>
      <span className="absolute" style={{ inset: insets.outer }}>
        <span
          className="absolute bg-current"
          style={{ inset: insets.inner, mask, WebkitMask: mask }}
        />
      </span>
    </span>
  );
}

/** Line icon for an allergen id (public/images/allergens/<id>.svg). The
 *  exported glyphs are white; the filter turns them into the design's
 *  #595959 gray. Size it with `className` (e.g. `size-6`). Decorative:
 *  callers provide the allergen's name as text. */
export function AllergenIcon({ id, className = "" }: { id: string; className?: string }) {
  const insets = GLYPH_INSETS[id];
  if (!insets) return null;

  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-clip ${className}`}>
      <span className="absolute" style={{ inset: insets.outer }}>
        <span className="absolute" style={{ inset: insets.inner }}>
          <img
            src={`/images/allergens/${id}.svg`}
            alt=""
            className="block size-full brightness-0 invert-[0.35]"
          />
        </span>
      </span>
    </span>
  );
}
