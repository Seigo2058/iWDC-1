import { notFound } from "next/navigation";

/** Any path under a valid language that no route matches (e.g. /en/xyz).
 *  Without this, Next.js falls back to the root not-found, outside the
 *  language layout (no header, no translations). */
export default function UnknownPath() {
  notFound();
}
