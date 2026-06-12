import { Injectable, computed, signal, inject } from '@angular/core';
import { PmaCyclePhaseService } from './pma-cycle-phase.service';
import { phasesForActePma } from '../constants/acte-cycle-phases';

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
  /** Date calendaire du rappel (YYYY-MM-DD). */
  jourDate: string;
  phaseLabel: string;
  /** Jour du cycle (J0 = date de début). */
  jourCycle: number;
  /** true = historique API ou RDV ; false = prévision type uniquement. */
  fromApi?: boolean;
}

export interface PmaCycleJourGroup {
  jourDate: string;
  jourLabel: string;
  items: PmaCycleNotification[];
}

const STORAGE = 'pma_cycle_notifications';

/** Jours passés et futurs inclus dans l’agenda biologiste. */
const HORIZON_PASSE = 7;
const HORIZON_FUTUR = 14;

export interface PmaCycleRdvSource {
  dateHeure: string;
  motif?: string;
}

export interface PmaCycleNotifSource {
  cycleId: number;
  patientLabel: string;
  phase: string;
  etapeCourante?: string;
  step: number;
  dateDebut: string;
  statut: string;
  resultatTestGrossesse?: string | null;
  typeActePma?: string | null;
  historique?: import('../models').CycleEtapeHistorique[];
  rdvs?: PmaCycleRdvSource[];
}

@Injectable({ providedIn: 'root' })
export class PmaCycleNotificationsService {
  private readonly phaseSvc = inject(PmaCyclePhaseService);

  readonly items = signal<PmaCycleNotification[]>(this.load());

  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  /** Notifications regroupées par jour calendaire (tri chronologique). */
  readonly groupedByJour = computed((): PmaCycleJourGroup[] => {
    const map = new Map<string, PmaCycleNotification[]>();
    for (const n of this.items()) {
      const key = n.jourDate || this.isoDay(new Date());
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    const today = this.isoDay(new Date());
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jourDate, items]) => ({
        jourDate,
        jourLabel: this.labelJour(jourDate, today),
        items: [...items].sort((a, b) => {
          const sev = severityOrder(a.severity) - severityOrder(b.severity);
          if (sev !== 0) return sev;
          return a.patientLabel.localeCompare(b.patientLabel, 'fr');
        }),
      }));
  });

  readonly countAujourdhui = computed(() => {
    const today = this.isoDay(new Date());
    return this.items().filter((n) => n.jourDate === today).length;
  });

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
    localStorage.setItem(STORAGE, JSON.stringify(list.slice(0, 500)));
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

  /** Recalcule les rappels journaliers par cycle (jalons du parcours selon l’acte PMA). */
  syncFromCycles(rows: PmaCycleNotifSource[]): void {
    const existing = this.load();
    const readMap = new Map(
      existing.filter((n) => n.id.startsWith('auto-') && n.read).map((n) => [n.id, true])
    );
    const manual = existing.filter((n) => !n.id.startsWith('auto-'));

    const generated: PmaCycleNotification[] = [];
    const today = this.stripTime(new Date());

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
            this.isoDay(today),
            0,
            'Stimulation prolongée',
            'warning',
            'Stimulation prolongée',
            `En stimulation depuis ${joursEcoules} jours — vérifier la réponse ovarienne.`,
            readMap
          )
        );
      }

      const phaseSteps = phasesForActePma(r.typeActePma);
      const total = phaseSteps.length;
      const hist = r.historique ?? [];
      const windowStart = this.addDays(today, -HORIZON_PASSE);
      const windowEnd = this.addDays(today, HORIZON_FUTUR);
      const todayIso = this.isoDay(today);

      this.generateDailyPhaseNotifications(
        r,
        today,
        todayIso,
        windowStart,
        windowEnd,
        readMap,
        generated
      );

      for (const rdv of r.rdvs ?? []) {
        const rdvDay = this.stripTime(new Date(rdv.dateHeure));
        if (rdvDay < windowStart || rdvDay > windowEnd) continue;
        const jourIso = this.isoDay(rdvDay);
        const motif = (rdv.motif || 'Rendez-vous').trim();
        generated.push(
          this.row(
            `auto-${r.cycleId}-rdv-${jourIso}-${motif.slice(0, 20)}`,
            r,
            jourIso,
            Math.max(0, Math.floor((rdvDay.getTime() - startMs) / 86400000)),
            motif,
            'info',
            `${this.labelJour(jourIso, this.isoDay(today))} — RDV`,
            `${motif} · ${r.patientLabel}`,
            readMap,
            true
          )
        );
      }

      const hasTestStep = phaseSteps.some((s) => s.key === 'test');
      const last = phaseSteps[phaseSteps.length - 1];
      const testOffset = last?.offsetJours ?? 0;
      const testDate = new Date(start);
      testDate.setDate(testDate.getDate() + testOffset);
      const testDay = this.stripTime(testDate);
      const testIso = this.isoDay(testDay);

      const res = (r.resultatTestGrossesse || '').trim().toLowerCase();
      const attenteResultat = !res || res === 'en_attente';
      const nearEnd = total > 0 && r.step >= Math.max(1, total - 1);

      if (hasTestStep && attenteResultat && this.stripTime(new Date()) >= testDay && nearEnd) {
        generated.push(
          this.row(
            `auto-${r.cycleId}-resultat-beta`,
            r,
            testIso,
            testOffset,
            'Test de grossesse',
            criticalOrWarning(r.step),
            'Saisir le résultat du test',
            `Fenêtre β-hCG atteinte pour ${r.patientLabel}.`,
            readMap
          )
        );
      }

      if (hasTestStep && attenteResultat && this.stripTime(new Date()) > this.addDays(testDay, 5)) {
        generated.push(
          this.row(
            `auto-${r.cycleId}-resultat-retard`,
            r,
            this.isoDay(new Date()),
            testOffset,
            'Test de grossesse',
            'critical',
            'Résultat du test en retard',
            `Plus de 5 jours après la date prévue du test pour ${r.patientLabel}.`,
            readMap
          )
        );
      }
    }

    const sevOrder: Record<PmaNotifSeverity, number> = { critical: 0, warning: 1, info: 2 };
    generated.sort((a, b) => {
      const d = a.jourDate.localeCompare(b.jourDate);
      if (d !== 0) return d;
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
    this.persist([...generated, ...manual].slice(0, 500));
  }

  /** Un rappel biologiste par jour calendaire du parcours (chaque jour de chaque phase). */
  private generateDailyPhaseNotifications(
    r: PmaCycleNotifSource,
    today: Date,
    todayIso: string,
    windowStart: Date,
    windowEnd: Date,
    readMap: Map<string, boolean>,
    generated: PmaCycleNotification[]
  ): void {
    const daily = this.phaseSvc.buildDailyCalendar(
      {
        dateDebut: r.dateDebut,
        phase: r.phase,
        etapeCourante: r.etapeCourante ?? r.phase,
      },
      r.typeActePma,
      r.historique ?? []
    );

    for (const d of daily) {
      const dDay = this.stripTime(d.date);
      if (dDay < windowStart || dDay > windowEnd) continue;

      const jourIso = this.isoDay(dDay);
      const jourNum = d.jourIndex + 1;
      const horizon = Math.floor((dDay.getTime() - today.getTime()) / 86400000);
      const when =
        horizon === 0 ? 'Aujourd’hui' : horizon === 1 ? 'Demain' : this.formatDateFr(dDay);
      const isPastOrToday = dDay.getTime() <= today.getTime();

      let severity: PmaNotifSeverity = 'info';
      if (jourIso === todayIso) {
        severity = d.statut === 'en_cours' ? 'warning' : d.statut === 'termine' ? 'info' : 'info';
      }

      generated.push(
        this.row(
          `auto-${r.cycleId}-daily-${jourIso}`,
          r,
          jourIso,
          d.jourIndex,
          d.phaseLabel,
          severity,
          `${when} — J${jourNum} · ${d.phaseLabel}`,
          isPastOrToday
            ? `Suivi biologiste — ${r.patientLabel} · J${jourNum}, phase « ${d.phaseLabel} ».`
            : `Prévision J${jourNum} — ${r.patientLabel} · phase « ${d.phaseLabel} ».`,
          readMap,
          isPastOrToday
        )
      );
    }
  }

  private row(
    id: string,
    r: PmaCycleNotifSource,
    jourDate: string,
    jourCycle: number,
    phaseLabel: string,
    severity: PmaNotifSeverity,
    title: string,
    body: string,
    readMap: Map<string, boolean>,
    fromApi = false
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
      jourDate,
      phaseLabel,
      jourCycle,
      fromApi,
    };
  }

  labelJour(jourDate: string, todayIso: string): string {
    if (jourDate === todayIso) return 'Aujourd’hui';
    const tomorrow = this.isoDay(this.addDays(this.parseIsoDay(todayIso), 1));
    if (jourDate === tomorrow) return 'Demain';
    return this.formatDateFr(this.parseIsoDay(jourDate));
  }

  private formatDateFr(d: Date): string {
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private parseIsoDay(iso: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return new Date();
    return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0);
  }

  private isoDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

function severityOrder(s: PmaNotifSeverity): number {
  return s === 'critical' ? 0 : s === 'warning' ? 1 : 2;
}

function criticalOrWarning(step: number): PmaNotifSeverity {
  return step >= 8 ? 'critical' : 'warning';
}
