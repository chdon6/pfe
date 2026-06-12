import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, interval, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CyclePmaService } from './cycle-pma.service';
import { PatientService } from './patient.service';
import { RendezVousService } from './rendez-vous.service';
import { PmaCyclePhaseService } from './pma-cycle-phase.service';
import { CycleSignalRService } from './cycle-signalr.service';
import { PmaCycleNotificationsService, type PmaCycleNotifSource } from './pma-cycle-notifications.service';
import type { CycleEtapeHistorique, RendezVous } from '../models';

@Injectable({ providedIn: 'root' })
export class CycleNotifSyncService {
  private cycleService = inject(CyclePmaService);
  private patientService = inject(PatientService);
  private rdvService = inject(RendezVousService);
  private phaseService = inject(PmaCyclePhaseService);
  private notifService = inject(PmaCycleNotificationsService);
  private signalR = inject(CycleSignalRService);

  private started = false;

  /** Connexion SignalR active pour les rappels biologiste. */
  readonly isRealtime = signal(false);

  start(): void {
    if (this.started) return;
    this.started = true;
    this.sync();
    this.connectRealtime();

    // Secours si SignalR indisponible + rafraîchissement au changement de jour
    interval(60_000).subscribe(() => this.sync());
  }

  private connectRealtime(): void {
    this.signalR
      .joinCyclesList()
      .then(() => this.isRealtime.set(this.signalR.isConnected))
      .catch(() => this.isRealtime.set(false));

    this.signalR.cycleListChanged$.subscribe(() => this.sync());
    this.signalR.cycleUpdated$.subscribe(() => this.sync());
  }

  forceSync(): void {
    this.sync();
  }

  private sync(): void {
    forkJoin({
      cycles: this.cycleService.getAll().pipe(catchError(() => of([]))),
      patients: this.patientService.getAll().pipe(catchError(() => of([]))),
      historiques: this.cycleService.getAllHistoriques().pipe(catchError(() => of<CycleEtapeHistorique[]>([]))),
      rdvs: this.rdvService.getAll().pipe(catchError(() => of<RendezVous[]>([]))),
    }).subscribe(({ cycles, patients, historiques, rdvs }) => {
      const patMap = new Map(patients.map((p) => [p.id, p]));
      const histByCycle = new Map<number, CycleEtapeHistorique[]>();
      for (const h of historiques) {
        if (!histByCycle.has(h.cyclePmaId)) histByCycle.set(h.cyclePmaId, []);
        histByCycle.get(h.cyclePmaId)!.push(h);
      }

      const rdvActifs = rdvs.filter(
        (r) => (r.statut || '').trim().toLowerCase() !== 'annule'
      );

      const sources: PmaCycleNotifSource[] = cycles.map((c) => {
        const p = patMap.get(c.patientId);
        const label = p
          ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Patient #${c.patientId}`
          : `Patient #${c.patientId}`;

        return {
          cycleId: c.id,
          patientLabel: label,
          phase: c.phase,
          etapeCourante: c.etapeCourante,
          step: this.phaseService.resolveStepIndex(c, p?.typeActePma, histByCycle.get(c.id)),
          dateDebut: typeof c.dateDebut === 'string' ? c.dateDebut : new Date(c.dateDebut).toISOString(),
          statut: c.statutCycle,
          resultatTestGrossesse: c.resultatTestGrossesse,
          typeActePma: p?.typeActePma,
          historique: histByCycle.get(c.id) ?? [],
          rdvs: rdvActifs
            .filter((r) => r.patientId === c.patientId)
            .map((r) => ({
              dateHeure: typeof r.dateHeure === 'string' ? r.dateHeure : new Date(r.dateHeure).toISOString(),
              motif: r.motif,
            })),
        };
      });

      this.notifService.syncFromCycles(sources);
    });
  }
}
