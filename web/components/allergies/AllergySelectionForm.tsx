"use client";

import { useState } from "react";

import {
  ALLERGEN_CATEGORIES,
  itemsByCategory,
} from "@/lib/allergens/allergenList";
import { useT } from "@/lib/i18n/useT";

interface AllergySelectionFormProps {
  initialSelected: string[];
  onSave: (selected: string[]) => void;
  onSkip?: () => void;
  busy?: boolean;
}

/** Shared allergy-picker UI (allergy-selection.md 7), used both as a capture
 *  flow step and as the standalone `/[lang]/allergies` edit page. Storage and
 *  navigation are the caller's responsibility via `onSave` / `onSkip`. */
export function AllergySelectionForm({
  initialSelected,
  onSave,
  onSkip,
  busy = false,
}: AllergySelectionFormProps) {
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      <h1 className="text-xl font-semibold">{t("allergies.heading")}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("allergies.description")}
      </p>

      {ALLERGEN_CATEGORIES.map((category) => (
        <section key={category} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t(`allergies.categories.${category}`)}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {itemsByCategory(category).map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  disabled={busy}
                  className="size-4 accent-foreground"
                />
                <span className="text-sm">
                  {t(`allergies.items.${item.id}`)}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={() => onSave(Array.from(selected))}
          disabled={busy}
          className="rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {t("allergies.save")}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="text-sm text-zinc-600 underline disabled:opacity-50 dark:text-zinc-400"
          >
            {t("allergies.skip")}
          </button>
        )}
      </div>
    </div>
  );
}
