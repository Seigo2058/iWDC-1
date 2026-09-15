import type { ReactNode } from "react";

/** Buttons fixed to the bottom of the screen over a scrolling page, on a
 *  band of the page background that fades out upward over the content
 *  (Figma: the gradient behind the allergy screen's Back / Save and the
 *  dish list's Back). Pages using it need bottom padding so their last
 *  content can scroll clear of it. `className` adds padding/gaps. */
export function FixedBottomBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-10 flex justify-center bg-linear-to-t from-[#f0f0f0] from-[73.6%] via-[rgba(240,240,240,0.59)] via-[87.4%] to-[rgba(240,240,240,0)] px-5 ${className}`}
    >
      {children}
    </div>
  );
}
