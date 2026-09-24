/** The backend answers 503 when every AI model is overloaded and 429 when
 *  every one has used up its request limit (ai/app/services/gemini.py), so
 *  those are told apart from other failures: waiting helps with the first,
 *  only the daily reset with the second. */
export function aiUnavailableReason(status: number): "busy" | "quota" | null {
  if (status === 503) return "busy";
  if (status === 429) return "quota";
  return null;
}
