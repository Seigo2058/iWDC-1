/** Stands in for a photo on a Recent Scan card that holds several dishes
 *  (recent-scans.md 4.2): three plates overlapping, so it reads as "a spread
 *  of dishes" rather than any single one. */
export function MultiDishIllustration({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={className}
    >
      <rect width="120" height="120" className="fill-amber-50" />

      {/* Back left: curry */}
      <circle cx="42" cy="44" r="27" className="fill-white stroke-zinc-200" strokeWidth="1.5" />
      <circle cx="42" cy="44" r="19" fill="#f59e0b" />
      <circle cx="35" cy="39" r="4.5" fill="#fde68a" />
      <circle cx="48" cy="50" r="4" fill="#fde68a" />
      <path d="M44 34 q6 -4 9 2 q-6 3 -9 -2z" fill="#65a30d" />

      {/* Back right: soup */}
      <circle cx="82" cy="42" r="23" className="fill-white stroke-zinc-200" strokeWidth="1.5" />
      <circle cx="82" cy="42" r="16" fill="#ea580c" />
      <path d="M74 40 q4 -6 9 -2 q-3 5 -9 2z" fill="#fdba74" />
      <path d="M84 46 q4 -6 9 -2 q-3 5 -9 2z" fill="#fdba74" />
      <circle cx="80" cy="34" r="2.5" fill="#16a34a" />

      {/* Front: rice with greens */}
      <circle cx="60" cy="80" r="30" className="fill-white stroke-zinc-200" strokeWidth="1.5" />
      <circle cx="60" cy="80" r="22" fill="#fef9c3" />
      <path d="M50 76 q8 -10 16 -2 q-8 7 -16 2z" fill="#4d7c0f" />
      <path d="M60 86 q7 -8 14 -1 q-7 6 -14 1z" fill="#65a30d" />
      <circle cx="51" cy="88" r="3" fill="#dc2626" />
      <circle cx="70" cy="74" r="2.5" fill="#dc2626" />
    </svg>
  );
}
