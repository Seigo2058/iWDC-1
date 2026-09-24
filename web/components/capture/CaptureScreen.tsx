import Image from "next/image";
import type { ReactNode } from "react";

/** Layout shared by the capture flow's screens before the result (camera,
 *  photo check, crop, final confirmation): a row with the screen's hint (and
 *  a round button on some screens), a large frame, and a row of controls,
 *  exactly filling the viewport below the header so the frame takes
 *  whatever height is left and the controls never scroll out of reach. The
 *  frame is the full column width on phones and the largest square that
 *  fits (up to the design's 692px) on PC (Figma: "MacBook Pro 16' - 2",
 *  "- 4", "Cropped Screen", "- 6"). */
export function CaptureScreen({
  heading,
  frameClassName,
  frame,
  controls,
  topBar,
  className = "bg-[#f0f0f0]",
}: {
  /** Screen-reader heading; the designs show none. */
  heading: string;
  /** Frame corner radius, background, border and shadow. */
  frameClassName: string;
  frame: ReactNode;
  controls: ReactNode;
  /** The row above the frame (see CaptureTopBar). On phones these screens
   *  take the whole viewport (SiteHeader hides itself for them). */
  topBar: ReactNode;
  /** Page background. */
  className?: string;
}) {
  return (
    <div
      className={`flex h-dvh min-h-[32rem] flex-col items-center gap-5 px-5 pb-6 pt-5 font-brand md:h-[calc(100dvh-var(--site-header-height))] md:min-h-[40rem] md:gap-6 md:px-10 md:pb-10 md:pt-10 ${className}`}
    >
      <h1 className="sr-only">{heading}</h1>

      {/* 12px above the frame on phones, rather than the column's 20px. */}
      <div className="-mb-2 w-full max-w-[33rem] md:mb-0 md:max-w-[692px]">{topBar}</div>

      <div className="flex min-h-0 w-full max-w-[33rem] flex-1 justify-center md:max-w-none">
        <div
          className={`relative h-full w-full overflow-hidden md:aspect-square md:max-h-[692px] md:w-auto md:max-w-full ${frameClassName}`}
        >
          {frame}
        </div>
      </div>

      <div className="flex shrink-0 items-center">{controls}</div>
    </div>
  );
}

/** The row above the frame: the screen's message pill centered on the
 *  screen, with an optional round button flush with the frame's left edge
 *  (Back on the camera, reset on the crop screen). Two equal side columns,
 *  so a long message wraps instead of running into the button. */
export function CaptureTopBar({
  button,
  children,
  alert = false,
}: {
  button?: ReactNode;
  children: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_40px] items-center gap-1.5 md:grid-cols-[57px_1fr_57px] md:gap-3">
      <div>{button}</div>
      <MessagePill alert={alert} className="justify-self-center md:text-2xl">
        {children}
      </MessagePill>
    </div>
  );
}

/** Dark translucent round button for CaptureTopBar (40px on phones, 57px
 *  on PC). */
export function RoundOverlayButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full bg-black/50 shadow-[0_0_4px_rgba(0,0,0,0.32)] backdrop-blur-[6px] transition-opacity hover:opacity-85 disabled:opacity-50 md:size-[57px]"
    >
      {icon}
    </button>
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
    // 12px under the frame on PC, rather than the column's 24px.
    <div className="flex max-w-full items-center gap-5 md:-mt-3 md:gap-[42px]">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        aria-label={backLabel}
        className="flex h-[58px] w-[59px] shrink-0 items-center justify-center rounded-full bg-black/40 shadow-[0_0_5.2px_rgba(255,255,255,0.25)] transition-opacity hover:opacity-85 disabled:opacity-50 md:h-[120px] md:w-[123px] md:bg-black/[.29] md:shadow-[0_0_10.8px_rgba(255,255,255,0.25)]"
      >
        <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6 md:size-[50px]" />
      </button>
      <p className="min-w-0 text-center text-xl font-medium tracking-[-0.4px] text-[#564334] md:text-[45.75px] md:tracking-[-0.915px]">
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
