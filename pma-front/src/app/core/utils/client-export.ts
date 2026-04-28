/** Téléchargement CSV côté client (UTF-8 avec BOM pour Excel). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined)[][]): void {
  const esc = (cell: string | number | undefined) => {
    const s = cell === undefined || cell === null ? '' : String(cell);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const bom = '\uFEFF';
  const lines = [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))];
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Ouvre une fenêtre d’impression (PDF via « Enregistrer au format PDF » du navigateur). */
export function printHtmlDocument(title: string, bodyHtml: string): void {
  const w = window.open('', '_blank', 'noopener');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title
  )}</title><style>
    body { font-family: system-ui,Segoe UI,sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f3f4f6; }
    @media print { body { padding: 12px; } }
  </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 250);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
