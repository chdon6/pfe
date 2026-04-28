import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PatientService } from '../../core/services/patient.service';
import { ConsentementService } from '../../core/services/consentement.service';
import type { Patient, Consentement } from '../../core/models';

export interface DossierArchiveRow {
  patient: Patient;
  consentCount: number;
  pieceCount: number;
  lastSignature: string | null;
}

@Component({
  selector: 'app-dossiers-archive',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dossiers-archive.component.html',
  styleUrl: './dossiers-archive.component.scss',
})
export class DossiersArchiveComponent implements OnInit {
  private patientService = inject(PatientService);
  private consentementService = inject(ConsentementService);

  rows: DossierArchiveRow[] = [];
  filtered: DossierArchiveRow[] = [];
  search = '';
  loading = true;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      patients: this.patientService.getAll().pipe(catchError(() => of<Patient[]>([]))),
      consentements: this.consentementService.getAll().pipe(catchError(() => of<Consentement[]>([]))),
    }).subscribe({
      next: ({ patients, consentements }) => {
        const byPatient = new Map<number, Consentement[]>();
        for (const c of consentements) {
          if (!byPatient.has(c.patientId)) byPatient.set(c.patientId, []);
          byPatient.get(c.patientId)!.push(c);
        }

        this.rows = patients.map((patient) => {
          const list = byPatient.get(patient.id) ?? [];
          const pieceCount = list.reduce((n, co) => n + this.countPieces(co), 0);
          const dates = list
            .map((co) => co.dateSignature)
            .filter(Boolean)
            .sort()
            .reverse();
          return {
            patient,
            consentCount: list.length,
            pieceCount,
            lastSignature: dates[0] ?? null,
          } satisfies DossierArchiveRow;
        });

        this.rows.sort((a, b) => {
          const na = a.patient.nom?.localeCompare(b.patient.nom ?? '', 'fr', { sensitivity: 'base' }) ?? 0;
          if (na !== 0) return na;
          return (a.patient.prenom ?? '').localeCompare(b.patient.prenom ?? '', 'fr', { sensitivity: 'base' });
        });

        this.applyFilter();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private countPieces(c: Consentement): number {
    let n = 0;
    if (c.photoPath) n++;
    if (c.cinHommePath) n++;
    if (c.cinFemmePath) n++;
    if (c.contratMariagePath) n++;
    return n;
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.rows];
      return;
    }
    this.filtered = this.rows.filter((r) => {
      const p = r.patient;
      const femme = `${p.femmeNom ?? ''} ${p.femmePrenom ?? ''}`.toLowerCase();
      return (
        (p.nom ?? '').toLowerCase().includes(q) ||
        (p.prenom ?? '').toLowerCase().includes(q) ||
        (p.numDossier ?? '').toLowerCase().includes(q) ||
        femme.includes(q)
      );
    });
  }

  statutDossier(r: DossierArchiveRow): 'complet' | 'partiel' | 'vide' {
    if (r.consentCount === 0) return 'vide';
    if (r.pieceCount === 0) return 'partiel';
    return 'complet';
  }
}
