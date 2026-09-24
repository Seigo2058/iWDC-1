import { PageNotFound } from "@/components/error/PageNotFound";

/** notFound() anywhere under /[lang] (an unknown path, via [...rest], or a
 *  malformed dish id), rendered inside the language layout and its header. */
export default function LangNotFound() {
  return <PageNotFound />;
}
