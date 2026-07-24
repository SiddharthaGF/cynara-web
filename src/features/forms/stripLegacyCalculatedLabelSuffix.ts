/** Strips legacy "(calculado)" / "(calculated)" baked into stored labels. */
export function stripLegacyCalculatedLabelSuffix(label: string): string {
  return label
    .replace(/\s*\((?:calculado|calculada|calculated)\)\s*$/i, '')
    .trimEnd();
}
