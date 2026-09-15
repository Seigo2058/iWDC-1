import { MyAllergiesCard } from "@/components/home/MyAllergiesCard";
import { RecentScans } from "@/components/home/RecentScans";
import { StartScanningCard } from "@/components/home/StartScanningCard";

/** Figma: Home (phone, one column) and MacBook Pro 16" - 1 (md, 768px, and up). The
 *  design is light-only, so the colors don't follow dark mode. */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-[38px] bg-[#f0f0f0] pt-[22px] font-brand md:gap-[92px] md:pt-14">
      <div className="flex flex-col gap-[18px] px-gutter md:gap-[58px]">
        <StartScanningCard />
        <MyAllergiesCard />
      </div>
      <RecentScans />
    </div>
  );
}
