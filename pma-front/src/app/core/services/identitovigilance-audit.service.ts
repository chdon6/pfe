import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import type { AuditJournalEntry } from '../models/audit-journal.model';

const STORAGE_AUDIT = 'pma_identitovigilance_audit';
const STORAGE_POSTE = 'pma_poste_travail';
const STORAGE_PATIENT_BARCODES = 'pma_patient_barcodes';
const MAX_ENTRIES = 400;

@Injectable({ providedIn: 'root' })
export class IdentitovigilanceAuditService {
  private auth = inject(AuthService);

  /** Poste / station de travail (CDC §2.2). */
  posteTravail = signal(this.readPoste());

  readonly entries = signal<AuditJournalEntry[]>(this.readAudit());

  private readPoste(): string {
    if (typeof localStorage === 'undefined') return 'POSTE-LOCAL';
    return localStorage.getItem(STORAGE_POSTE) || 'LABO-WS1';
  }

  private readAudit(): AuditJournalEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_AUDIT);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AuditJournalEntry[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((e, i) => ({
        ...e,
        id: e.id ?? `legacy-${i}-${encodeURIComponent(e.dateHeure ?? '')}`,
      }));
    } catch {
      return [];
    }
  }

  private readPatientBarcodes(): Record<string, string> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_PATIENT_BARCODES);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private savePatientBarcodes(map: Record<string, string>): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_PATIENT_BARCODES, JSON.stringify(map));
  }

  private persist(entries: AuditJournalEntry[]): void {
    localStorage.setItem(STORAGE_AUDIT, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    this.entries.set(entries);
  }

  /** Supprime du journal les entrées non liées aux dossiers patients connus. */
  retainEntriesLinkedToDossiers(dossiers: string[]): void {
    const normalized = new Set(
      dossiers
        .map((d) => d.trim().toUpperCase())
        .filter((d) => d.length > 0)
    );
    if (normalized.size === 0) {
      this.persist([]);
      return;
    }
    const next = this.readAudit().filter((e) => {
      const dossier = (e.numDossier ?? '').trim().toUpperCase();
      return dossier.length > 0 && normalized.has(dossier);
    });
    this.persist(next);
  }

  setPosteTravail(nom: string): void {
    const v = nom.trim() || 'POSTE-LOCAL';
    localStorage.setItem(STORAGE_POSTE, v);
    this.posteTravail.set(v);
  }

  private operateurLabel(): string {
    const u = this.auth.user();
    return u ? `${u.prenom} ${u.nom}` : '—';
  }

  private nowLabel(): string {
    const d = new Date();
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private push(entry: Omit<AuditJournalEntry, 'id' | 'dateHeure' | 'operateur' | 'poste'> & Partial<Pick<AuditJournalEntry, 'operateur' | 'poste'>>): void {
    const full: AuditJournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dateHeure: this.nowLabel(),
      operateur: entry.operateur ?? this.operateurLabel(),
      poste: entry.poste ?? this.posteTravail(),
      numDossier: entry.numDossier,
      action: entry.action,
      couple: entry.couple,
      detail: entry.detail,
      statut: entry.statut,
    };
    const next = [full, ...this.readAudit()];
    this.persist(next);
  }

  /** Scan bracelet + étiquette avant acte critique (CDC §2.2). */
  logScanIdentitovigilance(params: {
    etapeCritique: string;
    braceletDossier: string;
    codeEtiquette: string;
    concordance: boolean;
    patientEtiquetteDossier?: string;
  }): void {
    const statut = params.concordance ? 'OK' : 'ALERTE';
    const couple = params.concordance
      ? `${params.braceletDossier}`
      : `${params.braceletDossier} ↔ ${params.patientEtiquetteDossier ?? '?'}`;
    const detail = params.concordance
      ? `${params.etapeCritique} — Concordance OK — code ${params.codeEtiquette}`
      : `${params.etapeCritique} — DISCORDANCE — bracelet ${params.braceletDossier} / étiquette patient ${params.patientEtiquetteDossier ?? 'inconnu'} — code ${params.codeEtiquette}`;
    this.push({
      numDossier: params.braceletDossier,
      action: 'Scan identitovigilance',
      couple,
      detail,
      statut,
    });
  }

  logImpressionEtiquettes(params: { typeLibelle: string; couple: string; qte: number; codes: string[]; numDossier: string }): void {
    const dossierKey = params.numDossier.trim().toUpperCase();
    const firstCode = params.codes[0]?.trim();
    if (dossierKey && firstCode) {
      const map = this.readPatientBarcodes();
      map[dossierKey] = firstCode;
      this.savePatientBarcodes(map);
    }
    const codesPreview = params.codes.slice(0, 3).join(', ') + (params.codes.length > 3 ? '…' : '');
    this.push({
      numDossier: params.numDossier,
      action: 'Impression étiquettes',
      couple: params.couple,
      detail: `${params.typeLibelle} ×${params.qte} — ${codesPreview}`,
      statut: 'OK',
    });
  }

  getPatientBarcode(numDossier: string): string | null {
    const dossierKey = numDossier.trim().toUpperCase();
    if (!dossierKey) return null;
    const map = this.readPatientBarcodes();
    return map[dossierKey] || null;
  }

  /** Bracelet / étiquette patient imprimée : retrouver le N° dossier à partir du code scanné. */
  findNumDossierByPatientBarcode(code: string): string | null {
    const needle = code.trim();
    if (!needle) return null;
    const map = this.readPatientBarcodes();
    const upper = needle.toUpperCase();
    for (const [dossierKey, stored] of Object.entries(map)) {
      const s = (stored ?? '').trim();
      if (!s) continue;
      if (s === needle || s.toUpperCase() === upper) return dossierKey;
    }
    return null;
  }

  logCryoMouvement(params: {
    type: 'Entrée' | 'Sortie';
    couple: string;
    paillettes: string;
    position: string;
    numDossier?: string;
  }): void {
    this.push({
      numDossier: params.numDossier,
      action: `Cryoconservation — ${params.type}`,
      couple: params.couple,
      detail: `${params.paillettes} — ${params.position}`,
      statut: 'OK',
    });
  }
}
