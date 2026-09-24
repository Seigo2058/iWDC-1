import { notFound } from "next/navigation";

import { FoodDetailView } from "@/components/food/FoodDetailView";

export default async function FoodPage({
  params,
  searchParams,
}: PageProps<"/[lang]/foods/[foodId]">) {
  const { foodId } = await params;
  // Set when opened from a multi-dish scan's list (ScanGroupView), which
  // the page then offers a way back to.
  const { scan } = await searchParams;
  const id = Number(foodId);

  // Recent Scan only links to integer food_id values (recent-scans.md 3.4).
  if (!/^\d+$/.test(foodId) || !Number.isSafeInteger(id)) {
    notFound();
  }

  return (
    <FoodDetailView foodId={id} scanId={typeof scan === "string" && scan ? scan : undefined} />
  );
}
