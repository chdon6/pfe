import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { EntityHistoryService } from '../../../core/services/entity-history.service';
import { Patient } from '../../../core/models';
import {
  actePmaOptionsForDossier,
  consentementTypeFromActePma,
  resumeParcoursPatientDossier,
  type TypeDossierActe,
} from '../../../core/constants/acte-pma-types';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.scss'
})
export class PatientFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private patientService = inject(PatientService);
  private auth = inject(AuthService);
  private entityHistory = inject(EntityHistoryService);

  isEdit = false;
  patientId?: number;
  loading = false;
  error = '';
  numDossierLoading = false;
  numDossierError = '';

  /** Affiché après création réussie (planification RDV). */
  createSuccess = false;
  createdPatientId: number | null = null;

  get actePmaOptions() {
    return actePmaOptionsForDossier(this.form.typeDossier);
  }

  get parcoursActeHint(): string {
    return resumeParcoursPatientDossier(this.form.typeActePma);
  }

  /** Consentement dérivé automatiquement de l’acte PMA sélectionné. */
  get consentementAutoLibelle(): string {
    return consentementTypeFromActePma(this.form.typeActePma);
  }

  form = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    femmeNom: '',
    femmePrenom: '',
    femmeDateNaissance: '',
    numDossier: '',
    adresse: '',
    telephone: '',
    typeDossier: 'couple' as TypeDossierActe,
    typeActePma: '',
    consentementType: '',
    consentementDate: ''
  };

  photoFile: File | null = null;
  photoPreview: string | null = null;
  existingPhoto: string | null = null;
  consentPhotoFile: File | null = null;
  consentPreview: string | null = null;
  consentIsPdf = false;

  photoCameraOpen = false;
  photoCameraError = '';
  private photoStream: MediaStream | null = null;

  consentCameraOpen = false;
  consentCameraError = '';
  private consentStream: MediaStream | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit = true;
      this.patientId = +id;
      this.patientService.getById(this.patientId).subscribe({
        next: (p) => this.patchFromPatient(p),
        error: () => {
          this.error = 'Patient introuvable.';
        }
      });
    } else {
      this.loadProchainNumeroDossier();
    }
  }

  /** Charge le prochain N° dossier libre depuis l’API (basé sur tous les patients). */
  loadProchainNumeroDossier(): void {
    this.numDossierError = '';
    this.numDossierLoading = true;
    this.patientService.getProchainNumeroDossier().subscribe({
      next: (r) => {
        this.form.numDossier = r.numDossier;
        this.numDossierLoading = false;
      },
      error: () => {
        this.numDossierError =
          'Impossible de charger les patients pour générer le numéro. Vérifiez que l’API est démarrée.';
        this.numDossierLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    void this.stopPhotoCamera();
    void this.stopConsentCamera();
  }

  private patchFromPatient(p: Patient): void {
    this.form.nom = p.nom;
    this.form.prenom = p.prenom;
    this.form.dateNaissance = p.dateNaissance?.split('T')[0] || '';
    this.form.numDossier = p.numDossier;
    this.form.adresse = p.adresse || '';
    this.form.telephone = p.telephone || '';
    const td = (p.typeDossier || 'couple').toLowerCase();
    this.form.typeDossier =
      td === 'spermogramme' ? 'spermogramme' : td === 'femme_seul' ? 'femme_seul' : 'couple';
    this.form.femmeNom = p.femmeNom || '';
    this.form.femmePrenom = p.femmePrenom || '';
    this.form.femmeDateNaissance = p.femmeDateNaissance?.split('T')[0] || '';
    this.form.typeActePma = p.typeActePma || '';
    if (p.imagePath) {
      this.existingPhoto = p.imagePath;
    }
  }

  onTypeDossierChange(): void {
    const allowed = new Set(this.actePmaOptions.map((o) => o.code));
    if (this.form.typeActePma && !allowed.has(this.form.typeActePma)) {
      this.form.typeActePma = '';
      this.form.consentementType = '';
    }
    if (!this.isDossierCouple) {
      this.form.femmeNom = '';
      this.form.femmePrenom = '';
      this.form.femmeDateNaissance = '';
    }
    this.syncConsentementFromActe();
  }

  onTypeActePmaChange(): void {
    this.syncConsentementFromActe();
  }

  private syncConsentementFromActe(): void {
    if (this.isEdit) return;
    const libelle = consentementTypeFromActePma(this.form.typeActePma);
    this.form.consentementType = libelle;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.setPhotoFile(input.files[0]);
    }
  }

  private setPhotoFile(file: File): void {
    void this.stopPhotoCamera();
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = null;
  }

  async togglePhotoCamera(): Promise<void> {
    this.photoCameraError = '';
    if (this.photoCameraOpen) {
      await this.stopPhotoCamera();
      return;
    }
    await this.stopConsentCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      this.photoCameraError =
        'Caméra non disponible sur ce navigateur. Utilisez le téléchargement de fichier.';
      return;
    }
    try {
      this.photoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.photoCameraOpen = true;
      setTimeout(() => this.attachPhotoStream(), 80);
    } catch {
      this.photoCameraError =
        'Impossible d’accéder à la caméra. Autorisez l’accès ou choisissez un fichier image.';
      await this.stopPhotoCamera();
    }
  }

  private attachPhotoStream(): void {
    const video = document.getElementById('patient-photo-camera') as HTMLVideoElement | null;
    if (!video || !this.photoStream) return;
    video.srcObject = this.photoStream;
    void video.play();
  }

  capturePhotoFromCamera(): void {
    const video = document.getElementById('patient-photo-camera') as HTMLVideoElement | null;
    if (!video?.videoWidth) {
      this.photoCameraError = 'Caméra non prête. Réessayez.';
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.photoCameraError = 'Échec de la capture. Réessayez.';
          return;
        }
        const file = new File([blob], `photo-patient-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.setPhotoFile(file);
        void this.stopPhotoCamera();
      },
      'image/jpeg',
      0.92
    );
  }

  private async stopPhotoCamera(): Promise<void> {
    this.photoCameraOpen = false;
    if (this.photoStream) {
      this.photoStream.getTracks().forEach((t) => t.stop());
      this.photoStream = null;
    }
    const video = document.getElementById('patient-photo-camera') as HTMLVideoElement | null;
    if (video) {
      video.srcObject = null;
    }
  }

  onConsentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setConsentFile(file);
    }
  }

  private setConsentFile(file: File): void {
    void this.stopConsentCamera();
    this.consentPhotoFile = file;
    this.consentIsPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (this.consentIsPdf) {
      this.consentPreview = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.consentPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeConsentScan(): void {
    this.consentPhotoFile = null;
    this.consentPreview = null;
    this.consentIsPdf = false;
  }

  async toggleConsentCamera(): Promise<void> {
    this.consentCameraError = '';
    if (this.consentCameraOpen) {
      await this.stopConsentCamera();
      return;
    }
    await this.stopPhotoCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      this.consentCameraError =
        'Caméra non disponible. Utilisez le téléchargement de fichier ou un autre navigateur.';
      return;
    }
    try {
      this.consentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.consentCameraOpen = true;
      setTimeout(() => this.attachConsentStream(), 80);
    } catch {
      this.consentCameraError =
        'Impossible d’accéder à la caméra. Autorisez l’accès ou importez un fichier.';
      await this.stopConsentCamera();
    }
  }

  private attachConsentStream(): void {
    const video = document.getElementById('consent-scan-camera') as HTMLVideoElement | null;
    if (!video || !this.consentStream) return;
    video.srcObject = this.consentStream;
    void video.play();
  }

  captureConsentFromCamera(): void {
    const video = document.getElementById('consent-scan-camera') as HTMLVideoElement | null;
    if (!video?.videoWidth) {
      this.consentCameraError = 'Caméra non prête. Réessayez.';
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.consentCameraError = 'Échec du scan. Réessayez.';
          return;
        }
        const file = new File([blob], `consentement-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.setConsentFile(file);
        void this.stopConsentCamera();
      },
      'image/jpeg',
      0.92
    );
  }

  private async stopConsentCamera(): Promise<void> {
    this.consentCameraOpen = false;
    if (this.consentStream) {
      this.consentStream.getTracks().forEach((t) => t.stop());
      this.consentStream = null;
    }
    const video = document.getElementById('consent-scan-camera') as HTMLVideoElement | null;
    if (video) {
      video.srcObject = null;
    }
  }

  get hasConsentScan(): boolean {
    return !!this.consentPhotoFile;
  }

  get hasPhoto(): boolean {
    return !!this.photoFile || !!this.existingPhoto;
  }

  get isDossierCouple(): boolean {
    return this.form.typeDossier === 'couple';
  }

  get isDossierFemmeSeul(): boolean {
    return this.form.typeDossier === 'femme_seul';
  }

  get photoSectionTitle(): string {
    if (this.isDossierCouple) return 'Photo du couple';
    if (this.isDossierFemmeSeul) return 'Photo de la patiente';
    return 'Photo du patient';
  }

  onSubmit(): void {
    this.error = '';
    if (!this.form.nom?.trim() || !this.form.prenom?.trim() || !this.form.dateNaissance) {
      this.error = this.isDossierCouple
        ? 'Renseignez le nom, le prénom et la date de naissance (côté homme).'
        : this.isDossierFemmeSeul
          ? 'Renseignez le nom, le prénom et la date de naissance de la patiente.'
          : 'Renseignez le nom, le prénom et la date de naissance du patient.';
      return;
    }
    if (!this.isEdit && (!this.form.numDossier?.trim() || this.numDossierLoading)) {
      this.error = this.numDossierLoading
        ? 'Calcul du numéro de dossier en cours…'
        : this.numDossierError || 'Le numéro de dossier n’a pas pu être généré.';
      return;
    }
    if (this.isEdit && !this.form.numDossier?.trim()) {
      this.error = 'Le numéro de dossier est obligatoire.';
      return;
    }
    if (!this.isEdit && !this.photoFile) {
      this.error = `La ${this.photoSectionTitle.toLowerCase()} est obligatoire (photo ou capture caméra).`;
      return;
    }
    if (!this.form.typeActePma) {
      this.error = "Sélectionnez l'acte PMA prévu pour ce patient dans la liste.";
      return;
    }
    if (!this.isEdit) {
      this.syncConsentementFromActe();
      if (!this.form.consentementType) {
        this.error = 'Le consentement est obligatoire (sélectionnez d’abord l’acte PMA).';
        return;
      }
      if (!this.form.consentementDate) {
        this.error = 'La date de signature du consentement est obligatoire.';
        return;
      }
      if (!this.consentPhotoFile) {
        this.error = 'La photo ou le scan du consentement signé est obligatoire.';
        return;
      }
    }
    if (this.isDossierCouple) {
      if (!this.form.femmeNom?.trim() || !this.form.femmePrenom?.trim() || !this.form.femmeDateNaissance) {
        this.error =
          'Dossier couple : complétez la section « La femme » (nom, prénom et date de naissance).';
        return;
      }
    } else {
      this.form.femmeNom = '';
      this.form.femmePrenom = '';
      this.form.femmeDateNaissance = '';
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('nom', this.form.nom);
    formData.append('prenom', this.form.prenom);
    formData.append('dateNaissance', this.form.dateNaissance);
    formData.append('numDossier', this.form.numDossier);
    if (this.form.adresse) formData.append('adresse', this.form.adresse);
    if (this.form.telephone?.trim()) formData.append('telephone', this.form.telephone.trim());
    formData.append('typeDossier', this.form.typeDossier);
    formData.append('typeActePma', this.form.typeActePma);
    if (this.isDossierCouple) {
      formData.append('femmeNom', this.form.femmeNom.trim());
      formData.append('femmePrenom', this.form.femmePrenom.trim());
      formData.append('femmeDateNaissance', this.form.femmeDateNaissance);
    }
    if (this.photoFile) {
      formData.append('photoCouple', this.photoFile, this.photoFile.name);
    }
    if (!this.isEdit) {
      formData.append('consentementType', this.form.consentementType);
      formData.append('consentementDate', this.form.consentementDate);
      if (this.consentPhotoFile) {
        formData.append('photoConsentement', this.consentPhotoFile, this.consentPhotoFile.name);
      }
    }

    const actor = this.auth.user()?.identifiant;
    if (this.isEdit) {
      this.patientService.update(this.patientId!, formData).subscribe({
        next: () => {
          this.entityHistory.logPatient(
            this.patientId!,
            'Mise à jour du dossier patient',
            `Dossier ${this.form.numDossier.trim()}`,
            actor
          );
          this.router.navigate(['/patients']);
        },
        error: (err) => {
          this.error = this.formatHttpError(err, 'Erreur lors de la mise à jour.');
          this.loading = false;
        }
      });
    } else {
      this.patientService.getProchainNumeroDossier().subscribe({
        next: (r) => {
          this.form.numDossier = r.numDossier;
          formData.set('numDossier', r.numDossier);
          this.submitCreate(formData, actor);
        },
        error: () => {
          this.error =
            'Impossible de confirmer le numéro de dossier avant enregistrement. Réessayez.';
          this.loading = false;
        }
      });
    }
  }

  get createdPatientLabel(): string {
    return `${this.form.prenom} ${this.form.nom}`.trim();
  }

  planifierRendezVous(): void {
    if (!this.createdPatientId) return;
    void this.router.navigate(['/rendez-vous/nouveau'], {
      queryParams: { patientId: this.createdPatientId },
    });
  }

  retourListePatients(): void {
    void this.router.navigate(['/patients']);
  }

  private submitCreate(formData: FormData, actor: string | undefined): void {
      this.patientService.create(formData).subscribe({
        next: (id) => {
          const newId = typeof id === 'number' ? id : Number(id) || 0;
          if (newId > 0) {
            this.entityHistory.logPatient(
              newId,
              'Création du dossier patient',
              `Dossier ${this.form.numDossier.trim()}`,
              actor
            );
            this.createdPatientId = newId;
            this.createSuccess = true;
            this.loading = false;
            return;
          }
          void this.router.navigate(['/patients']);
        },
        error: (err) => {
          this.error = this.formatHttpError(
            err,
            'Erreur lors de la création. Vérifiez les champs, les pièces jointes et que le n° de dossier n’existe pas déjà.'
          );
          this.loading = false;
        }
      });
  }

  private formatHttpError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body.length > 220 ? body.slice(0, 220) + '…' : body;
      }
      if (body && typeof body === 'object') {
        const o = body as Record<string, unknown>;
        const msg = o['message'] ?? o['error'] ?? o['detail'];
        if (typeof msg === 'string' && msg.trim()) return msg;
        if (Array.isArray(o['errors'])) {
          return (o['errors'] as unknown[]).map(String).join(' — ');
        }
      }
      if (err.status === 0) {
        return 'Serveur injoignable : vérifiez que l’API backend est démarrée.';
      }
      if (err.status === 409 || err.status === 400) {
        return `${fallback} (code ${err.status}). Souvent : numéro de dossier déjà utilisé.`;
      }
    }
    return fallback;
  }
}
