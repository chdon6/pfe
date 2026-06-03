import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { PatientService } from '../../../core/services/patient.service';
import { DisponibiliteAgendaService } from '../../../core/services/disponibilite-agenda.service';
import { RendezVous, Patient, DisponibiliteAgenda } from '../../../core/models';

@Component({
  selector: 'app-rdv-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rdv-form.component.html',
  styleUrl: './rdv-form.component.scss',
})
export class RdvFormComponent implements OnInit {
  private rdvService = inject(RendezVousService);
  private patientService = inject(PatientService);
  private disponibiliteService = inject(DisponibiliteAgendaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  patients: Patient[] = [];
  nonDisponibleDates: DisponibiliteAgenda[] = [];
  loading = true;
  saving = false;
  isEdit = false;
  dateBlocked = false;

  rdv: RendezVous = {
    id: 0,
    dateHeure: '',
    motif: '',
    statut: 'planifie',
    patientId: 0,
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const patientId = Number(this.route.snapshot.queryParamMap.get('patientId') || 0);
    const dateParam = this.route.snapshot.queryParamMap.get('date');

    if (idParam) {
      this.isEdit = true;
      const id = Number(idParam);
      forkJoin({
        patients: this.patientService.getAll(),
        rdv: this.rdvService.getById(id),
        dispos: this.loadDisponibilitesAround(new Date()),
      }).subscribe({
        next: ({ patients, rdv, dispos }) => {
          this.patients = this.sortPatientsRecentFirst(patients);
          this.nonDisponibleDates = dispos;
          this.rdv = {
            ...rdv,
            patientId: Number(rdv.patientId),
            dateHeure: this.toDateTimeLocal(rdv.dateHeure),
          };
          this.refreshDateBlocked();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          alert('Rendez-vous introuvable.');
          void this.router.navigate(['/rendez-vous']);
        },
      });
      return;
    }

    const dateKey = dateParam || this.toInputDate(new Date());
    forkJoin({
      patients: this.patientService.getAll(),
      dispos: this.loadDisponibilitesAround(new Date(dateKey + 'T12:00:00')),
    }).subscribe({
      next: ({ patients, dispos }) => {
        this.patients = this.sortPatientsRecentFirst(patients);
        this.nonDisponibleDates = dispos;

        if (this.isDateNonDisponible(dateKey)) {
          alert('Ce jour est marqué non disponible. Impossible de planifier un rendez-vous.');
          void this.router.navigate(['/rendez-vous'], { queryParams: { date: dateKey } });
          return;
        }

        const defaultPatientId = this.resolveDefaultPatientId(patientId);
        this.rdv = {
          id: 0,
          dateHeure: `${dateKey}T09:00`,
          motif: defaultPatientId ? this.defaultMotifForPatient(defaultPatientId, patients) : '',
          statut: 'planifie',
          patientId: defaultPatientId,
        };
        this.refreshDateBlocked();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get pageTitle(): string {
    return this.isEdit ? 'Modifier le rendez-vous' : 'Planifier un rendez-vous';
  }

  onPatientChange(patientId: number): void {
    if (!this.isEdit && patientId > 0) {
      this.rdv.motif = this.defaultMotifForPatient(patientId, this.patients);
    }
  }

  onDateTimeChange(value?: string): void {
    const dateTime = value ?? this.rdv.dateHeure;
    const dateKey = this.extractDateKey(dateTime);
    if (!dateKey) {
      this.dateBlocked = false;
      return;
    }
    const ref = new Date(dateKey + 'T12:00:00');
    this.loadDisponibilitesAround(ref).subscribe((dispos) => {
      this.nonDisponibleDates = dispos;
      this.refreshDateBlocked();
    });
  }

  save(): void {
    if (this.dateBlocked) {
      alert('Ce jour est marqué non disponible. Choisissez une autre date.');
      return;
    }
    if (!this.rdv.patientId || !this.rdv.dateHeure?.trim()) {
      alert('Veuillez sélectionner un patient et une date/heure.');
      return;
    }

    const payload: RendezVous = {
      id: this.rdv.id,
      patientId: Number(this.rdv.patientId),
      motif: (this.rdv.motif || '').trim() || 'Consultation PMA',
      statut: this.rdv.statut || 'planifie',
      dateHeure: this.toApiDateTime(this.rdv.dateHeure),
    };

    if (this.isDateNonDisponible(payload.dateHeure.slice(0, 10))) {
      alert('Ce jour est marqué non disponible. Choisissez une autre date.');
      return;
    }

    this.saving = true;
    const onSuccess = (): void => {
      this.saving = false;
      void this.router.navigate(['/rendez-vous'], {
        queryParams: { date: payload.dateHeure.slice(0, 10) },
      });
    };
    const onError = (err?: { error?: string | { title?: string } }) => {
      this.saving = false;
      const msg =
        typeof err?.error === 'string'
          ? err.error
          : 'Impossible d\'enregistrer le rendez-vous.';
      alert(msg);
    };

    if (payload.id > 0) {
      this.rdvService.update(payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.rdvService.create(payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  private refreshDateBlocked(): void {
    const dateKey = this.extractDateKey(this.rdv.dateHeure);
    this.dateBlocked = dateKey ? this.isDateNonDisponible(dateKey) : false;
  }

  private isDateNonDisponible(dateKey: string): boolean {
    return this.nonDisponibleDates.some((x) => x.date === dateKey && x.nonDisponible);
  }

  private loadDisponibilitesAround(ref: Date) {
    const from = this.toInputDate(new Date(ref.getFullYear(), ref.getMonth(), 1));
    const to = this.toInputDate(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
    return this.disponibiliteService.getAll(from, to);
  }

  private extractDateKey(dateTimeLocal: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateTimeLocal)) {
      return dateTimeLocal.slice(0, 10);
    }
    return '';
  }

  private defaultMotifForPatient(patientId: number, patients: Patient[]): string {
    const p = patients.find((x) => x.id === patientId);
    if (!p?.typeActePma) return 'Consultation PMA';
    return `Consultation ${p.typeActePma.toUpperCase()}`;
  }

  private resolveDefaultPatientId(fromQuery: number): number {
    if (fromQuery > 0 && this.patients.some((p) => p.id === fromQuery)) {
      return fromQuery;
    }
    if (this.patients.length === 0) return 0;
    return this.patients[0].id;
  }

  private sortPatientsRecentFirst(patients: Patient[]): Patient[] {
    return [...patients].sort((a, b) => b.id - a.id);
  }

  private toDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  private toApiDateTime(localValue: string): string {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)) {
      return `${localValue}:00`;
    }
    return this.toDateTimeLocal(localValue) + ':00';
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
