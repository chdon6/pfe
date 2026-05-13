import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { PatientService } from '../../../core/services/patient.service';
import { BiologisteDisponibilitesService } from '../../../core/services/biologiste-disponibilites.service';
import { AiAssistantService } from '../../../core/services/ai-assistant.service';
import { RendezVous, Patient } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-rdv-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rdv-list.component.html',
  styleUrl: './rdv-list.component.scss'
})
export class RdvListComponent implements OnInit {
  private rdvService = inject(RendezVousService);
  private patientService = inject(PatientService);
  private biologisteDispos = inject(BiologisteDisponibilitesService);
  private aiAssistant = inject(AiAssistantService);

  rendezVous: RendezVous[] = [];
  patients: Patient[] = [];
  /** Clés yyyy-MM-dd ; false = biologiste indisponible. */
  biologisteDisponibilites: Record<string, boolean> = {};
  disposBiologisteLoading = false;
  disposBiologisteError = false;
  loading = true;

  showForm = false;
  isEditMode = false;
  editRdv: RendezVous = { id: 0, dateHeure: '', motif: '', statut: 'planifie', patientId: 0 };
  aiMotifLoading = false;
  aiMotifError = '';
  aiMotifSuggestions: string[] = [];

  /** Affiché en aide si le GET disponibilités échoue (URL API attendue). */
  readonly apiBaseHint = environment.apiUrl;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.loadDisponibilitesBiologiste();
    this.patientService.getAll().subscribe(p => (this.patients = p));
    this.rdvService.getAll().subscribe({
      next: (data) => {
        this.rendezVous = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  /** Chargement seul du calendrier biologiste (GET /api/biologiste-disponibilites). */
  loadDisponibilitesBiologiste(): void {
    this.disposBiologisteLoading = true;
    this.disposBiologisteError = false;
    this.biologisteDispos.get().subscribe({
      next: (m) => {
        this.biologisteDisponibilites = m ?? {};
        this.disposBiologisteLoading = false;
      },
      error: () => {
        this.biologisteDisponibilites = {};
        this.disposBiologisteLoading = false;
        this.disposBiologisteError = true;
      },
    });
  }

  reloadDisponibilitesBiologiste(): void {
    this.loadDisponibilitesBiologiste();
  }

  /** Jours marqués indisponibles par le biologiste (tri chronologique). */
  get joursIndisponiblesBiologiste(): string[] {
    return Object.entries(this.biologisteDisponibilites)
      .filter(([, dispo]) => dispo === false)
      .map(([k]) => k)
      .sort();
  }

  labelJourIndispo(isoDateKey: string): string {
    const d = new Date(`${isoDateKey}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** True si la date/heure du formulaire tombe un jour indisponible. */
  get rdvFormeSurJourIndispoBiologiste(): boolean {
    const dh = this.editRdv.dateHeure;
    if (!dh || !dh.trim()) return false;
    const k = this.dayKey(dh);
    return this.biologisteDisponibilites[k] === false;
  }

  /** Rendez-vous triés par date, regroupés par jour (affichage type agenda). */
  get groupedRdv(): { key: string; label: string; items: RendezVous[] }[] {
    const sorted = [...this.rendezVous].sort(
      (a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime()
    );
    const map = new Map<string, RendezVous[]>();
    for (const r of sorted) {
      const key = this.dayKey(r.dateHeure);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: this.formatDayLabel(items[0].dateHeure),
      items
    }));
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDayLabel(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /** Suffixe pour .rz-status-badge--* (ex. planifie, confirme). */
  statutClass(statut: string): string {
    return statut
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  getPatientName(patientId: number): string {
    const p = this.patients.find(x => x.id === patientId);
    return p ? `${p.prenom} ${p.nom}` : '-';
  }

  openNew(): void {
    this.isEditMode = false;
    this.editRdv = { id: 0, dateHeure: '', motif: '', statut: 'planifie', patientId: 0 };
    this.resetAiMotifState();
    this.showForm = true;
  }

  openEdit(rdv: RendezVous): void {
    this.isEditMode = true;
    this.editRdv = { ...rdv };
    this.resetAiMotifState();
    this.showForm = true;
  }

  private resetAiMotifState(): void {
    this.aiMotifLoading = false;
    this.aiMotifError = '';
    this.aiMotifSuggestions = [];
  }

  suggestMotif(): void {
    this.aiMotifError = '';
    if (!this.editRdv.patientId) {
      this.aiMotifError = 'Selectionnez un patient avant de lancer la suggestion IA.';
      return;
    }

    this.aiMotifLoading = true;
    const patient = this.patients.find((p) => p.id === this.editRdv.patientId);
    this.aiAssistant
      .suggestRdvMotif({
        patientId: this.editRdv.patientId,
        patientDisplayName: patient ? `${patient.prenom} ${patient.nom}` : undefined,
        dateHeure: this.editRdv.dateHeure || undefined,
        currentMotif: this.editRdv.motif || undefined
      })
      .subscribe({
        next: ({ suggestions }) => {
          this.aiMotifSuggestions = suggestions ?? [];
          if (!this.editRdv.motif && this.aiMotifSuggestions.length > 0) {
            this.editRdv.motif = this.aiMotifSuggestions[0];
          }
          this.aiMotifLoading = false;
        },
        error: () => {
          this.aiMotifLoading = false;
          this.aiMotifError = "Impossible de recuperer une suggestion pour l'instant.";
        }
      });
  }

  reformulateMotif(): void {
    this.aiMotifError = '';
    if (!this.editRdv.motif.trim()) {
      this.aiMotifError = 'Saisissez un motif avant la reformulation.';
      return;
    }

    this.aiMotifLoading = true;
    this.aiAssistant.reformulateNote(this.editRdv.motif).subscribe({
      next: ({ reformulatedNote }) => {
        this.editRdv.motif = reformulatedNote;
        this.aiMotifLoading = false;
      },
      error: () => {
        this.aiMotifLoading = false;
        this.aiMotifError = "La reformulation IA a echoue.";
      }
    });
  }

  applyMotifSuggestion(value: string): void {
    this.editRdv.motif = value;
  }

  saveRdv(): void {
    if (this.isEditMode) {
      this.rdvService.update(this.editRdv).subscribe(() => {
        this.showForm = false;
        this.isEditMode = false;
        this.loadData();
      });
      return;
    }

    this.rdvService.create(this.editRdv).subscribe(() => {
      this.showForm = false;
      this.isEditMode = false;
      this.loadData();
    });
  }

  deleteRdv(id: number): void {
    if (confirm('Supprimer ce rendez-vous ?')) {
      this.rdvService.delete(id).subscribe(() => this.loadData());
    }
  }
}
