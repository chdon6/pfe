const PREFIX = 'PMA-';

export function extractDossierSequence(numDossier: string | null | undefined): number {
  if (!numDossier?.trim()) return 0;
  const digits = numDossier.replace(/\D/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumeroDossier(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(4, '0')}`;
}

/** Prochain N° libre (même logique que l’API). */
export function allocateNextNumeroDossier(existing: (string | null | undefined)[]): string {
  const set = new Set(
    existing.filter((s) => s?.trim()).map((s) => s!.trim().toUpperCase())
  );
  let max = 0;
  for (const n of existing) {
    const seq = extractDossierSequence(n);
    if (seq > max) max = seq;
  }
  let seq = max + 1;
  let candidate = formatNumeroDossier(seq);
  while (set.has(candidate.toUpperCase())) {
    seq++;
    candidate = formatNumeroDossier(seq);
  }
  return candidate;
}
