import { ScanGroupView } from "@/components/home/ScanGroupView";

export default async function ScanPage({
  params,
}: PageProps<"/[lang]/scans/[scanId]">) {
  const { scanId } = await params;
  // The history lives in Local Storage, so whether this id exists is only
  // known in the browser; ScanGroupView shows "not found" itself.
  return <ScanGroupView scanId={decodeURIComponent(scanId)} />;
}
