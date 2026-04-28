import { Injectable, computed, signal, inject } from '@angular/core';
import { PmaCyclePhaseService, PMA_PHASE_STEPS } from './pma-cycle-phase.service';

export type PmaNotifSeverity = 'info' | 'warning' | 'critical';

export interface PmaCycleNotification {
  id: string;
  cycleId: number;
  patientLabel: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  severity: PmaNotifSeverity;
}

const STORAGE = 'pma_cycle_notifications';

/** Données nécessaires pour recalculer les rappels (aligné sur le calendrier des phases). */
export interface PmaCycleNotifSource {
  cycleId: number;
  patientLabel: string;
  phase: string;
  step: number;
  dateDebut: string;
  statut: string;
  resultatTestGrossesse?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PmaCycleNotificationsService {
  private readonly phaseSvc = inject(PmaCyclePhaseService);

  readonly items = signal<PmaCycleNotification[]>(this.load());

  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  private load(): PmaCycleNotification[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      const p = JSON.parse(raw) as PmaCycleNotification[];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  private persist(list: PmaCycleNotification[]): void {
    localStorage.setItem(STORAGE, JSON.stringify(list.slice(0, 200)));
    this.items.set(list);
  }

  markRead(id: string): void {
    this.persist(this.items().map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead(): void {
    this.persist(this.items().map((n) => ({ ...n, read: true })));
  }

  dismiss(id: string): void {
    this.persist(this.items().filter((n) => n.id !== id));
  }

  /**
   * Recalcule les alertes à partir des cycles (jalons jour J / J+1, test de grossesse, retard stimulation).
   * Les identifiants `auto-*` sont stables pour conserver l’état « lu » entre deux synchronisations.
   */
  syncFromCycles(rows: PmaCycleNotifSource[]): void {
    const existing = this.load();
    const readMap = new Map(
      existing.filter((n) => n.id.startsWith('auto-') && n.read).map((n) => [n.id, true])
    );
    const manual = existing.filter((n) => !n.id.startsWith('auto-'));

    const generated: PmaCycleNotification[] = [];
    const today = this.stripTime(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const r of rows) {
      if (!this.isActif(r.statut)) continue;

      const start = this.phaseSvc.parseCycleStartDate(r.dateDebut);
      const startMs = start.getTime();
      if (Number.isNaN(startMs)) continue;

      const joursEcoules = Math.floor((Date.now() - startMs) / 86400000);

      if (/stimulation|ovarien/i.test(r.phase) && joursEcoules > 14) {
        generated.push(
          this.row(
            `auto-${r.cycleId}-stim-long`,
            r,
            'warning',
            'Stimulation prolongée',
            `Le dossier ${r.patientLabel} est en stimulation depuis ${joursEcoules} jours — vérifier la réponse ovarienne.`,
            readMap
          )
        );
      }

      for (let i = 0; i < PMA_PHASE_STEPS.length; i++) {
        const step = i + 1;
        const offset = PMA_PHASE_STEPS[i]!.offsetJours;
        const label = PMA_PHASE_STEPS[i]!.label;
        const phaseDate = new Date(start);
        phaseDate.setDate(phaseDate.getDate() + offset);
        const pd = this.stripTime(phaseDate);

        if (this.sameCalendarDay(pd, today)) {
          generated.push(
            this.row(
              `auto-${r.cycleId}-jalon-j0-${step}`,
              r,
              'info',
              `Aujourd’hui — ${label}`,
              `Jalon prévu du parcours type pour ${r.patientLabel} (jour ${offset} du cycle). Ouvrir le calendrier du cycle pour le suivi détaillé.`,
              readMap
            )
          );
        } else if (this.sameCalendarDay(pd, tomorrow)) {
          generated.push(
            this.row(
              `auto-${r.cycleId}-jalon-j1-${step}`,
              r,
              'info',
              `Demain — ${label}`,
              `Prévoir le suivi pour ${r.patientLabel} : étape « ${label} » attendue demain (planning type).`,
              readMap
            )
          );
        }
      }

      const last = PMA_PHASE_STEPS[PMA_PHASE_STEPS.length - 1]!;
      const testOffset = last.offsetJours;
      const testDate = new Date(start);
      testDate.setDate(testDate.getDate() + testOffset);
      const testDay = this.stripTime(testDate);

      const res = (r.resultatTestGrossesse || '').trim().toLowerCase();
      const attenteResultat = !res || res === 'en_attente';

      if (attenteResultat && this.stripTime(new Date()) >= testDay && r.step >= 9) {
        generated.push(
          this.row(
            `auto-${r.cycleId}-resultat-beta`,
            r,
            criticalOrWarning(r.step),
            'Saisir le résultat du test de grossesse',
            `La fenêtre du test β-hCG est atteinte ou dépassée pour ${r.patientLabel}. Enregistrer le résultat (positif / négatif) dans le détail du cycle.`,
            readMap
          )
        );
      }

      if (attenteResultat && this.stripTime(new Date()) > this.addDays(testDay, 5)) {
        generated.push(
          this.row(
            `auto-${r.cycleId}-resultat-retard`,
            r,
            'critical',
            'Résultat du test en retard',
            `Plus de 5 jours après la date prévue du test de grossesse pour ${r.patientLabel} sans résultat enregistré.`,
            readMap
          )
        );
      }
    }

    const sevOrder: Record<PmaNotifSeverity, number> = { critical: 0, warning: 1, info: 2 };
    generated.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
    this.persist([...generated, ...manual].slice(0, 200));
  }

  private row(
    id: string,
    r: PmaCycleNotifSource,
    severity: PmaNotifSeverity,
    title: string,
    body: string,
    readMap: Map<string, boolean>
  ): PmaCycleNotification {
    return {
      id,
      cycleId: r.cycleId,
      patientLabel: r.patientLabel,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: readMap.get(id) ?? false,
      severity,
    };
  }

  private isActif(statut: string): boolean {
    const t = (statut || '').trim().toLowerCase();
    return t === 'en_cours' || t === 'brouillon';
  }

  private stripTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private sameCalendarDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
}

function criticalOrWarning(step: number): PmaNotifSeverity {
  return step >= 10 ? 'critical' : 'warning';
}
