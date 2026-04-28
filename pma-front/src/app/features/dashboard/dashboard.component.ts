import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PatientService } from '../../core/services/patient.service';
import { RendezVousService } from '../../core/services/rendez-vous.service';
import { CyclePmaService } from '../../core/services/cycle-pma.service';
import { UserService } from '../../core/services/user.service';
import { ActePmaService } from '../../core/services/acte-pma.service';
import { AdminSystemAuditService } from '../../core/services/admin-system-audit.service';
import { RoleService } from '../../core/services/role.service';
import { ActePma, RendezVous, User } from '../../core/models';
import type { AdminSystemAuditEntry } from '../../core/models/admin-system-audit.model';
import { downloadCsv, printHtmlDocument } from '../../core/utils/client-export';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private patientService = inject(PatientService);
  private rdvService = inject(RendezVousService);
  private cycleService = inject(CyclePmaService);
  private userService = inject(UserService);
  private acteService = inject(ActePmaService);
  readonly adminAudit = inject(AdminSystemAuditService);
  role = inject(RoleService);

  totalPatients = 0;
  totalRdv = 0;
  totalCycles = 0;
  cyclesActifs = 0;
  recentPatients: any[] = [];
  prochainRdv: any[] = [];

  adminTotalPatients = 0;
  adminTotalRdv = 0;
  adminTotalCycles = 0;
  adminCyclesActifs = 0;
  adminUsers = 0;
  adminActes = 0;
  adminStatsLoading = true;

  /** Filtres journal d’audit (admin) */
  readonly auditSearch = signal('');
  readonly auditDateFrom = signal('');
  readonly auditDateTo = signal('');
  readonly auditAction = signal('');

  readonly auditActionOptions = computed(() => {
    const actions = new Set<string>();
    for (const e of this.adminAudit.entries()) {
      actions.add(e.action);
    }
    return [...actions].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly filteredAuditEntries = computed(() => {
    void this.adminAudit.entries();
    let rows: AdminSystemAuditEntry[] = [...this.adminAudit.entries()];
    const q = this.auditSearch().trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          (e.detail && e.detail.toLowerCase().includes(q)) ||
          (e.actor && e.actor.toLowerCase().includes(q))
      );
    }
    const ac = this.auditAction().trim();
    if (ac) {
      rows = rows.filter((e) => e.action === ac);
    }
    const df = this.auditDateFrom();
    const dt = this.auditDateTo();
    if (df) {
      const start = new Date(df);
      start.setHours(0, 0, 0, 0);
      rows = rows.filter((e) => new Date(e.at) >= start);
    }
    if (dt) {
      const end = new Date(dt);
      end.setHours(23, 59, 59, 999);
      rows = rows.filter((e) => new Date(e.at) <= end);
    }
    return rows;
  });

  resetAuditFilters(): void {
    this.auditSearch.set('');
    this.auditDateFrom.set('');
    this.auditDateTo.set('');
    this.auditAction.set('');
  }

  ngOnInit(): void {
    this.loadStats();
  }

  clearAdminAuditJournal(): void {
    if (!confirm('Vider tout le journal d’audit sur ce navigateur ?')) return;
    this.adminAudit.clear();
    this.resetAuditFilters();
  }

  exportAdminStatsCsv(): void {
    const data: (string | number)[][] = [
      ['Dossiers patients', this.adminTotalPatients],
      ['Rendez-vous', this.adminTotalRdv],
      ['Cycles PMA (total)', this.adminTotalCycles],
      ['Cycles actifs', this.adminCyclesActifs],
      ['Comptes utilisateurs', this.adminUsers],
      ['Actes PMA prescrits', this.adminActes],
    ];
    downloadCsv(`pma-synthese-admin-${this.todaySlug()}.csv`, ['Indicateur', 'Valeur'], data);
  }

  exportAdminAuditCsv(): void {
    const entries = this.filteredAuditEntries();
    const data = entries.map((e) => [
      e.at,
      e.action,
      e.detail ?? '',
      e.actor ?? ''
    ]);
    downloadCsv(`pma-journal-audit-${this.todaySlug()}.csv`, ['Date ISO', 'Action', 'Détail', 'Compte'], data);
  }

  exportAdminStatsPdf(): void {
    const body = `
      <h1>Synthèse administrateur</h1>
      <p>Export du ${this.fmtNow()} — application v${environment.appVersion}</p>
      <table>
        <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
        <tbody>
          <tr><td>Dossiers patients</td><td>${this.adminTotalPatients}</td></tr>
          <tr><td>Rendez-vous</td><td>${this.adminTotalRdv}</td></tr>
          <tr><td>Cycles PMA (total)</td><td>${this.adminTotalCycles}</td></tr>
          <tr><td>Cycles actifs</td><td>${this.adminCyclesActifs}</td></tr>
          <tr><td>Comptes utilisateurs</td><td>${this.adminUsers}</td></tr>
          <tr><td>Actes PMA prescrits</td><td>${this.adminActes}</td></tr>
        </tbody>
      </table>
    `;
    printHtmlDocument('Synthèse PMA — administration', body);
  }

  exportAdminAuditPdf(): void {
    const rows = this.filteredAuditEntries()
      .map(
        (e) =>
          `<tr><td>${this.escapeHtml(e.at)}</td><td>${this.escapeHtml(e.action)}</td><td>${this.escapeHtml(
            e.detail ?? ''
          )}</td><td>${this.escapeHtml(e.actor ?? '')}</td></tr>`
      )
      .join('');
    const body = `
      <h1>Journal d’audit</h1>
      <p>${this.filteredAuditEntries().length} ligne(s) — ${this.fmtNow()}</p>
      <table>
        <thead><tr><th>Date</th><th>Action</th><th>Détail</th><th>Compte</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    printHtmlDocument('Journal audit PMA', body);
  }

  private todaySlug(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private fmtNow(): string {
    return new Date().toLocaleString('fr-FR');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private loadStats(): void {
    const r = this.role.role();

    if (r === 'Secretaire') {
      this.patientService.getAll().subscribe((patients) => {
        this.totalPatients = patients.length;
        this.recentPatients = patients.slice(-5).reverse();
      });

      this.rdvService.getAll().subscribe((rdvs) => {
        this.totalRdv = rdvs.length;
        this.prochainRdv = rdvs
          .filter((rv) => new Date(rv.dateHeure) >= new Date())
          .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
          .slice(0, 5);
      });
    }

    if (r === 'Biologiste') {
      this.cycleService.getAll().subscribe((cycles) => {
        this.totalCycles = cycles.length;
        this.cyclesActifs = cycles.filter((c) => c.statutCycle !== 'termine').length;
      });
    }

    if (r === 'Administrateur') {
      this.adminStatsLoading = true;
      const safe = <T>(obs: Observable<T>, fb: T) => obs.pipe(catchError(() => of(fb)));
      forkJoin({
        patients: this.patientService.getAll(),
        rdvs: safe(this.rdvService.getAll(), [] as RendezVous[]),
        cycles: this.cycleService.getAll(),
        users: safe(this.userService.getAll(), [] as User[]),
        actes: safe(this.acteService.getAll(), [] as ActePma[])
      }).subscribe({
        next: ({ patients, rdvs, cycles, users, actes }) => {
          this.adminTotalPatients = patients.length;
          this.adminTotalRdv = rdvs.length;
          this.adminTotalCycles = cycles.length;
          this.adminCyclesActifs = cycles.filter((c) => c.statutCycle !== 'termine').length;
          this.adminUsers = users.length;
          this.adminActes = actes.length;
          this.adminStatsLoading = false;
        },
        error: () => {
          this.adminStatsLoading = false;
        }
      });
    }
  }
}
