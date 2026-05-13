import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CyclePmaService } from '../../../core/services/cycle-pma.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { EntityHistoryService } from '../../../core/services/entity-history.service';
import {
  PmaCyclePhaseService,
  type PhaseCalendarItem,
  type JourPhaseCalendrier,
  PMA_TOTAL_STEPS,
} from '../../../core/services/pma-cycle-phase.service';
import { CyclePma, CycleEtapeHistorique, Patient, type ResultatTestGrossesse } from '../../../core/models';

@Component({
  selector: 'app-cycle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cycle-detail.component.html',
  styleUrl: './cycle-detail.component.scss'
})
export class CycleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cycleService = inject(CyclePmaService);
  private patientService = inject(PatientService);
  private phaseService = inject(PmaCyclePhaseService);
  private auth = inject(AuthService);
  private entityHistory = inject(EntityHistoryService);
  private destroyRef = inject(DestroyRef);

  private readonly cycleSig = signal<CyclePma | undefined>(undefined);

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

  readonly totalSteps = PMA_TOTAL_STEPS;

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.pullCycle(id);

    interval(90_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const pid = +this.route.snapshot.paramMap.get('id')!;
        if (pid) this.pullCycle(pid);
      });
  }

  /** Recharge le cycle et l’historique depuis l’API pour garder le calendrier à jour. */
  private pullCycle(id: number): void {
    this.cycleService.getById(id).subscribe((c) => {
      this.cycleSig.set(c);
      this.refreshPhases();
      if (c?.patientId) {
        this.patientService.getById(c.patientId).subscribe({
          next: (p) => (this.patient = p),
          error: () => undefined,
        });
      }
    });
    this.cycleService.getHistorique(id).subscribe((h) => (this.historique = h));
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

  private refreshPhases(): void {
    if (!this.cycle) return;
    this.calendarPhases = this.phaseService.buildCalendar(this.cycle);
    this.dailyPhases = this.phaseService.buildDailyCalendar(this.cycle);
    this.stepCourant = this.phaseService.resolveStepIndex(this.cycle);
    this.progressPercent = this.phaseService.progressPercent(this.stepCourant);
    const r = this.cycle.resultatTestGrossesse;
    this.resultatDraft =
      r === 'positif' || r === 'negatif' || r === 'en_attente' ? r : 'en_attente';
    this.signerCertifie = false;
    this.signataireDraft = this.libelleSignataireDefaut();
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
          'Mise à jour résultat test de grossesse',
          `Valeur : ${this.resultatDraft} (signature biologiste réinitialisée)`,
          this.auth.user()?.identifiant
        );
        this.savingResult = false;
        this.saveResultMsg = 'Résultat enregistré. Validez par signature si positif ou négatif.';
      },
      error: () => {
        this.savingResult = false;
        this.saveResultMsg =
          'Enregistrement refusé par le serveur. Vérifiez l’API PATCH /cyclespma/{id}/resultat-test.';
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
    const lib = c.resultatTestSignePar?.trim() || '—';
    return `Signé par ${lib} le ${d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
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
      this.signResultMsg = 'Seuls les résultats positif ou négatif peuvent être signés.';
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
        this.signResultMsg = 'Signature enregistrée.';
        this.pullCycle(this.cycle!.id);
        this.entityHistory.logCycle(
          this.cycle!.id,
          'Signature biologiste — résultat test de grossesse',
          `Signataire : ${signataire}`,
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
    return 'Signature refusée. Vérifiez que le résultat est positif ou négatif.';
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
    if (r === 'negatif') return 'Négatif';
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

  dossierSubtitle(): string {
    if (!this.patient) return '';
    const parts = [`N° dossier ${this.patient.numDossier}`];
    if (this.patient.typeDossier === 'couple' && this.patient.femmePrenom) {
      parts.push(
        `Couple : ${this.patient.prenom} ${this.patient.nom} & ${this.patient.femmePrenom} ${this.patient.femmeNom ?? ''}`
      );
    }
    return parts.join(' · ');
  }
}
