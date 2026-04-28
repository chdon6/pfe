import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { EntityHistoryService } from '../../../core/services/entity-history.service';
import { Patient } from '../../../core/models';
import { actePmaOptionsForDossier, resumeParcoursPatientDossier } from '../../../core/constants/acte-pma-types';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.scss'
})
export class PatientFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private patientService = inject(PatientService);
  private auth = inject(AuthService);
  private entityHistory = inject(EntityHistoryService);

  isEdit = false;
  patientId?: number;
  loading = false;
  error = '';

  get actePmaOptions() {
    return actePmaOptionsForDossier(this.form.typeDossier);
  }

  /** Explication du parcours selon l’acte (FIV + cycle vs conservation sperme seule, etc.). */
  get parcoursActeHint(): string {
    return resumeParcoursPatientDossier(this.form.typeActePma);
  }

  onTypeDossierChange(): void {
    const allowed = new Set(this.actePmaOptions.map((o) => o.code));
    if (this.form.typeActePma && !allowed.has(this.form.typeActePma)) {
      this.form.typeActePma = '';
    }
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
    /** couple | spermogramme */
    typeDossier: 'couple' as 'couple' | 'spermogramme',
    /** code acte PMA (obligatoire à la création) */
    typeActePma: '',
    consentementType: '',
    consentementDate: ''
  };

  photoFile: File | null = null;
  photoPreview: string | null = null;
  existingPhoto: string | null = null;

  /** Pièces jointes du consentement (création uniquement) */
  consentPhotoFile: File | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit = true;
      this.patientId = +id;
      this.patientService.getById(this.patientId).subscribe({
        next: (p) => {
          this.form.nom = p.nom;
          this.form.prenom = p.prenom;
          this.form.dateNaissance = p.dateNaissance?.split('T')[0] || '';
          this.form.numDossier = p.numDossier;
          this.form.adresse = p.adresse || '';
          this.form.telephone = p.telephone || '';
          this.form.typeDossier =
            p.typeDossier === 'spermogramme' ? 'spermogramme' : 'couple';
          this.form.femmeNom = p.femmeNom || '';
          this.form.femmePrenom = p.femmePrenom || '';
          this.form.femmeDateNaissance = p.femmeDateNaissance?.split('T')[0] || '';
          this.form.typeActePma = p.typeActePma || '';
          if (p.imagePath) {
            this.existingPhoto = p.imagePath;
          }
        },
        error: () => {
          this.error = 'Patient introuvable.';
        }
      });
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(this.photoFile);
    }
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = null;
  }

  onConsentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.consentPhotoFile = input.files?.[0] ?? null;
  }

  get hasPhoto(): boolean {
    return !!this.photoFile || !!this.existingPhoto;
  }

  get isDossierCouple(): boolean {
    return this.form.typeDossier === 'couple';
  }

  onSubmit(): void {
    this.error = '';
    if (!this.form.nom?.trim() || !this.form.prenom?.trim() || !this.form.dateNaissance) {
      this.error = 'Renseignez le nom, le prénom et la date de naissance (côté homme / patient).';
      return;
    }
    if (!this.form.numDossier?.trim()) {
      this.error = 'Le numéro de dossier est obligatoire.';
      return;
    }
    if (!this.isEdit && !this.photoFile) {
      this.error = this.isDossierCouple
        ? 'La photo du couple est obligatoire.'
        : 'La photo du patient est obligatoire.';
      return;
    }
    if (!this.form.typeActePma) {
      this.error = "Sélectionnez l'acte PMA prévu pour ce patient dans la liste.";
      return;
    }
    if (!this.isEdit && !this.form.consentementType) {
      this.error = 'Le consentement est obligatoire.';
      return;
    }
    if (!this.isEdit && !this.form.consentementDate) {
      this.error = 'La date de signature du consentement est obligatoire.';
      return;
    }
    if (!this.isEdit && !this.consentPhotoFile) {
      this.error = 'La photo ou le scan du consentement signé est obligatoire.';
      return;
    }
    if (this.isDossierCouple) {
      if (!this.form.femmeNom?.trim() || !this.form.femmePrenom?.trim() || !this.form.femmeDateNaissance) {
        this.error =
          'Dossier couple : complétez la section « La femme » (nom, prénom et date de naissance) — champs obligatoires.';
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
    if (this.form.adresse) {
      formData.append('adresse', this.form.adresse);
    }
    if (this.form.telephone?.trim()) {
      formData.append('telephone', this.form.telephone.trim());
    }
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
      this.patientService.create(formData).subscribe({
        next: (id) => {
          const newId = typeof id === 'number' ? id : 0;
          if (newId > 0) {
            this.entityHistory.logPatient(
              newId,
              'Création du dossier patient',
              `Dossier ${this.form.numDossier.trim()}`,
              actor
            );
          }
          this.router.navigate(['/patients']);
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
  }

  /** Affiche le message renvoyé par l’API (Spring, etc.) quand il est disponible. */
  private formatHttpError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body.length > 220 ? body.slice(0, 220) + '…' : body;
      }
      if (body && typeof body === 'object') {
        const o = body as Record<string, unknown>;
        const msg = o['message'] ?? o['error'] ?? o['detail'];
        if (typeof msg === 'string' && msg.trim()) {
          return msg;
        }
        if (Array.isArray(o['errors'])) {
          return (o['errors'] as unknown[]).map(String).join(' — ');
        }
      }
      if (err.status === 0) {
        return 'Serveur injoignable : vérifiez que l’API backend est démarrée et l’URL dans environment.';
      }
      if (err.status === 409 || err.status === 400) {
        return `${fallback} (code ${err.status}). Souvent : numéro de dossier déjà utilisé ou donnée refusée par le serveur.`;
      }
    }
    return fallback;
  }
}
