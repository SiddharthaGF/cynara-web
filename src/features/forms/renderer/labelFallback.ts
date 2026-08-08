/**
 * Converts a technical field identifier into a human-readable label when a
 * form author never supplied one. Field ids like "blood-pressure" or
 * "vital.bpDiastolic" render as "Blood pressure" / "Vital bp diastolic"
 * instead of leaking developer identifiers into the clinical workspace.
 */
export function humanizeFieldLabel(raw: string): string {
  const cleaned = raw
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/g, '$<lower> $<upper>')
    .replaceAll(/[._-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return raw;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
