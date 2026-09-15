import Image from "next/image";
import type { ReactNode } from "react";

/** Layout shared by the capture flow's screens before the result (camera,
 *  photo check, crop, final confirmation): a large frame over a row of
 *  controls, exactly filling the viewport below the header so the frame
 *  takes whatever height is left and the controls never scroll out of
 *  reach. The frame is the full column width on phones
 *  and the largest square that fits (up to the design's 720px) on PC. */
export function CaptureScreen({
  heading,
  frameClassName,
  frame,
  controls,
  phoneTopBar,
  className = "bg-[#f0f0f0]",
}: {
  /** Screen-reader heading; the designs show none. */
  heading: string;
  /** Frame corner radius, background, border and shadow. */
  frameClassName: string;
  frame: ReactNode;
  controls: ReactNode;
  /** A row above the frame on phones only, for a screen that takes the
   *  whole viewport there (SiteHeader hides itself for it, as on the phone
   *  camera screen) and so brings its own back button. */
  phoneTopBar?: ReactNode;
  /** Page background. */
  className?: string;
}) {
  const height = phoneTopBar
    ? "h-dvh md:h-[calc(100dvh-var(--site-header-height))]"
    : "h-[calc(100dvh-var(--site-header-height))]";

  return (
    <div
      className={`flex ${height} min-h-[32rem] flex-col items-center gap-5 px-5 pb-6 pt-5 font-brand md:min-h-[40rem] md:gap-[38px] md:px-10 md:pb-10 md:pt-[55px] ${className}`}
    >
      <h1 className="sr-only">{heading}</h1>

      {phoneTopBar && (
        // 12px above the frame in the design, rather than the column's 20px.
        <div className="-mb-2 w-full max-w-[33rem] md:hidden">{phoneTopBar}</div>
      )}

      <div className="flex min-h-0 w-full max-w-[33rem] flex-1 justify-center md:max-w-none">
        <div
          className={`relative h-full w-full overflow-hidden md:aspect-square md:max-h-[720px] md:w-auto md:max-w-full ${frameClassName}`}
        >
          {frame}
        </div>
      </div>

      <div className="flex shrink-0 items-center">{controls}</div>
    </div>
  );
}

/** Dark translucent pill for a hint, progress or an error. */
export function MessagePill({
  children,
  alert = false,
  className = "",
}: {
  children: ReactNode;
  alert?: boolean;
  className?: string;
}) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className={`rounded-2xl bg-black/50 p-2.5 text-center text-base leading-[normal] text-white shadow-[0_0_8px_rgba(0,0,0,0.32),0_1px_1px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.02)] backdrop-blur-[12px] ${className}`}
    >
      {children}
    </p>
  );
}

const ONLY_CLASS = { phone: "md:hidden", pc: "max-md:hidden" } as const;

/** MessagePill at the bottom of the frame. `only` limits it to phones (the
 *  PC designs show no hint, so for text that is only a hint) or to PC (for
 *  a screen whose phone layout shows it elsewhere). Click-through, so it
 *  never blocks a crop handle underneath it. */
export function FrameMessage({
  children,
  alert = false,
  only,
}: {
  children: ReactNode;
  alert?: boolean;
  only?: keyof typeof ONLY_CLASS;
}) {
  return (
    <MessagePill
      alert={alert}
      className={`pointer-events-none absolute bottom-5 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 md:bottom-9 md:px-5 md:text-2xl ${only ? ONLY_CLASS[only] : ""}`}
    >
      {children}
    </MessagePill>
  );
}

/** "‹  label  ✓" row under the frame of the photo check, crop and final
 *  confirmation screens (Figma: Frame 69): a grey round Back, the screen's
 *  question or title, and the orange round check mark to go on. */
export function DecisionControls({
  label,
  backLabel,
  onBack,
  backDisabled = false,
  nextLabel,
  onNext,
  nextDisabled = false,
}: {
  label: string;
  backLabel: string;
  onBack: () => void;
  backDisabled?: boolean;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex max-w-full items-center gap-5 md:gap-[42px]">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        aria-label={backLabel}
        className="flex h-[58px] w-[59px] shrink-0 items-center justify-center rounded-full bg-black/40 shadow-[0_0_5.2px_rgba(255,255,255,0.25)] transition-opacity hover:opacity-85 disabled:opacity-50 md:h-[120px] md:w-[123px] md:bg-black/[.29] md:shadow-[0_0_10.8px_rgba(255,255,255,0.25)]"
      >
        <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6 md:size-[50px]" />
      </button>
      <p className="min-w-0 text-center text-xl font-medium tracking-[-0.4px] text-[#564334] md:text-[41.6px] md:tracking-[-0.83px]">
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={nextLabel}
        className="h-[58px] w-[59px] shrink-0 rounded-full transition active:scale-95 disabled:opacity-50 md:h-[120px] md:w-[123px]"
      >
        <Image src="/images/icons/confirm-check.svg" alt="" width={59} height={58} className="size-full" />
      </button>
    </div>
  );
}
