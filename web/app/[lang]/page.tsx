import { TakePhotoButton } from "@/components/capture/TakePhotoButton";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-black">
      <TakePhotoButton />
    </div>
  );
}
