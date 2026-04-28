import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RendezVousService } from '../../core/services/rendez-vous.service';
import { PatientService } from '../../core/services/patient.service';
import { ConsentementService } from '../../core/services/consentement.service';
import { StockageService } from '../../core/services/stockage.service';
import { RoleService, type ProfileRole } from '../../core/services/role.service';
import { Patient, Consentement, RendezVous, Bonbonne, Canister, PailleTube } from '../../core/models';

export interface AppAlertItem {
  id: string;
  kind: 'info' | 'warning' | 'danger';
  icon: string;
  text: string;
  link?: string;
}

/** Seuil indicatif : au-delà, la bombonne est signalée comme très occupée (démo). */
const PAILES_ALERT_PAR_BOMBONNE = 36;

@Component({
  selector: 'app-alerts-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-alerts-bar.component.html',
  styleUrl: './app-alerts-bar.component.scss',
})
export class AppAlertsBarComponent implements OnInit {
  private rdvService = inject(RendezVousService);
  private patientService = inject(PatientService);
  private consentementService = inject(ConsentementService);
  private stockageService = inject(StockageService);
  role = inject(RoleService);

  loading = true;
  alerts: AppAlertItem[] = [];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    const r = this.role.role();
    if (!r || r === 'Technicien') {
      this.applyStockageOnly();
      return;
    }

    forkJoin({
      rdvs: this.rdvService.getAll().pipe(catchError(() => of<RendezVous[]>([]))),
      patients: this.patientService.getAll().pipe(catchError(() => of<Patient[]>([]))),
      consentements: this.consentementService.getAll().pipe(catchError(() => of<Consentement[]>([]))),
      bonbonnes: this.stockageService.getBonbonnes().pipe(catchError(() => of<Bonbonne[]>([]))),
      canisters: this.stockageService.getCanisters().pipe(catchError(() => of<Canister[]>([]))),
      pailles: this.stockageService.getPaillesTubes().pipe(catchError(() => of<PailleTube[]>([]))),
    }).subscribe({
      next: ({ rdvs, patients, consentements, bonbonnes, canisters, pailles }) => {
        const list: AppAlertItem[] = [];
        const today = this.todayRange();

        const rdvToday = rdvs.filter((x) => {
          const d = new Date(x.dateHeure);
          return d >= today.start && d <= today.end;
        });
        if (rdvToday.length > 0 && (r === 'Secretaire' || r === 'Administrateur' || r === 'Biologiste')) {
          list.push({
            id: 'rdv-today',
            kind: 'info',
            icon: 'fas fa-calendar-day',
            text: `${rdvToday.length} rendez-vous aujourd’hui`,
            link: r === 'Secretaire' ? '/rendez-vous' : undefined,
          });
        }

        const byPatient = new Map<number, number>();
        for (const c of consentements) {
          byPatient.set(c.patientId, (byPatient.get(c.patientId) ?? 0) + 1);
        }
        const sansDoc = patients.filter((p) => (byPatient.get(p.id) ?? 0) === 0);
        if (sansDoc.length > 0 && (r === 'Secretaire' || r === 'Administrateur' || r === 'Biologiste')) {
          list.push({
            id: 'consent-missing',
            kind: 'warning',
            icon: 'fas fa-folder-open',
            text: `${sansDoc.length} dossier(s) sans lot documentaire archivé (consentement / pièces)`,
            link: r === 'Secretaire' ? '/archives-dossiers' : undefined,
          });
        }

        const bombonneCounts = this.countPaillesParBonbonne(bonbonnes, canisters, pailles);
        for (const [bid, n] of bombonneCounts) {
          if (n >= PAILES_ALERT_PAR_BOMBONNE) {
            const bb = bonbonnes.find((b) => b.id === bid);
            const code = bb?.code || `ID ${bid}`;
            list.push({
              id: `bb-${bid}`,
              kind: n >= 48 ? 'danger' : 'warning',
              icon: 'fas fa-snowflake',
              text: `Bombonne « ${code} » : occupation élevée (${n} pailles/tubes référencés)`,
              link: this.stockageLink(r),
            });
          }
        }

        this.alerts = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private applyStockageOnly(): void {
    forkJoin({
      bonbonnes: this.stockageService.getBonbonnes().pipe(catchError(() => of<Bonbonne[]>([]))),
      canisters: this.stockageService.getCanisters().pipe(catchError(() => of<Canister[]>([]))),
      pailles: this.stockageService.getPaillesTubes().pipe(catchError(() => of<PailleTube[]>([]))),
    }).subscribe({
      next: ({ bonbonnes, canisters, pailles }) => {
        const list: AppAlertItem[] = [];
        const bombonneCounts = this.countPaillesParBonbonne(bonbonnes, canisters, pailles);
        for (const [bid, n] of bombonneCounts) {
          if (n >= PAILES_ALERT_PAR_BOMBONNE) {
            const bb = bonbonnes.find((b) => b.id === bid);
            const code = bb?.code || `ID ${bid}`;
            list.push({
              id: `bb-${bid}`,
              kind: n >= 48 ? 'danger' : 'warning',
              icon: 'fas fa-snowflake',
              text: `Bombonne « ${code} » : occupation élevée (${n} pailles/tubes)`,
              link: this.stockageLink(this.role.role()),
            });
          }
        }
        this.alerts = list;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private todayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private stockageLink(r: ProfileRole | null): string | undefined {
    if (r === 'Technicien') return '/stockage';
    if (r === 'Biologiste') return '/identitovigilance/cryoconservation';
    return undefined;
  }

  private countPaillesParBonbonne(
    bonbonnes: Bonbonne[],
    canisters: Canister[],
    pailles: PailleTube[]
  ): Map<number, number> {
    const canToB = new Map<number, number>();
    for (const c of canisters) {
      canToB.set(c.id, c.bonbonneId);
    }
    const byBom = new Map<number, number>();
    for (const p of pailles) {
      const bid = canToB.get(p.canisterId);
      if (bid != null) {
        byBom.set(bid, (byBom.get(bid) ?? 0) + 1);
      }
    }
    return byBom;
  }
}
