"use client";

import { X } from "lucide-react";
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
      className="mx-0 mt-auto mb-0 w-full max-w-full rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-5">
        <header className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-semibold">
            {ingredient}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("capture.ingredient.close")}
            className="-m-1 shrink-0 rounded-full p-1 text-zinc-500 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div aria-live="polite" className="flex flex-col gap-4">
          {state.status === "loading" && (
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <ProgressText text={t("capture.ingredient.loading")} />
              </p>
            </div>
          )}

          {state.status === "success" && (
            <>
              <section className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  {t("capture.ingredient.whatIsIt")}
                </h3>
                <p className="leading-relaxed">{state.detail.whatIsIt}</p>
              </section>
              {state.detail.madeOf && (
                <section className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("capture.ingredient.madeOf")}
                  </h3>
                  <p className="leading-relaxed">{state.detail.madeOf}</p>
                </section>
              )}
            </>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-red-600 dark:text-red-400">
                {t(`capture.ingredient.error.${state.reason}`)}
              </p>
              {state.reason !== "config" && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  {t("capture.ingredient.retry")}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {t("capture.ingredient.disclaimer")}
        </p>
      </div>
    </dialog>
  );
}
