import { TakePhotoButton } from "@/components/capture/TakePhotoButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-black">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <TakePhotoButton />
    </div>
  );
}
