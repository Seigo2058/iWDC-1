import { AllergySettingsLink } from "@/components/allergies/AllergySettingsLink";
import { TakePhotoButton } from "@/components/capture/TakePhotoButton";
import { RecentScans } from "@/components/home/RecentScans";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 pt-20">
        <TakePhotoButton />
        <AllergySettingsLink />
      </div>
      <RecentScans />
    </div>
  );
}
