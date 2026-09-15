/** A progress message whose trailing "..." (every language's progress
 *  strings end in it) is animated, the dots appearing one by one. They keep
 *  their full width throughout, so centered text doesn't jiggle, and stand
 *  still for users who prefer reduced motion. */
export function ProgressText({ text }: { text: string }) {
  const base = text.replace(/(\.{3}|…)$/, "");
  if (base === text) return text;

  return (
    <>
      {base}
      <span aria-hidden="true" className="inline-block animate-ellipsis motion-reduce:animate-none">
        ...
      </span>
    </>
  );
}
