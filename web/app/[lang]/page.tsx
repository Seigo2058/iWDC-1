import { AllergySettingsLink } from "@/components/allergies/AllergySettingsLink";
import { TakePhotoButton } from "@/components/capture/TakePhotoButton";
import { RecentScans } from "@/components/home/RecentScans";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <TakePhotoButton />
        <AllergySettingsLink />
      </div>
      <RecentScans />
    </div>
  );
}
