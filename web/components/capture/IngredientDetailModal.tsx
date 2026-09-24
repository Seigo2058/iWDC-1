"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { ProgressText } from "@/components/ui/ProgressText";
import { useT } from "@/lib/i18n/useT";
import {
  fetchIngredientDetail,
  getCachedIngredientDetail,
} from "@/lib/ingredient/fetchIngredientDetail";
import type {
  IngredientDetail,
  IngredientDetailFailureReason,
} from "@/lib/ingredient/types";

// The "What is it?" / "Made of" boxes (Figma: gray rounded cards). From md
// the whole popup is the phone design scaled ~1.455x, the ratio the dish
// page's PC cards use, so it matches the page it opens over.
const SECTION_CLASS =
  "flex flex-col gap-2 rounded-2xl bg-[#f4f4f4] p-4 md:gap-3 md:rounded-[23px] md:p-[23px]";
const SECTION_TITLE_CLASS = "text-xl leading-5 font-medium md:text-[29px] md:leading-[29px]";
const SECTION_BODY_CLASS = "text-base leading-5 break-words md:text-[23.3px] md:leading-[29px]";

type State =
  | { status: "loading" }
  | { status: "success"; detail: IngredientDetail }
  | { status: "error"; reason: IngredientDetailFailureReason };

interface IngredientDetailModalProps {
  ingredient: string;
  onClose: () => void;
}

/** Mount with `key={ingredient}` so each ingredient starts from a fresh state;
 *  once unmounted, a late answer is ignored (ingredient-detail.md 5.1). */
export function IngredientDetailModal({
  ingredient,
  onClose,
}: IngredientDetailModalProps) {
  const t = useT();
  const lang = useLang();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, setState] = useState<State>(() => {
    const cached = getCachedIngredientDetail(ingredient, lang);
    return cached
      ? { status: "success", detail: cached }
      : { status: "loading" };
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Entering "loading" (on mount without a cached result, or via retry)
  // starts a request; after leaving it or unmounting, its answer is ignored.
  const needsFetch = state.status === "loading";

  useEffect(() => {
    if (!needsFetch) return;

    let ignore = false;
    fetchIngredientDetail(ingredient, lang).then((result) => {
      if (ignore) return;
      setState(
        result.outcome === "success"
          ? { status: "success", detail: result.detail }
          : { status: "error", reason: result.reason },
      );
    });

    return () => {
      ignore = true;
    };
  }, [needsFetch, ingredient, lang]);

  // The dialog's `close` event is dispatched asynchronously and Chrome holds it
  // back while the page is hidden, so the parent is told synchronously here;
  // otherwise the modal can stay mounted-but-closed and tapping the same
  // ingredient again would not reopen it. `dialog.close()` still runs first so
  // the browser returns focus to the ingredient button.
  const closedRef = useRef(false);
  const notifyClosed = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };
  const close = () => {
    dialogRef.current?.close();
    notifyClosed();
  };

  const handleRetry = () => setState({ status: "loading" });

  return (
    // Centered on every screen size, over a dimmed page (Figma: ingredient
    // popup, "Frame 68"; 348px wide on phones, 506px from md).
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: route through close() instead of the native close.
        event.preventDefault();
        close();
      }}
      onClose={notifyClosed}
      onClick={(event) => {
        // Clicks on the dialog element itself land on the backdrop area; the
        // panel's own content is inside the inner div.
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-[348px] max-w-[calc(100%-2rem)] md:w-[506px] overflow-visible bg-transparent p-0 backdrop:bg-black/50"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col gap-2 overflow-y-auto rounded-3xl bg-white px-[13px] pb-[15px] pt-3 font-brand md:gap-3 md:rounded-[35px] md:px-[19px] md:pb-[22px] md:pt-[17px] text-[#564334] shadow-[0_0_4px_rgba(0,0,0,0.32),0_1px_0.5px_rgba(0,0,0,0.05),0_4px_6px_rgba(0,0,0,0.03),0_12px_16px_rgba(0,0,0,0.02)]">
        <header className="flex items-start justify-between gap-2 md:gap-3">
          {/* A long name wraps inside the chip instead of pushing the AI mark
              and the close button out. */}
          <h2
            id={titleId}
            className="min-h-[38px] min-w-0 rounded-[19px] border-[0.5px] border-[#564334] bg-[#f4f4f4] px-[12.5px] py-[9px] text-base leading-[19.6px] font-medium break-words shadow-[0_1px_1px_rgba(0,0,0,0.05)] md:min-h-[55px] md:rounded-[27.5px] md:border-[0.73px] md:px-[18px] md:py-[13px] md:text-[23.3px] md:leading-[28.5px]"
          >
            {/* Names like "meat (pork/chicken/seafood)" have no spaces to
                wrap at, so they may also break after a slash. */}
            {ingredient.replace(/\//g, "/\u200b")}
          </h2>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* The explanation is written by AI; the disclaimer below says
                what that means. */}
            <span className="flex h-[38px] w-[72px] items-center gap-2 rounded-full bg-[#ff8500] px-[9px] text-sm leading-[15px] font-medium text-white uppercase md:h-[55px] md:w-[105px] md:gap-3 md:px-[13px] md:text-[20.4px] md:leading-[22px]">
              <Image src="/images/icons/ai-sparkle.svg" alt="" width={24} height={24} className="size-6 md:size-[35px]" />
              AI
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={t("capture.ingredient.close")}
              className="size-[38px] rounded-full transition-opacity hover:opacity-70 md:size-[55px]"
            >
              <Image src="/images/icons/close-circle.svg" alt="" width={38} height={38} className="size-full" />
            </button>
          </div>
        </header>

        <div aria-live="polite" className="flex flex-col gap-2 md:gap-3">
          {state.status === "loading" && (
            <section className={SECTION_CLASS}>
              <h3 className={SECTION_TITLE_CLASS}>{t("capture.ingredient.whatIsIt")}</h3>
              <div className="flex flex-col gap-2 py-0.5 md:gap-3 md:py-1" aria-hidden="true">
                <div className="h-3.5 w-full animate-pulse rounded bg-black/[.08] md:h-5" />
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-black/[.08] md:h-5" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-black/[.08] md:h-5" />
              </div>
              <p className="text-sm md:text-[20.4px]">
                <ProgressText text={t("capture.ingredient.loading")} />
              </p>
            </section>
          )}

          {state.status === "success" && (
            <>
              <section className={SECTION_CLASS}>
                <h3 className={SECTION_TITLE_CLASS}>{t("capture.ingredient.whatIsIt")}</h3>
                <p className={SECTION_BODY_CLASS}>{state.detail.whatIsIt}</p>
              </section>
              {state.detail.madeOf && (
                <section className={`${SECTION_CLASS} pr-[42px] md:pr-[61px]`}>
                  <h3 className={SECTION_TITLE_CLASS}>{t("capture.ingredient.madeOf")}</h3>
                  <p className={SECTION_BODY_CLASS}>{state.detail.madeOf}</p>
                </section>
              )}
            </>
          )}

          {state.status === "error" && (
            <section className={`${SECTION_CLASS} items-start`}>
              <p role="alert" className="text-base leading-5 text-[#c82323] md:text-[23.3px] md:leading-[29px]">
                {t(`capture.ingredient.error.${state.reason}`)}
              </p>
              {/* No retry where it can't help: a misconfigured app, or a
                  request limit that only resets later in the day. */}
              {state.reason !== "config" && state.reason !== "quota" && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-full border border-[#564334] bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-[#ebebeb] md:border-[1.5px] md:px-6 md:py-2 md:text-[20.4px]"
                >
                  {t("capture.ingredient.retry")}
                </button>
              )}
            </section>
          )}
        </div>

        {/* Always shown (ingredient-detail.md 4.2): the text is AI-written and
            is not a basis for allergy decisions. */}
        <p className="px-1 text-xs leading-4 text-[#6a6a6a] md:px-1.5 md:text-[17.5px] md:leading-[23px]">
          {t("capture.ingredient.disclaimer")}
        </p>
      </div>
    </dialog>
  );
}
