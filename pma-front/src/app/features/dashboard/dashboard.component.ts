import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../core/services/patient.service';
import { RendezVousService } from '../../core/services/rendez-vous.service';
import { CyclePmaService } from '../../core/services/cycle-pma.service';
import { AdminSystemAuditService } from '../../core/services/admin-system-audit.service';
import { RoleService } from '../../core/services/role.service';
import type { AdminSystemAuditEntry } from '../../core/models/admin-system-audit.model';
import { downloadCsv, printHtmlDocument } from '../../core/utils/client-export';

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
  readonly adminAudit = inject(AdminSystemAuditService);
  role = inject(RoleService);

  totalPatients = 0;
  totalRdv = 0;
  totalCycles = 0;
  cyclesActifs = 0;
  recentPatients: any[] = [];
  prochainRdv: any[] = [];
  readonly recentPatientsLimit = 10;
  readonly adminAuditLimit = 100;

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

  readonly limitedAuditEntries = computed(() =>
    this.filteredAuditEntries().slice(0, this.adminAuditLimit)
  );

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

  exportAdminAuditCsv(): void {
    const entries = this.limitedAuditEntries();
    const data = entries.map((e) => [
      e.at,
      e.action,
      e.detail ?? '',
      e.actor ?? ''
    ]);
    downloadCsv(`pma-journal-audit-${this.todaySlug()}.csv`, ['Date ISO', 'Action', 'Détail', 'Compte'], data);
  }

  exportAdminAuditPdf(): void {
    const rows = this.limitedAuditEntries()
      .map(
        (e) =>
          `<tr><td>${this.escapeHtml(e.at)}</td><td>${this.escapeHtml(e.action)}</td><td>${this.escapeHtml(
            e.detail ?? ''
          )}</td><td>${this.escapeHtml(e.actor ?? '')}</td></tr>`
      )
      .join('');
    const body = `
      <h1>Journal d’audit</h1>
      <p>${this.limitedAuditEntries().length} ligne(s) (limite ${this.adminAuditLimit}) — ${this.fmtNow()}</p>
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
        this.recentPatients = patients.slice(-this.recentPatientsLimit).reverse();
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

  }
}
