"use client";

import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";

/** A dish's reference photo, falling back to an icon when there is no URL
 *  or the image fails to load (recent-scans.md 4.2). */
export function DishPhoto({
  src,
  className,
}: {
  src: string | null;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-black/[.05] dark:bg-white/[.08]`}
      >
        <UtensilsCrossed aria-hidden="true" size={28} className="text-zinc-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external URL from the database, not a local/static asset
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`${className} bg-black/[.05] object-cover dark:bg-white/[.08]`}
    />
  );
}
