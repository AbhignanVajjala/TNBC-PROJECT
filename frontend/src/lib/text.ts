/** Normalize display punctuation without changing the stored scientific evidence. */
export function displayEvidenceText(value: string): string {
  return value.replace(/\s*\u2014\s*/g, ', ');
}
