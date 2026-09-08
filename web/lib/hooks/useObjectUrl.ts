import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    // Subscribing to an external resource (the blob URL), not deriving
    // state from props/state — the createObjectURL/revokeObjectURL pair
    // must live in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob]);

  return url;
}
