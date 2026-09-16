/**
 * Medical list fields may be stored as plain strings or as objects with a
 * `name` (the mobile app saves medications as `{ name, dosage? }`). Returns
 * readable text for summaries and voice alerts.
 */
export const toNameList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof (item as any).name === 'string') {
        const { name, dosage } = item as { name: string; dosage?: string };
        return dosage ? `${name} ${dosage}`.trim() : name.trim();
      }
      return '';
    })
    .filter(Boolean);
};
