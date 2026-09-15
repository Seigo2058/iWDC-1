export type LoadImageResult =
  | { ok: true; image: Blob }
  | { ok: false; reason: "invalidFile" | "heicConvert" };

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

/** Turns a picked file into an image the crop step can show: rejects
 *  non-images, and converts iOS HEIC/HEIF photos to JPEG (browsers other
 *  than Safari can't display HEIC). `onConverting` fires before the
 *  conversion, which can take a few seconds. */
export async function loadImageFile(
  file: File,
  onConverting?: () => void,
): Promise<LoadImageResult> {
  const heic = isHeicFile(file);
  if (!file.type.startsWith("image/") && !heic) {
    return { ok: false, reason: "invalidFile" };
  }
  if (!heic) return { ok: true, image: file };

  onConverting?.();
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg" });
    return { ok: true, image: Array.isArray(converted) ? converted[0] : converted };
  } catch {
    return { ok: false, reason: "heicConvert" };
  }
}
