import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

export interface LabelPrintPayload {
  labelName: string;
  couple: string;
  sizeText: string;
  codes: string[];
  widthMm: number;
  heightMm: number;
}

@Injectable({ providedIn: 'root' })
export class LabelPrintService {
  /**
   * Identifiants uniques numériques lisibles en CODE128, liés au dossier patient.
   */
  generateCodes(
    count: number,
    opts?: { patientId: number; numDossier: string }
  ): string[] {
    const timestamp = Date.now().toString().slice(-8);
    const pid = String(opts?.patientId ?? 0).replace(/\D/g, '').slice(-4).padStart(4, '0');
    const dossierDigits = (opts?.numDossier ?? '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return Array.from({ length: count }, (_, i) => {
      const seq = String(i + 1).padStart(2, '0');
      return `${pid}${dossierDigits}${timestamp}${random}${seq}`;
    });
  }

  barcodeSvg(value: string): string {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 1.1,
      height: 32,
      margin: 0,
      displayValue: true,
      fontSize: 9,
      textMargin: 2,
    });
    return svg.outerHTML;
  }

  /**
   * Ouvre la boîte de dialogue d’impression du navigateur (iframe pour limiter les blocages popup).
   */
  print(payload: LabelPrintPayload): void {
    const html = this.buildDocument(payload);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = (): void => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    win.addEventListener(
      'afterprint',
      () => {
        cleanup();
      },
      { once: true }
    );

    requestAnimationFrame(() => {
      win.focus();
      win.print();
      setTimeout(cleanup, 2000);
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildDocument(p: LabelPrintPayload): string {
    const metaCouple = this.escapeHtml(p.couple);
    const metaType = this.escapeHtml(p.labelName);
    const metaSize = this.escapeHtml(p.sizeText);
    const labelsHtml = p.codes
      .map(code => {
        const svg = this.barcodeSvg(code);
        return `
        <div class="label" style="width:${p.widthMm}mm;height:${p.heightMm}mm">
          <div class="label-meta">
            <strong>${metaType}</strong>
            <span class="couple">${metaCouple}</span>
            <span class="dim">${metaSize}</span>
          </div>
          <div class="barcode-wrap">${svg}</div>
          <div class="code-plain">${this.escapeHtml(code)}</div>
        </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Étiquettes — ${metaType}</title>
  <style>
    @page { margin: 8mm; size: auto; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      display: flex;
      flex-wrap: wrap;
      gap: 4mm;
      align-content: flex-start;
    }
    .label {
      border: 0.35pt solid #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .label-meta {
      font-size: 8pt;
      line-height: 1.25;
      margin-bottom: 1mm;
      max-width: 100%;
    }
    .label-meta strong { display: block; font-size: 9pt; margin-bottom: 0.5mm; }
    .couple { display: block; color: #334155; }
    .dim { display: block; font-size: 7pt; color: #64748b; }
    .barcode-wrap { max-width: 100%; }
    .barcode-wrap svg { max-width: 100%; height: auto; display: block; }
    .code-plain {
      font: 8pt ui-monospace, 'Cascadia Code', monospace;
      margin-top: 1mm;
      letter-spacing: 0.02em;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="sheet">${labelsHtml}</div>
</body>
</html>`;
  }
}
