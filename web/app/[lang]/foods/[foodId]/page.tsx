import { notFound } from "next/navigation";

import { FoodDetailView } from "@/components/food/FoodDetailView";

export default async function FoodPage({
  params,
}: PageProps<"/[lang]/foods/[foodId]">) {
  const { foodId } = await params;
  const id = Number(foodId);

  // Recent Scan only links to integer food_id values (recent-scans.md 3.4).
  if (!/^\d+$/.test(foodId) || !Number.isSafeInteger(id)) {
    notFound();
  }

  return <FoodDetailView foodId={id} />;
}
