import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PatientService } from '../../core/services/patient.service';
import { ElementBiologiqueService } from '../../core/services/element-biologique.service';
import { StockageService } from '../../core/services/stockage.service';
import { IdentitovigilanceAuditService } from '../../core/services/identitovigilance-audit.service';
import type { Patient, ElementBiologique, PailleTube } from '../../core/models';
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

const CAMERA_READER_STEP1 = 'verification-camera-step1';
const CAMERA_READER_STEP2 = 'verification-camera-step2';

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-verification-scan',
  templateUrl: './verification-scan.component.html',
  styleUrl: './verification-scan.component.scss'
})
export class VerificationScanComponent implements OnInit, OnDestroy {
  private readonly patients = inject(PatientService);
  private readonly elements = inject(ElementBiologiqueService);
  private readonly stockage = inject(StockageService);
  readonly audit = inject(IdentitovigilanceAuditService);

  patientOptions = signal<Patient[]>([]);
  allElements = signal<ElementBiologique[]>([]);
  allPailles = signal<PailleTube[]>([]);
  selectedDossier = signal('');
  scanInput = signal('');
  loading = signal(false);
  stepError = signal('');

  readonly codesBarrePatient = computed(() => {
    const pb = this.patientBracelet();
    if (!pb) return [];
    const codes: { code: string; type: string; origine: string }[] = [];
    const seen = new Set<string>();
    for (const el of this.allElements()) {
      if (el.patientId === pb.id && el.codeBarre && !seen.has(el.codeBarre)) {
        seen.add(el.codeBarre);
        codes.push({ code: el.codeBarre, type: el.typeElement, origine: 'Élément biologique' });
      }
    }
    for (const p of this.allPailles()) {
      if (!p.codeBarre || seen.has(p.codeBarre)) continue;
      if (p.patientId === pb.id) {
        seen.add(p.codeBarre);
        codes.push({ code: p.codeBarre, type: p.typeContenu, origine: 'Paillette cryo' });
      }
    }
    return codes;
  });

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

  /** 0 = caméra fermée ; 1 ou 2 = scan actif pour l’étape correspondante. */
  cameraOpenFor = signal<0 | 1 | 2>(0);
  cameraError = signal('');

  private html5Qr: Html5Qrcode | null = null;
  private lastDecodeText = '';
  private lastDecodeTime = 0;

  ngOnInit(): void {
    this.posteModel = this.audit.posteTravail();
    this.loadPatients();
    this.loadCodesBarres();
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
    const raw = this.selectedDossier().trim() || this.scanInput().trim();
    const v = this.audit.findNumDossierByPatientBarcode(raw) ?? raw;
    if (!v) {
      this.stepError.set('Sélectionnez un numéro de dossier ou scannez un code.');
      return;
    }
    this.loading.set(true);
    this.patients.getByNumDossier(v).subscribe({
      next: (p) => {
        this.patientBracelet.set(p);
        this.selectedDossier.set(p.numDossier);
        this.advanceFromStep(1);
        this.scanInput.set('');
        this.loading.set(false);
      },
      error: () => {
        this.stepError.set(
          'Aucun patient trouvé pour ce code. Utilisez le N° dossier (ex. PMA-0018) ou un bracelet / étiquette patient déjà enregistré après impression.'
        );
        this.loading.set(false);
      }
    });
  }

  onPatientSelected(value: string): void {
    this.selectedDossier.set(value);
    if (!value.trim() || this.loading()) return;
    this.submitStep1();
  }

  submitStep2(): void {
    this.syncPoste();
    this.stepError.set('');
    const v = this.scanInput().trim();
    const pb = this.patientBracelet();
    if (!v) {
      this.stepError.set('Saisissez le code-barres de l\'étiquette.');
      return;
    }
    const patientBarcode = pb ? this.audit.getPatientBarcode(pb.numDossier) : null;
    if (pb && patientBarcode && v === patientBarcode) {
      this.lastEtiquetteCode.set(v);
      this.lookup.set({
        trouve: true,
        origine: 'element_biologique',
        patient: {
          id: pb.id,
          nom: pb.nom,
          prenom: pb.prenom,
          numDossier: pb.numDossier,
          femmeNom: pb.femmeNom,
          femmePrenom: pb.femmePrenom,
          typeDossier: pb.typeDossier ?? 'couple',
        }
      });
      this.advanceFromStep(2);
      this.finalizeAudit();
      this.scanInput.set('');
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
    void this.stopCamera();
    this.cameraOpenFor.set(0);
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

  private loadPatients(): void {
    this.patients.getAll().subscribe({
      next: (patients) => {
        this.patientOptions.set(
          [...patients].sort((a, b) =>
            a.numDossier.localeCompare(b.numDossier, undefined, { numeric: true, sensitivity: 'base' })
          )
        );
      },
      error: () => {
        this.patientOptions.set([]);
      }
    });
  }

  private loadCodesBarres(): void {
    forkJoin({
      elements: this.elements.getAll().pipe(catchError(() => of([] as ElementBiologique[]))),
      pailles: this.stockage.getPaillesTubes().pipe(catchError(() => of([] as PailleTube[]))),
    }).subscribe(({ elements, pailles }) => {
      this.allElements.set(elements);
      this.allPailles.set(pailles);
    });
  }

  onCodeBarreSelected(code: string): void {
    if (!code) return;
    this.scanInput.set(code);
    this.submitStep2();
  }

  async toggleCamera(step: 1 | 2): Promise<void> {
    this.cameraError.set('');
    if (this.cameraOpenFor() === step) {
      await this.stopCamera();
      this.cameraOpenFor.set(0);
      return;
    }
    if (this.cameraOpenFor() !== 0) {
      await this.stopCamera();
    }
    this.cameraOpenFor.set(step);
    setTimeout(() => void this.startCamera(step), 150);
  }

  private async startCamera(step: 1 | 2): Promise<void> {
    const elementId = step === 1 ? CAMERA_READER_STEP1 : CAMERA_READER_STEP2;
    if (typeof document === 'undefined' || !document.getElementById(elementId)) {
      this.cameraError.set('Zone caméra indisponible. Réessayez.');
      this.cameraOpenFor.set(0);
      return;
    }
    await this.stopCamera();
    this.stepError.set('');
    try {
      this.html5Qr = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
      });
      await this.html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 8,
          qrbox: { width: 280, height: 140 },
        },
        (decodedText) => this.onCameraDecoded(decodedText, step),
        () => {}
      );
    } catch {
      this.html5Qr = null;
      this.cameraOpenFor.set(0);
      this.cameraError.set(
        "Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur ou utilisez la saisie manuelle."
      );
    }
  }

  private onCameraDecoded(text: string, step: 1 | 2): void {
    const t = text.trim();
    if (!t || this.loading()) return;
    const now = Date.now();
    if (t === this.lastDecodeText && now - this.lastDecodeTime < 1800) return;
    this.lastDecodeText = t;
    this.lastDecodeTime = now;
    this.scanInput.set(t);
    if (step === 1) {
      this.selectedDossier.set('');
      this.submitStep1();
    } else {
      this.submitStep2();
    }
  }

  private async stopCamera(): Promise<void> {
    if (!this.html5Qr) return;
    const instance = this.html5Qr;
    this.html5Qr = null;
    try {
      await instance.stop();
    } catch {
      /* déjà arrêté */
    }
    try {
      instance.clear();
    } catch {
      /* ignore */
    }
  }

  ngOnDestroy(): void {
    void this.stopCamera();
  }

  reset(): void {
    void this.stopCamera();
    this.cameraOpenFor.set(0);
    this.cameraError.set('');
    this.steps.set([
      { number: 1, label: 'Scanner le bracelet patient', done: false, active: true },
      { number: 2, label: 'Scanner l\'étiquette du contenant', done: false, active: false },
      { number: 3, label: 'Vérification de la concordance', done: false, active: false }
    ]);
    this.currentStep.set(1);
    this.scanInput.set('');
    this.selectedDossier.set('');
    this.stepError.set('');
    this.patientBracelet.set(null);
    this.lookup.set(null);
    this.lastEtiquetteCode.set('');
  }
}
