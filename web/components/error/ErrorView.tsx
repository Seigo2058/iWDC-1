"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";

export interface ErrorViewAction {
  label: string;
  onClick: () => void;
}

const CODE_CLASS =
  "text-[64px] font-bold leading-none text-[#564334] md:text-[clamp(64px,5.8vw,100px)]";

/** The error screen design (Figma: "Error" / "MacBook Pro 16' - 9"), shared
 *  by every error in the app: a big status line, the illustration, a title
 *  and message, then a gray Back button and an orange primary action.
 *  Phones stack everything on the page background; from md it sits in a
 *  white card, the illustration on the left. Fills the viewport below the
 *  header. */
export function ErrorView({
  code,
  title,
  message,
  back,
  primary,
}: {
  code: string;
  title: string;
  message: string;
  back: ErrorViewAction;
  primary: ErrorViewAction;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--site-header-height))] flex-col items-center justify-center bg-[#f0f0f0] px-gutter py-8 font-brand md:py-12">
      <div className="flex w-full flex-col items-center md:flex-row md:gap-[4%] md:rounded-[32px] md:bg-white md:px-[3.8%] md:py-[49px] md:shadow-[0_0_16px_rgba(0,0,0,0.24)]">
        <p className={`${CODE_CLASS} md:hidden`}>{code}</p>

        <Image
          src="/images/errors/recipe-not-found.jpg"
          alt=""
          width={1513}
          height={1355}
          sizes="(min-width: 48rem) min(446px, 28vw), 286px"
          className="mt-5 aspect-square w-[286px] max-w-full rounded-2xl object-cover md:mt-0 md:w-[34%] md:max-w-[446px] md:shrink-0"
        />

        {/* w-full: the button row's fixed width would otherwise size this
            column (and push it past the gutters on narrow phones) instead
            of max-w-full clamping the row to it. */}
        <div className="flex w-full min-w-0 flex-col items-center text-center text-[#564334] md:w-auto md:flex-1">
          <p className={`${CODE_CLASS} hidden md:block`}>{code}</p>
          <h1 className="mt-5 text-[32px] font-medium leading-tight tracking-[-0.64px] md:mt-6 md:text-[30px] md:tracking-[-0.6px]">
            {title}
          </h1>
          <p className="mt-0.5 text-base md:mt-1">{message}</p>

          <div className="mt-11 flex w-[345px] max-w-full gap-[9px] md:mt-10 md:w-[503px] md:gap-3">
            <button
              type="button"
              onClick={back.onClick}
              className="flex h-[78px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#b5b5b5] px-[30px] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-85 md:h-[clamp(78px,6.95vw,120px)] md:gap-3 md:px-[clamp(30px,2.7vw,46px)]"
            >
              <Image
                src="/images/icons/chevron-left.svg"
                alt=""
                width={24}
                height={24}
                className="size-6 md:size-[clamp(24px,2.14vw,37px)]"
              />
              {back.label}
            </button>
            <button
              type="button"
              onClick={primary.onClick}
              className="flex h-[78px] min-w-0 flex-1 basis-[198px] items-center justify-center rounded-full bg-[#ff8500] px-4 text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-90 md:h-[clamp(78px,6.95vw,120px)] md:basis-[305px] md:text-[clamp(20px,1.78vw,30.77px)] md:tracking-[-0.6px]"
            >
              {primary.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Back (to the previous page, or home when this page was opened directly)
 *  and Home, the actions most error screens offer. */
export function useErrorActions(): { back: ErrorViewAction; home: ErrorViewAction } {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  return {
    back: {
      label: t("errorPage.back"),
      onClick: () => {
        if (window.history.length > 1) router.back();
        else router.push(`/${lang}`);
      },
    },
    home: { label: t("errorPage.home"), onClick: () => router.push(`/${lang}`) },
  };
}
