import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ActePmaService } from '../../../core/services/acte-pma.service';
import { PatientService } from '../../../core/services/patient.service';
import { RoleService } from '../../../core/services/role.service';
import { ActePma, Patient } from '../../../core/models';
import {
  ACTE_TYPE_OPTIONS,
  STATUT_REALISATION_OPTIONS,
  libelleStatutRealisation,
  libelleTypeActe
} from '../../../core/constants/acte-pma-types';

@Component({
  selector: 'app-acte-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acte-list.component.html',
  styleUrl: './acte-list.component.scss'
})
export class ActeListComponent implements OnInit {
  private acteService = inject(ActePmaService);
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  role = inject(RoleService);

  actes: ActePma[] = [];
  patients: Patient[] = [];
  loading = true;

  readonly typeOptions = ACTE_TYPE_OPTIONS;
  readonly statutOptions = STATUT_REALISATION_OPTIONS;
  readonly libelleType = libelleTypeActe;
  readonly libelleStatut = libelleStatutRealisation;

  showForm = false;
  newActe: Omit<ActePma, 'id'> = {
    typeActe: 'fiv',
    libelle: '',
    observation: '',
    statutRealisation: 'a_realiser',
    patientId: 0
  };

  get canPrescrire(): boolean {
    return this.role.hasAccess(['Secretaire']);
  }

  get canSupprimerActe(): boolean {
    return this.role.hasAccess(['Secretaire']);
  }

  /** Suivi de réalisation : réservé à la secrétaire sur cet écran (le biologiste n’y a plus accès). */
  get canMettreAJourStatut(): boolean {
    return this.role.hasAccess(['Secretaire']);
  }

  ngOnInit(): void {
    const pid = this.route.snapshot.queryParamMap.get('patientId');
    if (pid && this.canPrescrire) {
      const id = +pid;
      if (id > 0) {
        this.newActe = { ...this.newActe, patientId: id };
        this.showForm = true;
      }
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.patientService.getAll().subscribe((p) => (this.patients = p));
    this.acteService.getAll().subscribe({
      next: (data) => {
        this.actes = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  getPatientName(patientId: number): string {
    const p = this.patients.find((x) => x.id === patientId);
    if (!p) return '-';
    if (p.typeDossier === 'spermogramme') {
      return `${p.prenom} ${p.nom}`;
    }
    if (p.femmePrenom || p.femmeNom) {
      return `${p.prenom} ${p.nom} & ${p.femmePrenom} ${p.femmeNom}`;
    }
    return `${p.prenom} ${p.nom}`;
  }

  openNew(): void {
    this.newActe = {
      typeActe: 'fiv',
      libelle: '',
      observation: '',
      statutRealisation: 'a_realiser',
      patientId: 0
    };
    this.showForm = true;
  }

  onTypeChange(): void {
    this.newActe.libelle = '';
  }

  save(): void {
    if (this.newActe.patientId <= 0) {
      return;
    }
    const payload: Omit<ActePma, 'id'> = {
      typeActe: this.newActe.typeActe,
      libelle: this.newActe.libelle?.trim() ?? '',
      observation: this.newActe.observation?.trim() || undefined,
      statutRealisation: 'a_realiser',
      patientId: this.newActe.patientId
    };
    this.acteService.create(payload).subscribe(() => {
      this.showForm = false;
      this.loadData();
    });
  }

  onStatutChange(acte: ActePma, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const next = select.value;
    if (next === acte.statutRealisation) return;
    const updated: ActePma = { ...acte, statutRealisation: next };
    this.acteService.update(acte.id, updated).subscribe({
      next: () => {
        acte.statutRealisation = next;
      },
      error: () => {
        select.value = acte.statutRealisation;
      }
    });
  }

  deleteActe(id: number): void {
    if (confirm('Supprimer cet acte PMA ?')) {
      this.acteService.delete(id).subscribe(() => this.loadData());
    }
  }
}
