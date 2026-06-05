/**
 * Loads cached brand intelligence (researched by scripts/refreshBrandIntel.ts)
 * and formats it for injection into Ted's system instruction.
 */
import intel from '../data/brandIntel.json' with { type: 'json' };

interface BrandIntelEntry {
  name: string;
  notes: string;
}

interface BrandIntelFile {
  generatedAt: string | null;
  model: string | null;
  brands: BrandIntelEntry[];
}

export function getBrandIntelText(): string {
  const data = intel as BrandIntelFile;
  if (!data.brands || data.brands.length === 0) return '';

  const lines = data.brands
    .filter((b) => b.notes && b.notes.trim())
    .map((b) => `- ${b.name}: ${b.notes.trim()}`);

  if (lines.length === 0) return '';

  const asOf = data.generatedAt ? ` (as of ${new Date(data.generatedAt).toLocaleDateString()})` : '';
  return `Latest notes${asOf}:\n${lines.join('\n')}`;
}
