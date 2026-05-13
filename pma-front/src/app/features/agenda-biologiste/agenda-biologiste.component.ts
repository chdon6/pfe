import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RendezVousService } from '../../core/services/rendez-vous.service';
import { PatientService } from '../../core/services/patient.service';
import { BiologisteDisponibilitesService } from '../../core/services/biologiste-disponibilites.service';
import type { RendezVous, Patient } from '../../core/models';

const STORAGE_KEY = 'pma_biologiste_disponibilites';

interface DaySlot {
  date: Date;
  key: string;
  label: string;
  dayName: string;
  isToday: boolean;
  rdvs: (RendezVous & { patientName: string })[];
  disponible: boolean;
}

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-agenda-biologiste',
  templateUrl: './agenda-biologiste.component.html',
  styleUrl: './agenda-biologiste.component.scss',
})
export class AgendaBiologisteComponent implements OnInit {
  private readonly rdvService = inject(RendezVousService);
  private readonly patientService = inject(PatientService);
  private readonly dispoService = inject(BiologisteDisponibilitesService);

  allRdv = signal<RendezVous[]>([]);
  patients = signal<Patient[]>([]);
  loading = signal(true);

  weekOffset = signal(0);
  disponibilites = signal<Record<string, boolean>>({});

  weekDays = computed<DaySlot[]>(() => {
    const monday = this.getMonday(this.weekOffset());
    const rdvs = this.allRdv();
    const pts = this.patients();
    const dispos = this.disponibilites();
    const days: DaySlot[] = [];
    const today = this.dayKey(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = this.dayKey(d);
      const dayRdvs = rdvs
        .filter((r) => this.dayKey(new Date(r.dateHeure)) === key)
        .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
        .map((r) => ({ ...r, patientName: this.getPatientName(r.patientId, pts) }));

      days.push({
        date: d,
        key,
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        dayName: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        isToday: key === today,
        rdvs: dayRdvs,
        disponible: dispos[key] !== false,
      });
    }
    return days;
  });

  weekLabel = computed(() => {
    const days = this.weekDays();
    if (days.length === 0) return '';
    const start = days[0].date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
    const end = days[6].date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${start} — ${end}`;
  });

  totalRdvWeek = computed(() => this.weekDays().reduce((sum, d) => sum + d.rdvs.length, 0));
  joursDispoCount = computed(() => this.weekDays().filter((d) => d.disponible).length);
  joursIndispoCount = computed(() => this.weekDays().filter((d) => !d.disponible).length);

  ngOnInit(): void {
    this.dispoService.get().subscribe({
      next: (api) => {
        const merged = this.mergeApiWithLocalFallback(api);
        this.disponibilites.set(merged);
        if (Object.keys(api).length === 0 && Object.keys(merged).length > 0) {
          this.dispoService.put(merged).subscribe({ error: () => {} });
        }
      },
      error: () => this.disponibilites.set(this.loadDispos()),
    });
    this.loading.set(true);
    this.patientService.getAll().subscribe({
      next: (p) => this.patients.set(p),
      error: () => this.patients.set([]),
    });
    this.rdvService.getAll().subscribe({
      next: (data) => {
        this.allRdv.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prevWeek(): void {
    this.weekOffset.update((v) => v - 1);
  }

  nextWeek(): void {
    this.weekOffset.update((v) => v + 1);
  }

  goToday(): void {
    this.weekOffset.set(0);
  }

  toggleDispo(day: DaySlot): void {
    const next = { ...this.disponibilites() };
    next[day.key] = !day.disponible;
    this.disponibilites.set(next);
    this.saveDispos(next);
    this.dispoService.put(next).subscribe({ error: () => {} });
  }

  formatTime(dateHeure: string): string {
    return new Date(dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  statutClass(statut: string): string {
    switch (statut?.toLowerCase()) {
      case 'confirme': return 'badge-confirme';
      case 'annule': return 'badge-annule';
      case 'termine': return 'badge-termine';
      default: return 'badge-planifie';
    }
  }

  private getMonday(offset: number): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /** Date locale yyyy-MM-dd (aligné planification secrétaire / datetime-local). */
  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mergeApiWithLocalFallback(api: Record<string, boolean>): Record<string, boolean> {
    if (api && Object.keys(api).length > 0) return { ...api };
    const local = this.loadDispos();
    return Object.keys(local).length > 0 ? { ...local } : {};
  }

  private getPatientName(id: number, pts: Patient[]): string {
    const p = pts.find((x) => x.id === id);
    return p ? `${p.prenom} ${p.nom}` : `Patient #${id}`;
  }

  private loadDispos(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveDispos(dispos: Record<string, boolean>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dispos));
  }
}
