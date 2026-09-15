"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { FoodDetail } from "@/components/capture/FoodDetail";
import { FoodList } from "@/components/capture/FoodList";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** One dish goes straight to its detail card; several (a menu, a shared
 *  table) show a list first, and tapping one opens its detail. */
export function ResultStep() {
  const foods = useCaptureStore((state) => state.foods);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const goToStep = useCaptureStore((state) => state.goToStep);

  const previewUrl = useObjectUrl(finalImage ?? croppedImage);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const listScrollY = useRef(0);

  // The page scrolls on the window, so switching views would otherwise keep
  // the old offset: open a detail at its top, and return to the list where
  // the user left it.
  useLayoutEffect(() => {
    window.scrollTo(0, selectedIndex === null ? listScrollY.current : 0);
  }, [selectedIndex]);

  if (foods.length === 0) return null;

  const handleSelect = (index: number) => {
    listScrollY.current = window.scrollY;
    setSelectedIndex(index);
  };

  const isSingle = foods.length === 1;
  const selectedFood = selectedIndex === null ? null : foods[selectedIndex];

  // The list's Back steps back through the capture flow like the other
  // screens' back buttons do, to the photo it was analyzed from.
  if (!isSingle && !selectedFood) {
    return (
      <FoodList
        foods={foods}
        onSelect={handleSelect}
        onBack={() => goToStep("confirm")}
      />
    );
  }

  // The detail's Back returns to the list, or for a single dish (no list)
  // to the photo it was analyzed from, like the list's own Back.
  return selectedFood ? (
    <FoodDetail food={selectedFood} onBack={() => setSelectedIndex(null)} />
  ) : (
    <FoodDetail
      food={foods[0]}
      capturedPhotoUrl={previewUrl}
      onBack={() => goToStep("confirm")}
    />
  );
}
