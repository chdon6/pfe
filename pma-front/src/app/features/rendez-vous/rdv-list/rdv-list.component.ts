import { forkJoin } from 'rxjs';
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RendezVousService } from '../../../core/services/rendez-vous.service';
import { PatientService } from '../../../core/services/patient.service';
import { DisponibiliteAgendaService } from '../../../core/services/disponibilite-agenda.service';
import { RoleService } from '../../../core/services/role.service';
import { RendezVous, Patient, DisponibiliteAgenda } from '../../../core/models';

interface CalendarCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  rdvs: RendezVous[];
  summary: { label: string; css: string };
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

@Component({
  selector: 'app-rdv-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rdv-list.component.html',
  styleUrl: './rdv-list.component.scss',
})
export class RdvListComponent implements OnInit {
  private rdvService = inject(RendezVousService);
  private patientService = inject(PatientService);
  private disponibiliteService = inject(DisponibiliteAgendaService);
  private roleService = inject(RoleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly weekdays = WEEKDAYS;
  readonly isBiologiste = computed(() => this.roleService.role() === 'Biologiste');
  readonly isSecretaire = computed(() => this.roleService.role() === 'Secretaire');

  allRdv: RendezVous[] = [];
  disponibilites: DisponibiliteAgenda[] = [];
  patients: Patient[] = [];
  loading = true;
  savingAvailability = false;

  calendarMonth = signal(new Date());
  selectedDate = signal<string | null>(null);
  showDayPanel = signal(false);

  ngOnInit(): void {
    this.loadAgenda();
  }

  loadAgenda(): void {
    this.loading = true;
    forkJoin({
      patients: this.patientService.getAll(),
      rdvs: this.rdvService.getAll(),
    }).subscribe({
      next: ({ patients, rdvs }) => {
        this.patients = patients;
        this.allRdv = rdvs;
        this.loadDisponibilitesForMonth(() => this.applyQueryParams());
      },
      error: () => {
        this.loadDisponibilitesForMonth(() => this.applyQueryParams());
      },
    });
  }

  private applyQueryParams(): void {
    const dateParam = this.route.snapshot.queryParamMap.get('date');
    if (dateParam) {
      this.openDay(dateParam);
    }
  }

  private loadDisponibilitesForMonth(done?: () => void): void {
    const month = this.calendarMonth();
    const from = this.toInputDate(new Date(month.getFullYear(), month.getMonth(), 1));
    const to = this.toInputDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    this.disponibiliteService.getAll(from, to).subscribe({
      next: (list) => {
        this.disponibilites = list;
        this.loading = false;
        done?.();
      },
      error: () => {
        this.loading = false;
        done?.();
      },
    });
  }

  get monthLabel(): string {
    return this.calendarMonth().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get selectedDayLabel(): string {
    const key = this.selectedDate();
    if (!key) return '';
    return new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get selectedDayNonDisponible(): boolean {
    const key = this.selectedDate();
    if (!key) return false;
    return this.disponibilites.some((x) => x.date === key && x.nonDisponible);
  }

  get selectedDayRdv(): RendezVous[] {
    const key = this.selectedDate();
    if (!key) return [];
    return this.allRdv
      .filter((r) => this.dayKey(r.dateHeure) === key)
      .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());
  }

  get calendarCells(): CalendarCell[] {
    const month = this.calendarMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const todayKey = this.toInputDate(new Date());
    const selected = this.selectedDate();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, m, -startOffset + i + 1);
      cells.push(this.makeCell(d.getDate(), this.toInputDate(d), false, todayKey, selected));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push(this.makeCell(day, key, true, todayKey, selected));
    }

    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const d = new Date(last.dateKey + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      cells.push(this.makeCell(d.getDate(), this.toInputDate(d), false, todayKey, selected));
    }

    return cells;
  }

  private makeCell(
    day: number,
    dateKey: string,
    inMonth: boolean,
    todayKey: string,
    selected: string | null
  ): CalendarCell {
    const rdvs = this.allRdv.filter((r) => this.dayKey(r.dateHeure) === dateKey);
    return {
      day,
      dateKey,
      inMonth,
      isToday: dateKey === todayKey,
      isSelected: dateKey === selected,
      rdvs,
      summary: this.summarizeDay(dateKey, rdvs.length),
    };
  }

  private summarizeDay(dateKey: string, rdvCount: number): { label: string; css: string } {
    if (this.isDayNonDisponible(dateKey)) {
      return { label: 'Non disponible', css: 'decision-indisponible' };
    }
    if (rdvCount > 0) {
      return { label: `${rdvCount} RDV`, css: 'decision-rdv' };
    }
    return { label: '', css: '' };
  }

  prevMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() - 1);
    this.calendarMonth.set(d);
    this.loadDisponibilitesForMonth();
  }

  nextMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() + 1);
    this.calendarMonth.set(d);
    this.loadDisponibilitesForMonth();
  }

  goToToday(): void {
    const today = new Date();
    this.calendarMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.openDay(this.toInputDate(today));
    this.loadDisponibilitesForMonth();
  }

  selectDay(dateKey: string): void {
    this.openDay(dateKey);
  }

  private openDay(dateKey: string): void {
    this.selectedDate.set(dateKey);
    this.showDayPanel.set(true);
    const d = new Date(dateKey + 'T12:00:00');
    const cur = this.calendarMonth();
    if (d.getMonth() !== cur.getMonth() || d.getFullYear() !== cur.getFullYear()) {
      this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth(), 1));
      this.loadDisponibilitesForMonth();
    }
  }

  closeDayPanel(): void {
    this.showDayPanel.set(false);
  }

  getPatientName(patientId: number): string {
    const p = this.patients.find((x) => x.id === patientId);
    return p ? `${p.prenom} ${p.nom}` : '-';
  }

  planifierRdv(): void {
    const dateKey = this.selectedDate() || this.toInputDate(new Date());
    if (this.isDayNonDisponible(dateKey)) {
      alert('Ce jour est marqué non disponible par le biologiste. Impossible de planifier un rendez-vous.');
      return;
    }
    void this.router.navigate(['/rendez-vous/nouveau'], {
      queryParams: { date: dateKey },
    });
  }

  modifierRdv(id: number): void {
    void this.router.navigate(['/rendez-vous', id, 'edit']);
  }

  deleteRdv(id: number): void {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    this.rdvService.delete(id).subscribe({
      next: () => this.reloadRdvs(),
      error: () => alert('Impossible de supprimer le rendez-vous.'),
    });
  }

  toggleNonDisponible(): void {
    if (!this.isBiologiste()) return;
    const date = this.selectedDate();
    if (!date) return;

    const next = !this.selectedDayNonDisponible;
    this.savingAvailability = true;
    this.disponibiliteService.setNonDisponible(date, next).subscribe({
      next: () => {
        const idx = this.disponibilites.findIndex((x) => x.date === date);
        if (next) {
          const entry: DisponibiliteAgenda = {
            id: idx >= 0 ? this.disponibilites[idx].id : Date.now(),
            date,
            nonDisponible: true,
            modifieLe: new Date().toISOString(),
          };
          if (idx >= 0) this.disponibilites[idx] = entry;
          else this.disponibilites = [...this.disponibilites, entry];
        } else if (idx >= 0) {
          this.disponibilites = this.disponibilites.filter((x) => x.date !== date);
        }
        this.savingAvailability = false;
      },
      error: () => (this.savingAvailability = false),
    });
  }

  private reloadRdvs(): void {
    this.rdvService.getAll().subscribe((data) => (this.allRdv = data));
  }

  private isDayNonDisponible(dateKey: string): boolean {
    return this.disponibilites.some((x) => x.date === dateKey && x.nonDisponible);
  }

  private dayKey(iso: string): string {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) {
      return iso.slice(0, 10);
    }
    return this.toInputDate(new Date(iso));
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
