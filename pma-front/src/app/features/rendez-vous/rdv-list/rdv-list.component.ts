import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { PatientService } from '../../../core/services/patient.service';
import { RendezVous, Patient } from '../../../core/models';

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

  rendezVous: RendezVous[] = [];
  patients: Patient[] = [];
  loading = true;

  showForm = false;
  editRdv: RendezVous = { id: 0, dateHeure: '', motif: '', statut: 'planifie', patientId: 0 };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.patientService.getAll().subscribe(p => (this.patients = p));
    this.rdvService.getAll().subscribe({
      next: (data) => {
        this.rendezVous = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
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
    this.editRdv = { id: 0, dateHeure: '', motif: '', statut: 'planifie', patientId: 0 };
    this.showForm = true;
  }

  saveRdv(): void {
    this.rdvService.create(this.editRdv).subscribe(() => {
      this.showForm = false;
      this.loadData();
    });
  }

  deleteRdv(id: number): void {
    if (confirm('Supprimer ce rendez-vous ?')) {
      this.rdvService.delete(id).subscribe(() => this.loadData());
    }
  }
}
