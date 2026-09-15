"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { AllergySelectionForm } from "@/components/allergies/AllergySelectionForm";
import { useLang } from "@/components/i18n/I18nProvider";
import {
  getServerAllergySelectionSnapshot,
  getStoredAllergySelectionSnapshot,
  saveAllergySelection,
  subscribeAllergySelection,
} from "@/lib/allergens/storage";

/** Edit-mode entry point from the home screen (allergy-selection.md 2, 3.1) —
 *  no Skip button, and Back and Save return to Home rather than resuming a
 *  photo. */
export default function AllergiesPage() {
  const lang = useLang();
  const router = useRouter();

  // localStorage isn't available during SSR; useSyncExternalStore renders
  // the empty server snapshot first and swaps in the real value once
  // hydrated, without a hydration mismatch.
  const initialSelected = useSyncExternalStore(
    subscribeAllergySelection,
    getStoredAllergySelectionSnapshot,
    getServerAllergySelectionSnapshot,
  );

  const handleSave = (ids: string[]) => {
    saveAllergySelection(ids);
    router.push(`/${lang}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AllergySelectionForm
        // Remounts once the real stored value replaces the empty server
        // snapshot, so the form's internal selection state picks it up
        // (it only reads `initialSelected` on first mount).
        key={initialSelected === getServerAllergySelectionSnapshot() ? "pending" : "ready"}
        initialSelected={initialSelected}
        onSave={handleSave}
        onBack={() => router.push(`/${lang}`)}
      />
    </div>
  );
}
