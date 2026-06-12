import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CyclePmaService } from '../../../core/services/cycle-pma.service';
import { CycleSignalRService } from '../../../core/services/cycle-signalr.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { EntityHistoryService } from '../../../core/services/entity-history.service';
import { PmaCycleNotificationsService } from '../../../core/services/pma-cycle-notifications.service';
import { CycleNotifSyncService } from '../../../core/services/cycle-notif-sync.service';
import { PmaCyclePhaseService, type PhaseCalendarItem, type JourPhaseCalendrier } from '../../../core/services/pma-cycle-phase.service';
import { totalStepsForActePma } from '../../../core/constants/acte-cycle-phases';
import { actePmaResumeCourt } from '../../../core/constants/acte-cycle-phases';
import { CyclePma, CycleEtapeHistorique, Patient, type ResultatTestGrossesse } from '../../../core/models';

@Component({
  selector: 'app-cycle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cycle-detail.component.html',
  styleUrl: './cycle-detail.component.scss'
})
export class CycleDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cycleService = inject(CyclePmaService);
  private signalR = inject(CycleSignalRService);
  private patientService = inject(PatientService);
  private phaseService = inject(PmaCyclePhaseService);
  private auth = inject(AuthService);
  private entityHistory = inject(EntityHistoryService);
  private notifSvc = inject(PmaCycleNotificationsService);
  private notifSync = inject(CycleNotifSyncService);
  private destroyRef = inject(DestroyRef);

  /** Statut de la connexion temps réel affiché dans la vue. */
  readonly isRealtime = signal(false);

  private readonly cycleSig = signal<CyclePma | undefined>(undefined);

  /** Dernier rappel journalier pour ce cycle (aujourd’hui en priorité). */
  readonly derniereNotifCycle = computed(() => {
    const c = this.cycleSig();
    if (!c) return null;
    const items = this.notifSvc.items().filter((n) => n.cycleId === c.id);
    if (items.length === 0) return null;

    const today = this.isoToday();
    const todayItems = items.filter((n) => n.jourDate === today);
    const pool = todayItems.length > 0 ? todayItems : items;
    const n = [...pool].sort((a, b) => b.jourDate.localeCompare(a.jourDate))[0]!;

    return {
      jourDate: n.jourDate,
      jourLabel: this.notifSvc.labelJour(n.jourDate, today),
      item: n,
    };
  });

  get cycle(): CyclePma | undefined {
    return this.cycleSig();
  }

  readonly cycleModificationHistory = computed(() => {
    const c = this.cycleSig();
    if (!c) return [];
    this.entityHistory.entries();
    return this.entityHistory.getForCycle(c.id);
  });

  patient?: Patient;
  historique: CycleEtapeHistorique[] = [];
  calendarPhases: PhaseCalendarItem[] = [];
  dailyPhases: JourPhaseCalendrier[] = [];
  stepCourant = 1;
  progressPercent = 0;

  resultatDraft: ResultatTestGrossesse = 'en_attente';
  saveResultMsg = '';
  savingResult = false;

  /** Case à cocher avant envoi de la signature biologiste. */
  signerCertifie = false;
  signataireDraft = '';
  signResultMsg = '';
  signingResult = false;

  totalSteps = 1;

  /** Case à cocher avant passage à l'étape suivante du parcours. */
  confirmerPassagePhase = false;
  avancePhaseMsg = '';
  avancePhaseEnCours = false;

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.pullCycle(id);
    this.connectRealtime(id);

    // Fallback polling toutes les 30 s (couvre les cas où SignalR est indisponible)
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const pid = +this.route.snapshot.paramMap.get('id')!;
        if (pid) this.pullCycle(pid);
      });

    // Rafraîchit le marqueur « aujourd'hui » à minuit ou lors d'une reconnexion
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshPhases());
  }

  ngOnDestroy(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    if (id) void this.signalR.leaveCycle(id);
  }

  private connectRealtime(cycleId: number): void {
    this.signalR
      .joinCycle(cycleId)
      .then(() => this.isRealtime.set(this.signalR.isConnected))
      .catch(() => this.isRealtime.set(false));

    this.signalR.cycleUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id === cycleId) this.pullCycle(id);
      });
  }

  /** Ferme une alerte de suivi pour ce cycle. */
  markNotifRead(id: string): void {
    this.notifSvc.markRead(id);
  }

  /** Recharge le cycle et l'historique depuis l'API pour garder le calendrier à jour. */
  private pullCycle(id: number): void {
    this.cycleService.getById(id).subscribe((c) => {
      this.cycleSig.set(c);
      this.refreshPhases();
      this.notifSync.forceSync();
      if (c?.patientId) {
        this.patientService.getById(c.patientId).subscribe({
          next: (p) => {
            this.patient = p;
            this.refreshPhases();
          },
          error: () => undefined,
        });
      }
    });
    this.cycleService.getHistorique(id).subscribe((h) => {
      this.historique = h;
      this.refreshPhases();
    });
  }

  /** Met en évidence le jour courant dans le calendrier jour par jour. */
  isCalendarToday(d: JourPhaseCalendrier): boolean {
    const now = new Date();
    return (
      d.date.getFullYear() === now.getFullYear() &&
      d.date.getMonth() === now.getMonth() &&
      d.date.getDate() === now.getDate()
    );
  }

  acteParcoursLabel(): string {
    return actePmaResumeCourt(this.patient?.typeActePma) || 'Parcours PMA';
  }

  trackExtremes(): { start: string; end: string } {
    const steps = this.phaseService.getSteps(this.patient?.typeActePma);
    if (steps.length === 0) return { start: '—', end: '—' };
    return { start: steps[0]!.label, end: steps[steps.length - 1]!.label };
  }

  private refreshPhases(): void {
    if (!this.cycle) return;
    const acte = this.patient?.typeActePma;
    this.totalSteps = totalStepsForActePma(acte);
    this.calendarPhases = this.phaseService.buildCalendar(this.cycle, acte, this.historique);
    this.dailyPhases = this.phaseService.buildDailyCalendar(this.cycle, acte, this.historique);
    this.stepCourant = this.phaseService.resolveStepIndex(this.cycle, acte, this.historique);
    this.progressPercent = this.phaseService.progressPercent(this.stepCourant, acte);
    const r = this.cycle.resultatTestGrossesse;
    this.resultatDraft =
      r === 'positif' || r === 'negatif' || r === 'en_attente' ? r : 'en_attente';
    this.signerCertifie = false;
    this.signataireDraft = this.libelleSignataireDefaut();
    this.confirmerPassagePhase = false;
  }

  peutAvancerPhase(): boolean {
    return !!this.cycle && this.stepCourant < this.totalSteps;
  }

  etapeCouranteLabel(): string {
    const steps = this.phaseService.getSteps(this.patient?.typeActePma);
    return steps[this.stepCourant - 1]?.label ?? '';
  }

  prochaineEtapeLabel(): string {
    const steps = this.phaseService.getSteps(this.patient?.typeActePma);
    return steps[this.stepCourant]?.label ?? '';
  }

  confirmerAvancementPhase(): void {
    if (!this.cycle || !this.peutAvancerPhase()) return;
    if (!this.confirmerPassagePhase) {
      this.avancePhaseMsg = 'Cochez la case de confirmation avant de passer à l’étape suivante.';
      return;
    }
    const etape = this.prochaineEtapeLabel();
    if (!etape) return;

    this.avancePhaseEnCours = true;
    this.avancePhaseMsg = '';
    this.cycleService
      .avancerEtape(this.cycle.id, {
        etape,
        observation: `Confirmation du passage : ${this.etapeCouranteLabel()} → ${etape}`,
      })
      .subscribe({
        next: () => {
          this.avancePhaseEnCours = false;
          this.confirmerPassagePhase = false;
          this.avancePhaseMsg = `Étape « ${etape} » activée.`;
          this.entityHistory.logCycle(
            this.cycle!.id,
            'Confirmation passage de phase',
            `${this.etapeCouranteLabel()} → ${etape}`,
            this.auth.user()?.identifiant
          );
          this.pullCycle(this.cycle!.id);
        },
        error: () => {
          this.avancePhaseEnCours = false;
          this.avancePhaseMsg =
            'Passage refusé par le serveur. Vérifiez l’API POST /cyclespma/{id}/avancer.';
        },
      });
  }

  dailyWeeks(): JourPhaseCalendrier[][] {
    const weeks: JourPhaseCalendrier[][] = [];
    for (let i = 0; i < this.dailyPhases.length; i += 7) {
      weeks.push(this.dailyPhases.slice(i, i + 7));
    }
    return weeks;
  }

  saveResultat(): void {
    if (!this.cycle) return;
    this.savingResult = true;
    this.saveResultMsg = '';
    this.signerCertifie = false;
    this.cycleService.patchResultatTest(this.cycle.id, this.resultatDraft).subscribe({
      next: () => {
        this.cycleSig.set({
          ...this.cycle!,
          resultatTestGrossesse: this.resultatDraft,
          resultatTestSignePar: null,
          resultatTestSigneLe: null,
        });
        this.entityHistory.logCycle(
          this.cycle!.id,
          'Mise \u00e0 jour r\u00e9sultat test de grossesse',
          `Valeur\u00a0: ${this.resultatDraft} (signature biologiste r\u00e9initialis\u00e9e)`,
          this.auth.user()?.identifiant
        );
        this.savingResult = false;
        this.saveResultMsg = 'R\u00e9sultat enregistr\u00e9. Validez par signature si positif ou n\u00e9gatif.';
      },
      error: () => {
        this.savingResult = false;
        this.saveResultMsg =
          "Enregistrement refus\u00e9 par le serveur. V\u00e9rifiez l'API PATCH /cyclespma/{id}/resultat-test.";
      },
    });
  }

  /** Après positif/négatif : signature obligatoire par la biologiste (traçabilité). */
  attenteSignatureBiologiste(): boolean {
    const c = this.cycle;
    if (!c) return false;
    const r = c.resultatTestGrossesse;
    if (r !== 'positif' && r !== 'negatif') return false;
    return !c.resultatTestSigneLe;
  }

  signatureResume(): string {
    const c = this.cycle;
    if (!c?.resultatTestSigneLe) return '';
    const d = new Date(c.resultatTestSigneLe);
    if (Number.isNaN(d.getTime())) return '';
    const lib = c.resultatTestSignePar?.trim() || '\u2014';
    return `Sign\u00e9 par ${lib} le ${d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  }

  libelleSignataireDefaut(): string {
    const u = this.auth.user();
    const nom = [u?.prenom, u?.nom].filter(Boolean).join(' ').trim();
    return nom || u?.identifiant?.trim() || 'Biologiste';
  }

  signerResultat(): void {
    if (!this.cycle) return;
    if (!this.signerCertifie) {
      this.signResultMsg = 'Cochez la case de certification avant de signer.';
      return;
    }
    const r = this.cycle.resultatTestGrossesse;
    if (r !== 'positif' && r !== 'negatif') {
      this.signResultMsg = 'Seuls les r\u00e9sultats positif ou n\u00e9gatif peuvent \u00eatre sign\u00e9s.';
      return;
    }
    this.signingResult = true;
    this.signResultMsg = '';
    const signataire = (this.signataireDraft || '').trim() || this.libelleSignataireDefaut();
    if (signataire.length < 2) {
      this.signResultMsg = 'Nom du signataire invalide.';
      return;
    }
    this.cycleService.postSignatureResultatTest(this.cycle.id, signataire).subscribe({
      next: () => {
        this.signingResult = false;
        this.signerCertifie = false;
        this.signResultMsg = 'Signature enregistr\u00e9e.';
        this.pullCycle(this.cycle!.id);
        this.entityHistory.logCycle(
          this.cycle!.id,
          'Signature biologiste \u2014 r\u00e9sultat test de grossesse',
          `Signataire\u00a0: ${signataire}`,
          this.auth.user()?.identifiant
        );
      },
      error: (err: unknown) => {
        this.signingResult = false;
        this.signResultMsg = this.messageErreurSignature(err);
      },
    });
  }

  private messageErreurSignature(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
      const maybe = (err.error as { message?: string; title?: string } | null) ?? null;
      if (maybe?.message?.trim()) return maybe.message.trim();
      if (maybe?.title?.trim()) return maybe.title.trim();
    }
    return 'Signature refus\u00e9e. V\u00e9rifiez que le r\u00e9sultat est positif ou n\u00e9gatif.';
  }

  deleteCycle(): void {
    if (!this.cycle) return;
    if (!confirm('Supprimer ce cycle ?')) return;
    this.cycleService.delete(this.cycle.id).subscribe({
      next: () => void this.router.navigate(['/cycles']),
    });
  }

  resultatAffiche(): string {
    const r = this.cycle?.resultatTestGrossesse;
    if (r === 'positif') return 'Positif';
    if (r === 'negatif') return 'N\u00e9gatif';
    return 'En attente';
  }

  resultatBadgeClass(): string {
    const r = this.cycle?.resultatTestGrossesse;
    if (r === 'positif') return 'res-positif';
    if (r === 'negatif') return 'res-negatif';
    return 'res-attente';
  }

  patientLabel(): string {
    if (this.patient) return `${this.patient.prenom} ${this.patient.nom}`;
    if (this.cycle) return `Patient #${this.cycle.patientId}`;
    return '';
  }

  private isoToday(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  dossierSubtitle(): string {
    if (!this.patient) return '';
    const parts = [`N\u00b0 dossier ${this.patient.numDossier}`];
    if (this.patient.typeDossier === 'couple' && this.patient.femmePrenom) {
      parts.push(
        `Couple\u00a0: ${this.patient.prenom} ${this.patient.nom} & ${this.patient.femmePrenom} ${this.patient.femmeNom ?? ''}`
      );
    }
    return parts.join(' \u00b7 ');
  }
}
