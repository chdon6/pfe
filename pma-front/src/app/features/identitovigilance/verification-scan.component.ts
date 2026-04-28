import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../core/services/patient.service';
import { ElementBiologiqueService } from '../../core/services/element-biologique.service';
import { IdentitovigilanceAuditService } from '../../core/services/identitovigilance-audit.service';
import type { Patient } from '../../core/models';
import type { EtiquetteLookup } from '../../core/models';

/** Étapes critiques listées au CDC (§2.2) — contrôle par scan avant manipulation. */
export const ETAPES_CRITIQUES = [
  'Prélèvement',
  'Ponction ovocytaire',
  'Recueil sperme',
  'Insémination / ICSI',
  'Mise en culture',
  'Transfert embryonnaire',
  'Congélation',
  'Décongélation',
  'Autre manipulation',
] as const;

interface ScanStep {
  number: number;
  label: string;
  done: boolean;
  active: boolean;
}

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-verification-scan',
  templateUrl: './verification-scan.component.html',
  styleUrl: './verification-scan.component.scss'
})
export class VerificationScanComponent implements OnInit {
  private readonly patients = inject(PatientService);
  private readonly elements = inject(ElementBiologiqueService);
  readonly audit = inject(IdentitovigilanceAuditService);

  scanInput = signal('');
  loading = signal(false);
  stepError = signal('');

  patientBracelet = signal<Patient | null>(null);
  lookup = signal<EtiquetteLookup | null>(null);
  /** Code-barres saisi à l’étape 2 (pour le journal). */
  lastEtiquetteCode = signal('');
  etapeCritique = signal<string>(ETAPES_CRITIQUES[0]);
  readonly etapesOptions = [...ETAPES_CRITIQUES];
  /** Synchronisé avec le service (localStorage) pour l’édition du poste. */
  posteModel = '';

  steps = signal<ScanStep[]>([
    { number: 1, label: 'Scanner le bracelet patient', done: false, active: true },
    { number: 2, label: 'Scanner l\'étiquette du contenant', done: false, active: false },
    { number: 3, label: 'Vérification de la concordance', done: false, active: false }
  ]);

  currentStep = signal(1);

  ngOnInit(): void {
    this.posteModel = this.audit.posteTravail();
  }

  concordance = computed(() => {
    const pb = this.patientBracelet();
    const lu = this.lookup();
    if (!pb || !lu?.trouve || !lu.patient) return false;
    return pb.id === lu.patient.id;
  });

  submitStep1(): void {
    this.syncPoste();
    this.stepError.set('');
    const v = this.scanInput().trim();
    if (!v) {
      this.stepError.set('Saisissez un numéro de dossier.');
      return;
    }
    this.loading.set(true);
    this.patients.getByNumDossier(v).subscribe({
      next: (p) => {
        this.patientBracelet.set(p);
        this.advanceFromStep(1);
        this.scanInput.set('');
        this.loading.set(false);
      },
      error: () => {
        this.stepError.set('Aucun patient trouvé pour ce numéro de dossier.');
        this.loading.set(false);
      }
    });
  }

  submitStep2(): void {
    this.syncPoste();
    this.stepError.set('');
    const v = this.scanInput().trim();
    if (!v) {
      this.stepError.set('Saisissez le code-barres de l\'étiquette.');
      return;
    }
    this.loading.set(true);
    this.elements.lookupEtiquette(v).subscribe({
      next: (lu) => {
        if (!lu.trouve || !lu.patient) {
          this.stepError.set(
            'Étiquette inconnue : aucun élément biologique ou paillette ne correspond à ce code. Vérifiez que le code-barres est enregistré (élément bio. ou stockage).'
          );
          this.loading.set(false);
          return;
        }
        this.lastEtiquetteCode.set(v);
        this.lookup.set(lu);
        this.advanceFromStep(2);
        this.finalizeAudit();
        this.scanInput.set('');
        this.loading.set(false);
      },
      error: () => {
        this.stepError.set('Erreur lors de la lecture de l\'étiquette. Réessayez.');
        this.loading.set(false);
      }
    });
  }

  private advanceFromStep(from: 1 | 2): void {
    const next = from + 1;
    this.steps.update((steps) =>
      steps.map((s) => {
        if (s.number === from) return { ...s, done: true, active: false };
        if (s.number === next) return { ...s, active: true };
        return s;
      })
    );
    this.currentStep.set(next);
  }

  /** Journalisation automatique concordance / discordance (CDC §2.2). */
  private finalizeAudit(): void {
    const pb = this.patientBracelet();
    const lu = this.lookup();
    if (!pb || !lu?.patient) return;
    const ok = pb.id === lu.patient.id;
    this.audit.logScanIdentitovigilance({
      etapeCritique: this.etapeCritique(),
      braceletDossier: pb.numDossier,
      codeEtiquette: this.lastEtiquetteCode(),
      concordance: ok,
      patientEtiquetteDossier: lu.patient.numDossier,
    });
  }

  syncPoste(): void {
    this.audit.setPosteTravail(this.posteModel);
  }

  reset(): void {
    this.steps.set([
      { number: 1, label: 'Scanner le bracelet patient', done: false, active: true },
      { number: 2, label: 'Scanner l\'étiquette du contenant', done: false, active: false },
      { number: 3, label: 'Vérification de la concordance', done: false, active: false }
    ]);
    this.currentStep.set(1);
    this.scanInput.set('');
    this.stepError.set('');
    this.patientBracelet.set(null);
    this.lookup.set(null);
    this.lastEtiquetteCode.set('');
  }
}
