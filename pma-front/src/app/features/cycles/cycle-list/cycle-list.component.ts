import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CyclePmaService } from '../../../core/services/cycle-pma.service';
import { PatientService } from '../../../core/services/patient.service';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { PmaCyclePhaseService, PMA_TOTAL_STEPS, type JourPhaseCalendrier } from '../../../core/services/pma-cycle-phase.service';
import { PmaCycleNotificationsService } from '../../../core/services/pma-cycle-notifications.service';
import { RoleService } from '../../../core/services/role.service';
import { CyclePma, Patient, RendezVous } from '../../../core/models';
import {
  resumeParcoursPatientDossier,
  typeActePmaEstParcoursLaboStockageSeul,
  typeActePmaImpliqueCycleAmp
} from '../../../core/constants/acte-pma-types';

interface DossierMedicalGroupe {
  patientId: number;
  label: string;
  numDossier: string;
  cycles: CyclePma[];
}

@Component({
  selector: 'app-cycle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cycle-list.component.html',
  styleUrl: './cycle-list.component.scss'
})
export class CycleListComponent implements OnInit {
  private cycleService = inject(CyclePmaService);
  private patientService = inject(PatientService);
  private rendezVousService = inject(RendezVousService);
  private router = inject(Router);
  readonly phaseService = inject(PmaCyclePhaseService);
  private notifService = inject(PmaCycleNotificationsService);
  private roleSvc = inject(RoleService);
  private destroyRef = inject(DestroyRef);

  readonly totalSteps = PMA_TOTAL_STEPS;
  readonly notifs = this.notifService.items;
  readonly unreadCount = this.notifService.unreadCount;
  readonly isBiologiste = computed(() => this.roleSvc.role() === 'Biologiste');

  cycles: CyclePma[] = [];
  patients: Patient[] = [];
  /** Patients ayant au moins un rendez-vous non annulé (requis pour ouvrir un cycle). */
  private patientIdsAvecRdv = new Set<number>();
  loading = true;

  showForm = false;
  newCycle = { phase: '', patientId: 0 };
  cycleFormError = '';

  panelOpen = signal(false);
  /** Dossier médical (patient) déplié — vue biologiste */
  expandedDossierId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadData();
    interval(120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.roleSvc.role() === 'Biologiste') {
          this.loadData();
        }
      });
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      cycles: this.cycleService.getAll().pipe(catchError(() => of<CyclePma[]>([]))),
      patients: this.patientService.getAll().pipe(catchError(() => of<Patient[]>([]))),
      rdvs: this.rendezVousService.getAll().pipe(catchError(() => of<RendezVous[]>([]))),
    }).subscribe({
      next: ({ cycles, patients, rdvs }) => {
        this.cycles = [...cycles];
        this.patients = [...patients];
        this.patientIdsAvecRdv = new Set(
          rdvs
            .filter((r) => (r.statut || '').trim().toLowerCase() !== 'annule')
            .map((r) => r.patientId)
        );
        this.syncNotifications();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private syncNotifications(): void {
    this.notifService.syncFromCycles(
      this.cycles.map((c) => ({
        cycleId: c.id,
        patientLabel: this.getPatientName(c.patientId),
        phase: c.phase || '',
        step: this.phaseService.resolveStepIndex(c),
        dateDebut: c.dateDebut,
        statut: c.statutCycle,
        resultatTestGrossesse: c.resultatTestGrossesse,
      }))
    );
  }

  dossiersGroupes(): DossierMedicalGroupe[] {
    const map = new Map<number, CyclePma[]>();
    for (const c of this.cycles) {
      if (!map.has(c.patientId)) map.set(c.patientId, []);
      map.get(c.patientId)!.push(c);
    }
    const rows: DossierMedicalGroupe[] = [...map.entries()].map(([patientId, list]) => {
      const p = this.patients.find((x) => x.id === patientId);
      const sorted = [...list].sort(
        (a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
      );
      let label: string;
      if (p) {
        label = `${p.prenom} ${p.nom}`;
        if (p.typeDossier === 'couple' && p.femmePrenom) {
          label += ` & ${p.femmePrenom} ${p.femmeNom ?? ''}`;
        }
      } else {
        label = `Patient #${patientId}`;
      }
      return {
        patientId,
        label: label.trim(),
        numDossier: p?.numDossier ?? '—',
        cycles: sorted,
      };
    });
    return rows.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  toggleDossier(patientId: number, ev?: Event): void {
    ev?.stopPropagation();
    this.expandedDossierId.update((v) => (v === patientId ? null : patientId));
  }

  previewSemaine(c: CyclePma): JourPhaseCalendrier[] {
    return this.phaseService.buildDailyCalendar(c).slice(0, 7);
  }

  resultatBadgeLabel(c: CyclePma): string {
    const r = c.resultatTestGrossesse;
    if (r === 'positif') return 'β-hCG +';
    if (r === 'negatif') return 'β-hCG −';
    return 'Test en attente';
  }

  resultatBadgeClass(c: CyclePma): string {
    const r = c.resultatTestGrossesse;
    if (r === 'positif') return 'badge-res-positif';
    if (r === 'negatif') return 'badge-res-negatif';
    return 'badge-res-attente';
  }

  /** Résultat positif/négatif sans signature biologiste. */
  signatureBiologisteManquante(c: CyclePma): boolean {
    const r = c.resultatTestGrossesse;
    if (r !== 'positif' && r !== 'negatif') return false;
    return !c.resultatTestSigneLe;
  }

  togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  markRead(id: string): void {
    this.notifService.markRead(id);
  }

  markAllRead(): void {
    this.notifService.markAllRead();
  }

  dismissNotif(id: string, ev: Event): void {
    ev.stopPropagation();
    this.notifService.dismiss(id);
  }

  getPatientName(patientId: number): string {
    const p = this.patients.find((x) => x.id === patientId);
    return p ? `${p.prenom} ${p.nom}` : `Patient #${patientId}`;
  }

  stepIndex(c: CyclePma): number {
    return this.phaseService.resolveStepIndex(c);
  }

  progressPct(c: CyclePma): number {
    return this.phaseService.progressPercent(this.stepIndex(c));
  }

  badgeActe(c: CyclePma): string {
    return this.phaseService.badgeTypeActe(undefined, c.phase || '');
  }

  dateIso(c: CyclePma): string {
    const x = new Date(c.dateDebut);
    if (Number.isNaN(x.getTime())) return '';
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const d = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  goToCycle(id: number): void {
    void this.router.navigate(['/cycles', id]);
  }

  openNew(): void {
    this.cycleFormError = '';
    this.newCycle = { phase: '', patientId: 0 };
    this.showForm = true;
  }

  /** Patients éligibles à la création d'un cycle (au moins un RDV non annulé). */
  patientsEligiblesAuCycle(): Patient[] {
    return this.patients.filter((p) => this.patientIdsAvecRdv.has(p.id));
  }

  saveCycle(): void {
    this.cycleFormError = '';
    if (!this.newCycle.patientId) {
      this.cycleFormError = 'Sélectionnez un patient.';
      return;
    }
    if (!this.patientIdsAvecRdv.has(this.newCycle.patientId)) {
      this.cycleFormError =
        'Ce patient n’a pas de rendez-vous enregistré. Planifiez d’abord un rendez-vous avant d’ouvrir un cycle PMA.';
      return;
    }
    const pSel = this.patients.find((x) => x.id === this.newCycle.patientId);
    if (pSel && typeActePmaEstParcoursLaboStockageSeul(pSel.typeActePma)) {
      const ok = confirm(
        'Ce dossier est orienté laboratoire / conservation (ex. cryoconservation de sperme) : un cycle PMA de stimulation n’est en général pas nécessaire. Voulez-vous quand même créer un cycle ?'
      );
      if (!ok) return;
    }
    const cycle: Record<string, unknown> = {
      phase: this.newCycle.phase,
      patientId: this.newCycle.patientId,
    };
    this.cycleService.create(cycle as unknown as CyclePma).subscribe({
      next: () => {
        this.showForm = false;
        this.loadData();
      },
      error: (err: unknown) => {
        this.cycleFormError = this.messageErreurCreationCycle(err);
      },
    });
  }

  private messageErreurCreationCycle(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string' && err.error.trim()) {
        return err.error.trim();
      }
      if (err.error && typeof err.error === 'object') {
        const o = err.error as Record<string, unknown>;
        const msg = o['message'] ?? o['title'];
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
      if (err.status === 0) {
        return 'Serveur injoignable : vérifiez que l’API est démarrée.';
      }
    }
    return 'Impossible de créer le cycle. Réessayez ou vérifiez les données.';
  }

  /** Rappel métier sous le formulaire « Nouveau cycle ». */
  parcoursDossierPatient(patientId: number): string {
    const p = this.patients.find((x) => x.id === patientId);
    return p ? resumeParcoursPatientDossier(p.typeActePma) : '';
  }

  patientActeImpliqueCycle(patientId: number): boolean {
    const p = this.patients.find((x) => x.id === patientId);
    return typeActePmaImpliqueCycleAmp(p?.typeActePma);
  }

  patientActeLaboSeul(patientId: number): boolean {
    const p = this.patients.find((x) => x.id === patientId);
    return typeActePmaEstParcoursLaboStockageSeul(p?.typeActePma);
  }

  /** Libellé court pour la liste déroulante (acte dossier). */
  libelleOptionPatient(p: Patient): string {
    const base = `${p.prenom} ${p.nom}`.trim();
    if (typeActePmaImpliqueCycleAmp(p.typeActePma)) return `${base} (parcours AMP — cycle indiqué)`;
    if (typeActePmaEstParcoursLaboStockageSeul(p.typeActePma)) return `${base} (labo / stockage — cycle souvent inutile)`;
    return base;
  }

  deleteCycle(id: number, ev?: Event): void {
    ev?.stopPropagation();
    if (this.isBiologiste()) return;
    const c = this.cycles.find((x) => x.id === id);
    if (c?.demo) return;
    if (confirm('Supprimer ce cycle ?')) {
      this.cycleService.delete(id).subscribe(() => this.loadData());
    }
  }
}
