import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
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
import { CycleSignalRService } from '../../../core/services/cycle-signalr.service';
import { PmaCyclePhaseService, type JourPhaseCalendrier } from '../../../core/services/pma-cycle-phase.service';
import { PmaCycleNotificationsService } from '../../../core/services/pma-cycle-notifications.service';
import { CycleNotifSyncService } from '../../../core/services/cycle-notif-sync.service';
import { RoleService } from '../../../core/services/role.service';
import { CyclePma, CycleEtapeHistorique, Patient, RendezVous } from '../../../core/models';
import {
  resumeParcoursPatientDossier,
  typeActePmaImpliqueCycleAmp,
} from '../../../core/constants/acte-pma-types';
import {
  phaseLabelsForActePma,
  actePmaResumeCourt,
  totalStepsForActePma,
} from '../../../core/constants/acte-cycle-phases';

interface DossierMedicalGroupe {
  patientId: number;
  label: string;
  numDossier: string;
  typeActePma?: string | null;
  cycles: CyclePma[];
}

@Component({
  selector: 'app-cycle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cycle-list.component.html',
  styleUrl: './cycle-list.component.scss',
})
export class CycleListComponent implements OnInit, OnDestroy {
  private cycleService = inject(CyclePmaService);
  private patientService = inject(PatientService);
  private rendezVousService = inject(RendezVousService);
  private router = inject(Router);
  readonly phaseService = inject(PmaCyclePhaseService);
  private notifService = inject(PmaCycleNotificationsService);
  private notifSync = inject(CycleNotifSyncService);
  private roleSvc = inject(RoleService);
  private signalR = inject(CycleSignalRService);
  private destroyRef = inject(DestroyRef);

  readonly groupedByJour = this.notifService.groupedByJour;
  readonly countNotifsAujourdhui = this.notifService.countAujourdhui;
  readonly isBiologiste = computed(() => this.roleSvc.role() === 'Biologiste');
  readonly isRealtime = this.notifSync.isRealtime;
  showJourNotifs = true;
  notifFilter: 'aujourdhui' | 'semaine' = 'aujourdhui';

  cycles: CyclePma[] = [];
  patients: Patient[] = [];
  private historiqueByCycleId = new Map<number, CycleEtapeHistorique[]>();
  private rdvsActifs: RendezVous[] = [];
  private patientIdsAvecRdv = new Set<number>();
  loading = true;

  searchQuery = '';

  showForm = false;
  newCycle = { phase: '', patientId: 0 };
  cycleFormError = '';

  expandedDossierId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadData();
    this.connectRealtime();

    interval(120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isRealtime()) {
          this.loadData();
        }
      });
  }

  ngOnDestroy(): void {
    void this.signalR.leaveCyclesList();
  }

  private connectRealtime(): void {
    this.signalR.cycleListChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());

    this.signalR.cycleUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadData();
        this.notifSync.forceSync();
      });
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      cycles: this.cycleService.getAll().pipe(catchError(() => of<CyclePma[]>([]))),
      patients: this.patientService.getAll().pipe(catchError(() => of<Patient[]>([]))),
      historiques: this.cycleService.getAllHistoriques().pipe(catchError(() => of<CycleEtapeHistorique[]>([]))),
      rdvs: this.rendezVousService.getAll().pipe(catchError(() => of<RendezVous[]>([]))),
    }).subscribe({
      next: ({ cycles, patients, historiques, rdvs }) => {
        this.cycles = [...cycles];
        this.patients = [...patients];
        this.rdvsActifs = rdvs.filter((r) => (r.statut || '').trim().toLowerCase() !== 'annule');
        this.historiqueByCycleId = new Map();
        for (const h of historiques) {
          if (!this.historiqueByCycleId.has(h.cyclePmaId)) {
            this.historiqueByCycleId.set(h.cyclePmaId, []);
          }
          this.historiqueByCycleId.get(h.cyclePmaId)!.push(h);
        }
        this.patientIdsAvecRdv = new Set(this.rdvsActifs.map((r) => r.patientId));
        this.syncNotifications();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  historiqueFor(cycleId: number): CycleEtapeHistorique[] {
    return this.historiqueByCycleId.get(cycleId) ?? [];
  }

  private syncNotifications(): void {
    this.notifService.syncFromCycles(
      this.cycles.map((c) => {
        const p = this.patientFor(c.patientId);
        const hist = this.historiqueFor(c.id);
        return {
          cycleId: c.id,
          patientLabel: this.getPatientName(c.patientId),
          phase: c.phase || '',
          etapeCourante: c.etapeCourante,
          step: this.phaseService.resolveStepIndex(c, p?.typeActePma, hist),
          dateDebut: c.dateDebut,
          statut: c.statutCycle,
          resultatTestGrossesse: c.resultatTestGrossesse,
          typeActePma: p?.typeActePma,
          historique: hist,
          rdvs: this.rdvsActifs
            .filter((r) => r.patientId === c.patientId)
            .map((r) => ({
              dateHeure: typeof r.dateHeure === 'string' ? r.dateHeure : String(r.dateHeure),
              motif: r.motif,
            })),
        };
      })
    );
  }

  /** Phases proposées selon l’acte PMA du patient sélectionné. */
  phaseOptionsForForm(): string[] {
    const p = this.patients.find((x) => x.id === this.newCycle.patientId);
    return phaseLabelsForActePma(p?.typeActePma);
  }

  onPatientChange(): void {
    const opts = this.phaseOptionsForForm();
    if (opts.length && !opts.includes(this.newCycle.phase)) {
      this.newCycle.phase = opts[0]!;
    }
  }

  dossiersGroupes(): DossierMedicalGroupe[] {
    const q = this.searchQuery.trim().toLowerCase();
    const map = new Map<number, CyclePma[]>();
    for (const c of this.cycles) {
      if (!map.has(c.patientId)) map.set(c.patientId, []);
      map.get(c.patientId)!.push(c);
    }
    let rows: DossierMedicalGroupe[] = [...map.entries()].map(([patientId, list]) => {
      const p = this.patientFor(patientId);
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
        typeActePma: p?.typeActePma,
        cycles: sorted,
      };
    });

    if (q) {
      rows = rows.filter((d) => {
        if (d.label.toLowerCase().includes(q)) return true;
        if (d.numDossier.toLowerCase().includes(q)) return true;
        const acte = actePmaResumeCourt(d.typeActePma).toLowerCase();
        if (acte && acte.includes(q)) return true;
        return d.cycles.some(
          (c) =>
            (c.phase || '').toLowerCase().includes(q) ||
            (c.etapeCourante || '').toLowerCase().includes(q)
        );
      });
    }

    return rows.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }

  /** Cycles plats filtrés (vue non biologiste). */
  cyclesFiltres(): CyclePma[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.cycles;
    return this.cycles.filter((c) => {
      const name = this.getPatientName(c.patientId).toLowerCase();
      const p = this.patientFor(c.patientId);
      const dossier = (p?.numDossier ?? '').toLowerCase();
      return (
        name.includes(q) ||
        dossier.includes(q) ||
        (c.phase || '').toLowerCase().includes(q) ||
        (c.etapeCourante || '').toLowerCase().includes(q)
      );
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  toggleDossier(patientId: number, ev?: Event): void {
    ev?.stopPropagation();
    this.expandedDossierId.update((v) => (v === patientId ? null : patientId));
  }

  previewSemaine(c: CyclePma): JourPhaseCalendrier[] {
    const acte = this.patientFor(c.patientId)?.typeActePma;
    return this.phaseService
      .buildDailyCalendar(c, acte, this.historiqueFor(c.id))
      .slice(0, 7);
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

  signatureBiologisteManquante(c: CyclePma): boolean {
    const r = c.resultatTestGrossesse;
    if (r !== 'positif' && r !== 'negatif') return false;
    return !c.resultatTestSigneLe;
  }

  toggleJourNotifs(): void {
    this.showJourNotifs = !this.showJourNotifs;
  }

  setNotifFilter(mode: 'aujourdhui' | 'semaine'): void {
    this.notifFilter = mode;
  }

  notifsAffichees() {
    const groups = this.groupedByJour();
    if (this.notifFilter === 'aujourdhui') {
      const today = this.isoToday();
      const g = groups.filter((x) => x.jourDate === today);
      return g.length ? g : groups.slice(0, 1);
    }
    return groups.slice(0, 7);
  }

  totalDossiers(): number {
    return this.dossiersGroupes().length;
  }

  initiales(label: string): string {
    const principal = label.split('&')[0]?.trim() ?? label;
    const parts = principal.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  }

  acteDossier(d: DossierMedicalGroupe): string {
    return actePmaResumeCourt(d.typeActePma) || 'Parcours PMA';
  }

  private isoToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  markRead(id: string, ev?: Event): void {
    ev?.stopPropagation();
    this.notifService.markRead(id);
  }

  markAllRead(): void {
    this.notifService.markAllRead();
  }

  goToCycleFromNotif(cycleId: number, notifId: string, ev?: Event): void {
    ev?.stopPropagation();
    this.notifService.markRead(notifId);
    this.goToCycle(cycleId);
  }

  patientFor(patientId: number): Patient | undefined {
    return this.patients.find((x) => x.id === patientId);
  }

  getPatientName(patientId: number): string {
    const p = this.patientFor(patientId);
    return p ? `${p.prenom} ${p.nom}` : `Patient #${patientId}`;
  }

  stepIndex(c: CyclePma): number {
    const acte = this.patientFor(c.patientId)?.typeActePma;
    return this.phaseService.resolveStepIndex(c, acte, this.historiqueFor(c.id));
  }

  totalStepsFor(c: CyclePma): number {
    return totalStepsForActePma(this.patientFor(c.patientId)?.typeActePma);
  }

  progressPct(c: CyclePma): number {
    const acte = this.patientFor(c.patientId)?.typeActePma;
    return this.phaseService.progressPercent(this.stepIndex(c), acte);
  }

  badgeActe(c: CyclePma): string {
    const p = this.patientFor(c.patientId);
    return this.phaseService.badgeTypeActe(p?.typeActePma ?? undefined, c.phase || '');
  }

  trackLabels(c: CyclePma): { start: string; end: string } {
    const steps = this.phaseService.getSteps(this.patientFor(c.patientId)?.typeActePma);
    if (steps.length === 0) return { start: '—', end: '—' };
    return { start: steps[0]!.label, end: steps[steps.length - 1]!.label };
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

  /**
   * Patients éligibles à l’ouverture d’un cycle :
   * acte AMP avec cycle (FIV, ICSI, IIU, etc.), au moins un RDV actif, les plus récents en premier.
   */
  patientsEligiblesAuCycle(): Patient[] {
    return this.patients
      .filter(
        (p) =>
          this.patientIdsAvecRdv.has(p.id) && typeActePmaImpliqueCycleAmp(p.typeActePma)
      )
      .sort((a, b) => this.ordreNouveautePatient(b) - this.ordreNouveautePatient(a));
  }

  /** Plus l’id est élevé, plus le dossier est considéré comme récent (enregistrement en base). */
  private ordreNouveautePatient(p: Patient): number {
    return p.id;
  }

  estPatientNouveau(p: Patient): boolean {
    const eligibles = this.patientsEligiblesAuCycle();
    if (eligibles.length === 0) return false;
    const seuil = Math.max(...eligibles.map((x) => x.id));
    return p.id >= seuil - 2;
  }

  saveCycle(): void {
    this.cycleFormError = '';
    if (!this.newCycle.patientId) {
      this.cycleFormError = 'Sélectionnez un patient.';
      return;
    }
    const pSel = this.patientFor(this.newCycle.patientId);
    if (!pSel || !typeActePmaImpliqueCycleAmp(pSel.typeActePma)) {
      this.cycleFormError =
        'Ce dossier n’a pas d’acte nécessitant un cycle PMA (FIV, ICSI, insémination, etc.).';
      return;
    }
    if (!this.patientIdsAvecRdv.has(this.newCycle.patientId)) {
      this.cycleFormError =
        'Ce patient n’a pas de rendez-vous enregistré. Planifiez d’abord un rendez-vous avant d’ouvrir un cycle PMA.';
      return;
    }
    const phase = (this.newCycle.phase || '').trim();
    if (!phase) {
      this.cycleFormError = 'La phase du cycle PMA est obligatoire.';
      return;
    }
    const cycle: Record<string, unknown> = {
      phase,
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
      if (err.status >= 500) {
        return 'Erreur serveur lors de la création du cycle. Vérifiez la phase et réessayez.';
      }
      if (typeof err.error === 'string' && err.error.trim()) {
        const message = err.error.trim();
        if (
          message.includes('Exception') ||
          message.includes('ORA-') ||
          message.includes('at PMA.Api') ||
          message.includes('<!DOCTYPE')
        ) {
          return 'Erreur serveur lors de la création du cycle. Vérifiez les champs saisis puis réessayez.';
        }
        return message;
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

  parcoursDossierPatient(patientId: number): string {
    const p = this.patientFor(patientId);
    return p ? resumeParcoursPatientDossier(p.typeActePma) : '';
  }

  libelleOptionPatient(p: Patient): string {
    const base = `${p.prenom} ${p.nom}`.trim();
    const acte = actePmaResumeCourt(p.typeActePma) || 'Parcours AMP';
    const prefix = this.estPatientNouveau(p) ? '★ Nouveau · ' : '';
    return `${prefix}${base} — ${acte}`;
  }

  deleteCycle(id: number, ev?: Event): void {
    ev?.stopPropagation();
    const c = this.cycles.find((x) => x.id === id);
    if (c?.demo) return;
    if (confirm('Supprimer ce cycle ?')) {
      this.cycleService.delete(id).subscribe(() => this.loadData());
    }
  }
}
