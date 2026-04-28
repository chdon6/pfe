import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { CyclePmaService } from '../../../core/services/cycle-pma.service';
import { ConsentementService } from '../../../core/services/consentement.service';
import { ActePmaService } from '../../../core/services/acte-pma.service';
import { EntityHistoryService } from '../../../core/services/entity-history.service';
import { RoleService } from '../../../core/services/role.service';
import { Patient, RendezVous, CyclePma, Consentement, ActePma } from '../../../core/models';
import {
  STATUT_REALISATION_OPTIONS,
  libelleStatutRealisation,
  libelleTypeActe,
  resumeParcoursPatientDossier
} from '../../../core/constants/acte-pma-types';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.scss'
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private patientService = inject(PatientService);
  private rdvService = inject(RendezVousService);
  private cycleService = inject(CyclePmaService);
  private consentementService = inject(ConsentementService);
  private acteService = inject(ActePmaService);
  private entityHistory = inject(EntityHistoryService);
  role = inject(RoleService);

  private readonly patientSig = signal<Patient | undefined>(undefined);

  /** Compatible avec le template existant (`patient` dans le HTML). */
  get patient(): Patient | undefined {
    return this.patientSig();
  }

  readonly patientModificationHistory = computed(() => {
    const p = this.patientSig();
    if (!p) return [];
    this.entityHistory.entries();
    return this.entityHistory.getForPatient(p.id);
  });

  rendezVous: RendezVous[] = [];
  cycles: CyclePma[] = [];
  consentements: Consentement[] = [];
  actes: ActePma[] = [];
  activeTab = 'documents';

  readonly statutOptions = STATUT_REALISATION_OPTIONS;
  readonly libelleType = libelleTypeActe;
  readonly libelleStatut = libelleStatutRealisation;
  readonly libelleActeDossier = libelleTypeActe;
  readonly resumeParcours = resumeParcoursPatientDossier;

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loadPatient(id);
  }

  private loadPatient(id: number): void {
    this.patientService.getById(id).subscribe((p) => this.patientSig.set(p));

    this.consentementService.getAll().subscribe((all) => {
      this.consentements = all.filter((c) => c.patientId === id);
    });

    this.rdvService.getAll().subscribe((all) => {
      this.rendezVous = all.filter((r) => r.patientId === id);
    });

    this.cycleService.getAll().subscribe((all) => {
      this.cycles = all.filter((c) => c.patientId === id);
    });

    this.acteService.getByPatient(id).subscribe({
      next: (list) => (this.actes = list),
      error: () => (this.actes = [])
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  get canPrescrireActe(): boolean {
    return this.role.hasAccess(['Secretaire']);
  }

  get canMettreAJourStatutActe(): boolean {
    return this.role.hasAccess(['Biologiste']);
  }

  onStatutActeChange(acte: ActePma, event: Event): void {
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
}
