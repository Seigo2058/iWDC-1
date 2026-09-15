"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { ProgressText } from "@/components/ui/ProgressText";
import { loadImageFile } from "@/lib/capture/loadImageFile";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** "Start scanning" hero of the home screen (Figma: Home / MacBook Pro 16"
 *  - 1). Phones stack the illustration over the text; from md (768px) the
 *  illustration sits left of the text. Upload and Camera are side by side
 *  on both. Camera opens the in-page camera; Upload picks an
 *  existing photo and goes straight to the photo check. */
export function StartScanningCard() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const reset = useCaptureStore((state) => state.reset);
  const setRawImage = useCaptureStore((state) => state.setRawImage);

  // The Japanese labels (アップロード) run wider than the others, and on the
  // narrowest phones would squeeze the Camera button, so they drop from 16px
  // to 14px there.
  const buttonTextSize =
    lang === "ja" ? "text-base [@media(width<=391px)]:text-sm" : "text-base";

  const inputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCamera = () => {
    reset();
    router.push(`/${lang}/capture`);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setErrorMessage(null);
    const result = await loadImageFile(file, () => setIsConverting(true));
    setIsConverting(false);
    if (!result.ok) {
      setErrorMessage(
        t(
          result.reason === "invalidFile"
            ? "capture.capturing.errorInvalidFile"
            : "capture.capturing.errorHeicConvert",
        ),
      );
      return;
    }

    // A fresh session that starts at the photo check (setRawImage moves the
    // flow there), so the capture page never opens the camera.
    reset();
    setRawImage(result.image);
    router.push(`/${lang}/capture`);
  };

  return (
    <section className="flex flex-col gap-5 rounded-[32px] bg-white p-4 pb-5 shadow-[0_0_20px_rgba(0,0,0,0.08)] md:flex-row md:items-center md:gap-[11.2%] md:rounded-[40px] md:py-12 md:pl-[39px] md:pr-[6.7%] md:shadow-[0_0_16px_rgba(0,0,0,0.24)]">
      <Image
        src="/images/home/start-scanning.png"
        alt=""
        width={1404}
        height={1260}
        preload
        sizes="(min-width: 48rem) min(424px, 30vw), (min-width: 33rem) 496px, calc(100vw - 80px)"
        className="aspect-[318/305] w-full rounded-2xl object-cover md:aspect-[424/362] md:w-[38%] md:max-w-[424px] md:shrink-0 md:rounded-[48px]"
      />

      <div className="flex min-w-0 flex-col gap-5 px-3 md:max-w-[708px] md:flex-1 md:gap-[49px] md:px-0">
        <div className="flex flex-col gap-1.5 md:gap-[15px] md:pl-2.5">
          <h1 className="text-2xl text-[#422f11] md:text-5xl md:font-medium">
            {t("capture.home.title")}
          </h1>
          <p className="text-sm text-[#564334] md:text-xl md:leading-[30px]">
            {t("capture.home.description")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {/* Camera comes first in the DOM (the primary action); it is shown
              to the right of Upload. */}
          <div className="flex flex-row-reverse gap-1.5">
            <button
              type="button"
              onClick={openCamera}
              className={`flex h-[61px] min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#ff8500] px-4 ${buttonTextSize} text-white transition-opacity hover:opacity-90 md:h-[101px] md:shrink md:basis-[411px] md:gap-2 md:text-xl md:font-medium md:tracking-[-0.4px]`}
            >
              <Image src="/images/icons/camera-sm.svg" alt="" width={28} height={28} className="size-7 shrink-0" />
              {t("capture.home.camera")}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isConverting}
              className={`flex h-[61px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#564334] px-4 ${buttonTextSize} text-[#422f11] transition-colors hover:bg-[#f0f0f0] disabled:opacity-50 md:h-[102px] md:min-w-0 md:shrink md:basis-[291px] md:text-xl md:font-medium md:tracking-[-0.4px] md:text-[#564334]`}
            >
              <Image src="/images/icons/gallery-add-sm.svg" alt="" width={26} height={26} className="size-[26px] shrink-0" />
              {t("capture.home.upload")}
            </button>
          </div>

          {isConverting && (
            <p className="text-center text-sm text-[#564334] md:text-lg">
              <ProgressText text={t("capture.capturing.converting")} />
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-red-600 md:text-lg">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
