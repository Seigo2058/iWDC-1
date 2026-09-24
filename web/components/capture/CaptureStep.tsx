"use client";

import { Camera, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  CaptureScreen,
  CaptureTopBar,
  RoundOverlayButton,
} from "@/components/capture/CaptureScreen";
import { ProgressText } from "@/components/ui/ProgressText";
import { useLang } from "@/components/i18n/I18nProvider";
import { loadImageFile } from "@/lib/capture/loadImageFile";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

type CameraErrorReason = "permission" | "noCamera" | "unsupported" | "camera";

type CameraState =
  | { status: "starting" }
  | { status: "live" }
  | { status: "error"; reason: CameraErrorReason };

const CAMERA_ERROR_KEYS: Record<CameraErrorReason, string> = {
  permission: "capture.capturing.errorPermission",
  noCamera: "capture.capturing.errorNoCamera",
  unsupported: "capture.capturing.errorUnsupported",
  camera: "capture.capturing.errorCamera",
};

// The torch constraint isn't in TypeScript's DOM types yet (Chrome on
// Android supports it; most desktop webcams and iOS don't).
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean };

function cameraErrorReason(error: unknown): CameraErrorReason {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "noCamera";
  return "camera";
}

/** Shows the rear camera inside the page and captures a frame from it,
 *  instead of handing off to the phone's own camera app (Figma: camera
 *  screen, phone "User" and PC "MacBook Pro 16' - 2"): Back and the hint
 *  above the frame (green-bordered on phones), then flash, shutter and
 *  gallery below it. On phones the screen is full-height without the site
 *  header. Choosing an existing
 *  photo stays available, and is the way forward when the camera can't be
 *  used (permission denied, no camera, or an insecure/unsupported browser —
 *  getUserMedia needs HTTPS or localhost). */
export function CaptureStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const setRawImage = useCaptureStore((state) => state.setRawImage);
  const reset = useCaptureStore((state) => state.reset);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [camera, setCamera] = useState<CameraState>({ status: "starting" });
  const [cameraAttempt, setCameraAttempt] = useState(0);
  // null: this camera has no controllable flash, so the button is hidden.
  const [torch, setTorch] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    // Strict Mode mounts twice in dev; a stream that arrives after this
    // effect was cleaned up must be stopped, or the camera stays on.
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera({ status: "error", reason: "unsupported" });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // Autoplay can still be refused; the preview then starts on the
          // next user gesture, and capture works either way.
          await video.play().catch(() => {});
        }
        if (cancelled) return;
        const [track] = stream.getVideoTracks();
        const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
        setTorch(capabilities?.torch ? false : null);
        setCamera({ status: "live" });
      } catch (error) {
        if (!cancelled) {
          setCamera({ status: "error", reason: cameraErrorReason(error) });
        }
      }
    };
    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraAttempt]);

  const handleRetryCamera = () => {
    setErrorMessage(null);
    setTorch(null);
    setCamera({ status: "starting" });
    setCameraAttempt((attempt) => attempt + 1);
  };

  const handleToggleTorch = async () => {
    const [track] = streamRef.current?.getVideoTracks() ?? [];
    if (!track || torch === null) return;
    const next = !torch;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] });
      setTorch(next);
    } catch {
      // The flash can be taken by another app or refused mid-stream; hide
      // the button rather than show a state that isn't real.
      setTorch(null);
    }
  };

  const handleShutter = () => {
    const video = videoRef.current;
    if (camera.status !== "live" || !video || !video.videoWidth) return;

    // Capture what the preview shows: it fills its frame (object-cover), so
    // take the same centered region of the sensor frame, at full resolution.
    // The crop step comes next for fine adjustment.
    const { videoWidth, videoHeight, clientWidth, clientHeight } = video;
    const scale = Math.max(clientWidth / videoWidth, clientHeight / videoHeight);
    const width = Math.round(Math.min(videoWidth, clientWidth / scale));
    const height = Math.round(Math.min(videoHeight, clientHeight / scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas
      .getContext("2d")
      ?.drawImage(
        video,
        (videoWidth - width) / 2,
        (videoHeight - height) / 2,
        width,
        height,
        0,
        0,
        width,
        height,
      );

    setIsBusy(true);
    canvas.toBlob(
      (blob) => {
        setIsBusy(false);
        if (!blob) {
          setErrorMessage(t("capture.capturing.errorCapture"));
          return;
        }
        stopCamera();
        setRawImage(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setErrorMessage(null);
    const result = await loadImageFile(file, () => setIsBusy(true));
    setIsBusy(false);
    if (result.ok) {
      setRawImage(result.image);
    } else {
      setErrorMessage(
        t(
          result.reason === "invalidFile"
            ? "capture.capturing.errorInvalidFile"
            : "capture.capturing.errorHeicConvert",
        ),
      );
    }
  };

  const handleBack = () => {
    reset();
    router.push(`/${lang}`);
  };

  // One message pill above the frame: an error or progress takes the place
  // of the framing hint.
  const message =
    errorMessage ??
    (isBusy ? <ProgressText text={t("capture.capturing.converting")} /> : null);

  return (
    <CaptureScreen
      heading={t("capture.capturing.heading")}
      frameClassName="rounded-[32px] border-4 border-[#19532b] bg-[rgba(41,41,41,0.2)] md:rounded-[40px] md:border-0 md:bg-black md:shadow-[0_0_16px_rgba(0,0,0,0.24)]"
      topBar={
        <CaptureTopBar
          alert={errorMessage !== null}
          button={
            <RoundOverlayButton
              label={t("capture.capturing.back")}
              onClick={handleBack}
              icon={<Image src="/images/icons/arrow-left.svg" alt="" width={26} height={26} className="size-[26px] md:size-[37px]" />}
            />
          }
        >
          {message ?? t("capture.capturing.hint")}
        </CaptureTopBar>
      }
      frame={
        <>
          {/* Always rendered so the stream has somewhere to go when it
              arrives; muted + playsInline let iOS autoplay it inline. */}
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-label={t("capture.capturing.heading")}
            className={`absolute inset-0 size-full object-cover ${camera.status === "live" ? "" : "invisible"}`}
          />

          {camera.status === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-[#564334] md:text-lg md:text-zinc-300">
              <ProgressText text={t("capture.capturing.starting")} />
            </p>
          )}

          {camera.status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm text-[#564334] md:text-lg md:text-zinc-200">
                {t(CAMERA_ERROR_KEYS[camera.reason])}
              </p>
              {camera.reason !== "unsupported" && (
                <button
                  type="button"
                  onClick={handleRetryCamera}
                  className="flex items-center gap-2 rounded-full border border-[#564334]/40 px-5 py-2 text-sm font-medium text-[#564334] transition-colors hover:bg-black/5 md:border-white/30 md:text-lg md:text-white md:hover:bg-white/10"
                >
                  <Camera aria-hidden="true" size={18} />
                  {t("capture.capturing.openCamera")}
                </button>
              )}
            </div>
          )}
        </>
      }
      controls={
        // Flash, shutter, gallery, on phones and PC alike.
        <div className="flex items-center gap-[22px] md:gap-[72px]">
          {/* Kept in place while unavailable (most desktop webcams and iOS
              have no controllable flash) so the shutter stays centered. */}
          <button
            type="button"
            onClick={handleToggleTorch}
            disabled={torch === null}
            aria-pressed={torch ?? false}
            aria-label={t("capture.capturing.flash")}
            className={`flex size-[54px] items-center justify-center rounded-full text-white shadow-[0_0_9px_rgba(0,0,0,0.32)] backdrop-blur-[13.5px] transition-colors md:size-[70px] ${torch ? "bg-[#ff8500]/90" : "bg-black/50"} ${torch === null ? "invisible" : ""}`}
          >
            {torch ? (
              <Zap aria-hidden="true" className="size-6 fill-current md:size-8" />
            ) : (
              <Image src="/images/icons/flash-slash.svg" alt="" width={29} height={29} className="size-[29.25px] md:size-[38px]" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShutter}
            disabled={camera.status !== "live" || isBusy}
            aria-label={t("capture.capturing.shutter")}
            className="flex h-[66px] w-[135px] items-center justify-center rounded-[20px] bg-[#ff8500] transition active:scale-[0.97] disabled:opacity-50 md:h-[90px] md:w-[263px]"
          >
            <Image src="/images/icons/camera-shutter.svg" alt="" width={41} height={41} className="size-[41px] md:size-14" />
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
            disabled={isBusy}
            aria-label={t("capture.capturing.chooseFromLibrary")}
            className="flex size-[54px] items-center justify-center rounded-full bg-black/50 shadow-[0_0_9px_rgba(0,0,0,0.32)] backdrop-blur-[13.5px] transition-opacity hover:opacity-85 disabled:opacity-50 md:size-[76px]"
          >
            <Image src="/images/icons/gallery-add-light.svg" alt="" width={28} height={28} className="size-7 md:size-10" />
          </button>
        </div>
      }
    />
  );
}
