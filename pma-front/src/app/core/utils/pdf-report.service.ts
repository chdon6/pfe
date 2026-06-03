import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Bonbonne, Canister, PailleTube, Patient, CyclePma } from '../models';

export interface PdfReportData {
  patients: Patient[];
  cycles: CyclePma[];
  bonbonnes: Bonbonne[];
  canisters: Canister[];
  pailles: PailleTube[];
}

// ── Palette et constantes visuelles ──────────────────────────────────────────
const PURPLE      = [124, 58,  237] as [number, number, number];
const PURPLE_LIGHT= [237,233,254]   as [number, number, number];
const DARK        = [17,  24,  39]  as [number, number, number];
const GRAY        = [107,114,128]   as [number, number, number];
const LIGHT_GRAY  = [249,250,251]   as [number, number, number];
const WHITE       = [255,255,255]   as [number, number, number];
const GREEN       = [5,  150,105]   as [number, number, number];
const BLUE        = [59, 130,246]   as [number, number, number];
const AMBER       = [217,119, 6]    as [number, number, number];
const RED         = [239, 68, 68]   as [number, number, number];

@Injectable({ providedIn: 'root' })
export class PdfReportService {

  // ── Rapport annuel ABM ─────────────────────────────────────────────────────
  rapportABM(data: PdfReportData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const annee = new Date().getFullYear();
    const now = new Date();

    this.drawCover(doc, 'Rapport Annuel ABM', `Agence de la Biom\u00e9decine — Bilan d\u2019activit\u00e9 ${annee}`, annee);
    doc.addPage();

    let y = this.drawPageHeader(doc, 'Rapport Annuel ABM', annee, 1);

    // ─ Section 1 : Indicateurs d'activité ──────────────────────────────────
    y = this.sectionTitle(doc, 'I. Indicateurs d\u2019activit\u00e9 clinique', y);

    const totalSlots  = data.canisters.length * 12;
    const occupied    = data.pailles.length;
    const occPct      = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;
    const cyclesTermines = data.cycles.filter(c => c.statutCycle === 'termine').length;
    const cyclesEnCours  = data.cycles.filter(c => c.statutCycle === 'en_cours').length;
    const cyclesBrouillon= data.cycles.filter(c => c.statutCycle === 'brouillon').length;
    const positifs    = data.cycles.filter(c => c.resultatTestGrossesse === 'positif').length;
    const negatifs    = data.cycles.filter(c => c.resultatTestGrossesse === 'negatif').length;
    const tauxSucces  = (cyclesTermines > 0) ? Math.round((positifs / cyclesTermines) * 100) : 0;

    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur', 'Commentaire']],
      body: [
        ['Patients suivis',              String(data.patients.length),   'Dossiers actifs dans le syst\u00e8me'],
        ['Nombre de cycles PMA',          String(data.cycles.length),     'Toutes phases confondues'],
        ['Cycles termin\u00e9s',         String(cyclesTermines),          'Statut : termin\u00e9'],
        ['Cycles en cours',               String(cyclesEnCours),           'Statut : en_cours'],
        ['Cycles en initialisation',      String(cyclesBrouillon),         'Statut : brouillon'],
        ['R\u00e9sultats positifs (\u03b2-hCG)', String(positifs),       'Test de grossesse positif'],
        ['R\u00e9sultats n\u00e9gatifs', String(negatifs),                'Test de grossesse n\u00e9gatif'],
        ['Taux de succ\u00e8s estim\u00e9', tauxSucces + ' %',            'Positifs / Termin\u00e9s'],
      ],
      ...this.tableStyle(),
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Section 2 : Répartition par phase ───────────────────────────────────
    y = this.sectionTitle(doc, 'II. R\u00e9partition par phase PMA', y);
    const phaseMap = new Map<string, number>();
    data.cycles.forEach(c => phaseMap.set(c.phase, (phaseMap.get(c.phase) ?? 0) + 1));

    autoTable(doc, {
      startY: y,
      head: [['Phase', 'Nombre de cycles', '% du total']],
      body: [...phaseMap.entries()].map(([phase, cnt]) => [
        phase,
        String(cnt),
        data.cycles.length > 0 ? Math.round((cnt / data.cycles.length) * 100) + ' %' : '0 %'
      ]),
      ...this.tableStyle(),
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Section 3 : Cryoconservation ────────────────────────────────────────
    if (y > 230) { doc.addPage(); y = this.drawPageHeader(doc, 'Rapport Annuel ABM', annee, 2); }
    y = this.sectionTitle(doc, 'III. Cryoconservation', y);

    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['\u00c9chantillons en conservation',   String(occupied)],
        ['Capacit\u00e9 totale (emplacements)',  String(totalSlots)],
        ['Taux d\u2019occupation',               occPct + ' %'],
        ['Bonbonnes actives',                    String(data.bonbonnes.length)],
        ['Canisters',                            String(data.canisters.length)],
      ],
      ...this.tableStyle(),
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Section 4 : Répartition type contenu ────────────────────────────────
    y = this.sectionTitle(doc, 'IV. R\u00e9partition par type de contenu', y);
    const typeMap = new Map<string, number>();
    data.pailles.forEach(p => {
      const t = this.normalizeType(p.typeContenu || '');
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    });
    autoTable(doc, {
      startY: y,
      head: [['Type de contenu', 'Quantit\u00e9', '% du total']],
      body: [...typeMap.entries()].map(([t, n]) => [
        t, String(n),
        data.pailles.length > 0 ? Math.round((n / data.pailles.length) * 100) + ' %' : '0 %'
      ]),
      ...this.tableStyle(),
    });

    this.drawFooter(doc, now);
    doc.save(`rapport-ABM-${annee}.pdf`);
  }

  // ── Registre national FIV ─────────────────────────────────────────────────
  registreFIV(data: PdfReportData): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const annee = new Date().getFullYear();
    const now   = new Date();
    const patMap = new Map(data.patients.map(p => [p.id, p]));

    this.drawCover(doc, 'Registre National FIV', `Tentatives et r\u00e9sultats biologiques ${annee}`, annee);
    doc.addPage();

    let y = this.drawPageHeader(doc, 'Registre National FIV', annee, 1);
    y = this.sectionTitle(doc, 'Cycles PMA — Donn\u00e9es individualis\u00e9es', y);

    const rows = data.cycles.map(c => {
      const p    = patMap.get(c.patientId);
      const nom  = p ? `${p.nom} ${p.prenom}`.trim() : `#${c.patientId}`;
      const dos  = p?.numDossier ?? '-';
      const res  = c.resultatTestGrossesse === 'positif' ? 'Positif'
                 : c.resultatTestGrossesse === 'negatif'  ? 'N\u00e9gatif'
                 : 'En attente';
      const sig  = c.resultatTestSignePar ? `${c.resultatTestSignePar} — ${this.fmtDate(c.resultatTestSigneLe)}` : '-';
      return [
        String(c.id),
        dos,
        nom,
        c.phase || '-',
        c.etapeCourante || '-',
        this.statutLabel(c.statutCycle),
        this.fmtDate(c.dateDebut),
        this.fmtDate(c.dateFin),
        res,
        sig,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['ID', 'N\u00b0 Dossier', 'Patient', 'Phase', '\u00c9tape courante', 'Statut', 'D\u00e9but', 'Fin', 'R\u00e9sultat \u03b2-hCG', 'Sign\u00e9 par']],
      body: rows,
      ...this.tableStyle(),
      styles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 30 },
        5: { cellWidth: 22 },
        8: { cellWidth: 22 },
        9: { cellWidth: 35 },
      },
    });

    // ─ Statistiques de résultats ─────────────────────────────────────────
    const pos  = data.cycles.filter(c => c.resultatTestGrossesse === 'positif').length;
    const neg  = data.cycles.filter(c => c.resultatTestGrossesse === 'negatif').length;
    const att  = data.cycles.length - pos - neg;
    let y2 = (doc as any).lastAutoTable.finalY + 10;
    if (y2 > 175) { doc.addPage(); y2 = this.drawPageHeader(doc, 'Registre National FIV', annee, 2); }
    y2 = this.sectionTitle(doc, 'Synth\u00e8se des r\u00e9sultats', y2);
    autoTable(doc, {
      startY: y2,
      head: [['Statut r\u00e9sultat', 'Nombre', '% des cycles']],
      body: [
        ['Positif (\u03b2-hCG)',  String(pos), data.cycles.length > 0 ? Math.round(pos / data.cycles.length * 100) + ' %' : '0 %'],
        ['N\u00e9gatif',          String(neg), data.cycles.length > 0 ? Math.round(neg / data.cycles.length * 100) + ' %' : '0 %'],
        ['En attente',            String(att), data.cycles.length > 0 ? Math.round(att / data.cycles.length * 100) + ' %' : '0 %'],
      ],
      ...this.tableStyle(),
    });

    this.drawFooter(doc, now);
    doc.save(`registre-FIV-${annee}.pdf`);
  }

  // ── Rapport vigilance cryogénique ─────────────────────────────────────────
  vigilanceCryo(data: PdfReportData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const annee = new Date().getFullYear();
    const now   = new Date();

    this.drawCover(doc, 'Rapport Vigilance Cryo\u00e9nique', `Surveillance des cuves — 1er semestre ${annee}`, annee);
    doc.addPage();

    let y = this.drawPageHeader(doc, 'Rapport Vigilance Cryo\u00e9nique', annee, 1);

    // ─ Résumé global ────────────────────────────────────────────────────────
    y = this.sectionTitle(doc, 'I. R\u00e9sum\u00e9 global du parc cryo\u00e9nique', y);
    const totalSlots = data.canisters.length * 12;
    const occupied   = data.pailles.length;
    const occPct     = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;
    autoTable(doc, {
      startY: y,
      head: [['Param\u00e8tre', 'Valeur']],
      body: [
        ['Nombre de bonbonnes', String(data.bonbonnes.length)],
        ['Nombre de canisters', String(data.canisters.length)],
        ['Capacit\u00e9 totale', String(totalSlots) + ' emplacements'],
        ['\u00c9chantillons stock\u00e9s', String(occupied)],
        ['Taux d\u2019occupation global', occPct + ' %'],
      ],
      ...this.tableStyle(),
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Détail par bonbonne ──────────────────────────────────────────────────
    y = this.sectionTitle(doc, 'II. D\u00e9tail par bonbonne', y);
    const rows = data.bonbonnes.map(b => {
      const canIds = data.canisters.filter(c => c.bonbonneId === b.id).map(c => c.id);
      const occ    = data.pailles.filter(p => canIds.includes(p.canisterId)).length;
      const total  = canIds.length * 12;
      const pct    = total > 0 ? Math.round((occ / total) * 100) : 0;
      const alert  = pct >= 90 ? '\u26a0 Critique' : pct >= 70 ? 'Attention' : 'Normal';
      return [
        b.code || `#${b.id}`,
        b.typeStockage || '-',
        String(b.temperature ?? '-'),
        String(canIds.length),
        `${occ} / ${total}`,
        pct + ' %',
        alert,
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [['Bonbonne', 'Type', 'Temp.', 'Canisters', 'Occupation', '% Occ.', 'Statut']],
      body: rows,
      ...this.tableStyle(),
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 6) {
          const v = hookData.cell.raw as string;
          if (v.includes('Critique'))  hookData.cell.styles.textColor = RED;
          else if (v.includes('Attention')) hookData.cell.styles.textColor = AMBER;
          else                          hookData.cell.styles.textColor = GREEN;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Répartition par type de contenu ──────────────────────────────────────
    if (y > 230) { doc.addPage(); y = this.drawPageHeader(doc, 'Rapport Vigilance Cryo\u00e9nique', annee, 2); }
    y = this.sectionTitle(doc, 'III. R\u00e9partition des \u00e9chantillons par type', y);
    const typeMap = new Map<string, number>();
    data.pailles.forEach(p => {
      const t = this.normalizeType(p.typeContenu || '');
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    });
    autoTable(doc, {
      startY: y,
      head: [['Type de contenu', 'Quantit\u00e9', '% du stock']],
      body: [...typeMap.entries()].map(([t, n]) => [
        t, String(n),
        data.pailles.length > 0 ? Math.round((n / data.pailles.length) * 100) + ' %' : '0 %'
      ]),
      ...this.tableStyle(),
    });

    this.drawFooter(doc, now);
    doc.save(`vigilance-cryo-${annee}.pdf`);
  }

  // ── Bilan stockage et conservation ────────────────────────────────────────
  bilanStockage(data: PdfReportData): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const annee = new Date().getFullYear();
    const now   = new Date();

    this.drawCover(doc, 'Bilan Stockage & Conservation', `\u00c9tat des lieux du parc cryo\u00e9nique — ${annee}`, annee);
    doc.addPage();

    let y = this.drawPageHeader(doc, 'Bilan Stockage & Conservation', annee, 1);

    // ─ Occupation par bonbonne ───────────────────────────────────────────────
    y = this.sectionTitle(doc, 'I. Occupation par bonbonne', y);
    const occRows = data.bonbonnes.map(b => {
      const canIds = data.canisters.filter(c => c.bonbonneId === b.id).map(c => c.id);
      const occ    = data.pailles.filter(p => canIds.includes(p.canisterId)).length;
      const total  = canIds.length * 12;
      return [b.code || `#${b.id}`, b.typeStockage || '-', String(canIds.length), String(occ), String(total - occ), String(total), total > 0 ? Math.round((occ / total) * 100) + ' %' : '0 %'];
    });
    autoTable(doc, {
      startY: y,
      head: [['Bonbonne', 'Type', 'Canisters', 'Occup\u00e9s', 'Libres', 'Total', '% Occ.']],
      body: occRows,
      ...this.tableStyle(),
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ─ Inventaire complet des pailles / tubes ────────────────────────────────
    if (y > 155) { doc.addPage(); y = this.drawPageHeader(doc, 'Bilan Stockage & Conservation', annee, 2); }
    y = this.sectionTitle(doc, 'II. Inventaire complet des \u00e9chantillons', y);

    const invRows = data.pailles.map(p => {
      const canister = data.canisters.find(c => c.id === p.canisterId);
      const bonbonne = canister ? data.bonbonnes.find(b => b.id === canister.bonbonneId) : null;
      const patient  = data.patients.find(pt => String(pt.id) === String(p.patientId ?? -1));
      const nomPat   = patient ? `${patient.nom} ${patient.prenom}`.trim() : '-';
      return [
        p.codeBarre || '-',
        this.normalizeType(p.typeContenu || ''),
        nomPat,
        bonbonne?.code || '-',
        canister ? `N\u00b0${canister.numero}` : '-',
        String(p.position ?? '-'),
        p.couleurVisotube || '-',
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [['Code-barres', 'Type contenu', 'Patient', 'Bonbonne', 'Canister', 'Position', 'Visotube']],
      body: invRows,
      ...this.tableStyle(),
      styles: { fontSize: 7.5 },
    });

    this.drawFooter(doc, now);
    doc.save(`bilan-stockage-${annee}.pdf`);
  }

  // ── Helpers visuels ───────────────────────────────────────────────────────

  private drawCover(doc: jsPDF, titre: string, sousTitre: string, annee: number): void {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Bande violette haute
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 40, 'F');

    // Logo / initiales
    doc.setFillColor(...WHITE);
    doc.roundedRect(14, 8, 24, 24, 3, 3, 'F');
    doc.setTextColor(...PURPLE);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PMA', 26, 23, { align: 'center' });

    // Nom institution
    doc.setTextColor(...WHITE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Centre PMA — Clinique Universitaire', 44, 17);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Syst\u00e8me de gestion PMA — Document r\u00e9glementaire', 44, 24);

    // Bande décorative centrale
    doc.setFillColor(...PURPLE_LIGHT);
    doc.rect(0, H / 2 - 50, W, 100, 'F');

    // Titre principal
    doc.setTextColor(...DARK);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(titre, W / 2, H / 2 - 18, { align: 'center' });

    // Sous-titre
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(sousTitre, W / 2, H / 2, { align: 'center' });

    // Ligne séparatrice
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(1.2);
    doc.line(W / 2 - 40, H / 2 + 8, W / 2 + 40, H / 2 + 8);

    // Date de génération
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(`G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, H / 2 + 20, { align: 'center' });
    doc.text(`Ann\u00e9e de r\u00e9f\u00e9rence : ${annee}`, W / 2, H / 2 + 28, { align: 'center' });

    // Pied de couverture
    doc.setFillColor(...DARK);
    doc.rect(0, H - 20, W, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('Document confidentiel — usage interne et r\u00e9glementaire uniquement', W / 2, H - 9, { align: 'center' });
  }

  private drawPageHeader(doc: jsPDF, titre: string, annee: number, page: number): number {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 16, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(titre.toUpperCase(), 14, 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ann\u00e9e ${annee}  |  Page ${page}`, W - 14, 10, { align: 'right' });

    doc.setTextColor(...DARK);
    return 24;
  }

  private drawFooter(doc: jsPDF, now: Date): void {
    const pageCount = (doc.internal as any).getNumberOfPages?.() ?? 1;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(0, H - 12, W, 12, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(`Centre PMA — Rapport r\u00e9glementaire — G\u00e9n\u00e9r\u00e9 le ${now.toLocaleString('fr-FR')}`, 14, H - 5);
      doc.text(`Page ${i} / ${pageCount}`, W - 14, H - 5, { align: 'right' });
    }
  }

  private sectionTitle(doc: jsPDF, text: string, y: number): number {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...PURPLE_LIGHT);
    doc.rect(14, y - 1, W - 28, 8, 'F');
    doc.setTextColor(...PURPLE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 16, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    return y + 13;
  }

  private tableStyle() {
    return {
      theme: 'grid' as const,
      headStyles: {
        fillColor: PURPLE,
        textColor: WHITE,
        fontStyle: 'bold' as const,
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      bodyStyles: { fontSize: 8.5, textColor: DARK },
      margin: { left: 14, right: 14 },
      tableLineColor: [229, 231, 235] as [number, number, number],
      tableLineWidth: 0.2,
    };
  }

  private normalizeType(t: string): string {
    const lower = t.toLowerCase().trim();
    if (lower.includes('embryon'))                     return 'Embryon';
    if (lower.includes('ovocyte') || lower.includes('oocyte')) return 'Ovocyte';
    if (lower.includes('sperm'))                       return 'Sperme';
    if (lower.includes('tissu'))                       return 'Tissu';
    return t || 'Non sp\u00e9cifi\u00e9';
  }

  private fmtDate(v?: string | Date | null): string {
    if (!v) return '-';
    const d = new Date(v as string);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private statutLabel(s: string): string {
    const map: Record<string, string> = {
      termine: 'Termin\u00e9',
      en_cours: 'En cours',
      brouillon: 'Brouillon',
      annule: 'Annul\u00e9',
    };
    return map[s] ?? s;
  }
}
