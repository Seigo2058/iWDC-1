/**
 * Finalizes the captured photo. Currently a local no-op placeholder — swap
 * the body for a POST to the AI backend's `/documents` endpoint
 * (ai/app/routers/documents.py) once that integration is in scope.
 */
export async function submitPhoto(image: Blob): Promise<{ success: true }> {
  void image;
  return { success: true };
}
