import { Component, inject, signal, computed } from '@angular/core';
import type { AuditJournalEntry } from '../../core/models/audit-journal.model';
import { IdentitovigilanceAuditService } from '../../core/services/identitovigilance-audit.service';

/** Données de démonstration (historique fictif) — complété par le journal persistant (scans, impressions, cryo). */
const DEMO_AUDIT: AuditJournalEntry[] = [
  { id: 'demo-1', dateHeure: '01/04/2026 10:45:12', action: 'Congélation paillettes', couple: 'C-005 — Leroy', detail: '3 paillettes embryons → CV-01/CAN-03', operateur: 'Tech. Morel', poste: 'LABO-WS3', statut: 'OK' },
  { id: 'demo-2', dateHeure: '01/04/2026 10:22:03', action: 'Scan identitovigilance', couple: 'C-004 — Petit', detail: 'Insémination — DISCORDANCE', operateur: 'Bio. Faure', poste: 'INSEM-WS1', statut: 'ALERTE' },
  { id: 'demo-3', dateHeure: '01/04/2026 10:05:41', action: 'Transfert embryon', couple: 'C-003 — Moreau', detail: 'Transfert J5 — Concordance OK', operateur: 'Dr. Bernard', poste: 'TRANSF-WS1', statut: 'OK' },
  { id: 'demo-4', dateHeure: '01/04/2026 09:32:18', action: 'Recueil sperme', couple: 'C-002 — Martin', detail: 'Étiquetage tube recueil', operateur: 'Bio. Faure', poste: 'RECUEIL-WS1', statut: 'OK' },
  { id: 'demo-5', dateHeure: '01/04/2026 09:15:07', action: 'Ponction ovocytaire', couple: 'C-001 — Dupont', detail: 'Scan pré-ponction concordant', operateur: 'Dr. Laurent', poste: 'PONCT-WS1', statut: 'OK' },
  { id: 'demo-6', dateHeure: '01/04/2026 08:45:33', action: 'Impression étiquettes', couple: 'C-001 — Dupont', detail: '2 bracelets, 4 tubes imprimés', operateur: 'Acc. Renaud', poste: 'ACCUEIL-WS1', statut: 'OK' },
  { id: 'demo-7', dateHeure: '31/03/2026 16:20:55', action: 'Décongélation paillettes', couple: 'C-003 — Moreau', detail: '2 paillettes embryons → CV-04/CAN-12', operateur: 'Bio. Faure', poste: 'LABO-WS2', statut: 'OK' },
  { id: 'demo-8', dateHeure: '31/03/2026 14:10:22', action: 'Mise en culture', couple: 'C-001 — Dupont', detail: '6 ovocytes en culture J0', operateur: 'Bio. Faure', poste: 'LABO-WS1', statut: 'OK' },
];

@Component({
  standalone: true,
  selector: 'app-tracabilite',
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Traçabilité</h1>
          <p class="subtitle">Journal d'audit — Historique complet des actions</p>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Rechercher..." (input)="onSearch($event)" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="toolbar">
          <div class="toolbar-left">
            <button class="btn-outline" (click)="toggleFilter()">
              <i class="fas fa-filter"></i> Filtrer
            </button>
            <select class="select-filter" (change)="onActionFilter($event)">
              <option value="">Toutes les actions</option>
              <option value="__cryo__">Mouvements cryoconservation</option>
              <option value="Congélation paillettes">Congélation paillettes</option>
              <option value="Scan identitovigilance">Scan identitovigilance</option>
              <option value="Transfert embryon">Transfert embryon</option>
              <option value="Recueil sperme">Recueil sperme</option>
              <option value="Ponction ovocytaire">Ponction ovocytaire</option>
              <option value="Impression étiquettes">Impression étiquettes</option>
              <option value="Décongélation paillettes">Décongélation paillettes</option>
              <option value="Mise en culture">Mise en culture</option>
            </select>
          </div>
          <button class="btn-outline" (click)="exporter()">
            <i class="fas fa-download"></i> Exporter
          </button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>DATE / HEURE</th>
              <th>ACTION</th>
              <th>COUPLE</th>
              <th>DÉTAIL</th>
              <th>OPÉRATEUR</th>
              <th>POSTE</th>
              <th>STATUT</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of filtered(); track entry.id) {
              <tr>
                <td class="mono">{{ entry.dateHeure }}</td>
                <td class="action-cell">{{ entry.action }}</td>
                <td>{{ entry.couple }}</td>
                <td class="detail-cell">{{ entry.detail }}</td>
                <td>{{ entry.operateur }}</td>
                <td class="mono">{{ entry.poste }}</td>
                <td>
                  <span class="badge" [class.ok]="entry.statut === 'OK'" [class.alerte]="entry.statut === 'ALERTE'">
                    {{ entry.statut }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 28px 32px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;
    }
    .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .subtitle { color: #64748b; font-size: 0.9rem; margin-top: 4px; }
    .header-actions { display: flex; gap: 12px; }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 8px 14px;
    }
    .search-box i { color: #94a3b8; }
    .search-box input { border: none; outline: none; font-size: 0.9rem; width: 180px; }

    .section-card {
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }

    .toolbar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; gap: 12px;
    }
    .toolbar-left { display: flex; gap: 12px; align-items: center; }

    .btn-outline {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 8px 16px; font-size: 0.85rem; color: #475569; cursor: pointer;
      transition: all .2s; font-weight: 500;
    }
    .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

    .select-filter {
      padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 0.85rem; color: #475569; background: #fff; cursor: pointer; outline: none;
    }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left; font-size: 0.72rem; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .5px; padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 14px; font-size: 0.88rem; color: #334155;
      border-bottom: 1px solid #f1f5f9;
    }
    .mono { font-family: 'SF Mono', 'Consolas', monospace; font-size: 0.82rem; color: #64748b; }
    .action-cell { font-weight: 500; }
    .detail-cell { color: #64748b; font-size: 0.84rem; max-width: 260px; }

    .badge {
      display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 0.78rem;
      font-weight: 700; letter-spacing: .3px;
    }
    .badge.ok { background: #ecfdf5; color: #059669; }
    .badge.alerte { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  `]
})
export class TracabiliteComponent {
  private audit = inject(IdentitovigilanceAuditService);
  private searchTerm = signal('');
  private actionFilter = signal('');

  /** Journal persistant (localStorage) + jeu de démo. */
  private allEntries = computed(() => [...this.audit.entries(), ...DEMO_AUDIT]);

  filtered = computed(() => {
    let data = this.allEntries();
    const search = this.searchTerm().toLowerCase();
    const action = this.actionFilter();
    if (search) data = data.filter(e => JSON.stringify(e).toLowerCase().includes(search));
    if (action === '__cryo__') {
      data = data.filter(e => e.action.startsWith('Cryoconservation'));
    } else if (action) {
      data = data.filter(e => e.action === action);
    }
    return data;
  });

  onSearch(ev: Event) {
    this.searchTerm.set((ev.target as HTMLInputElement).value);
  }

  onActionFilter(ev: Event) {
    this.actionFilter.set((ev.target as HTMLSelectElement).value);
  }

  toggleFilter() {}

  exporter() {
    const rows = this.filtered();
    const header = ['dateHeure', 'action', 'couple', 'detail', 'operateur', 'poste', 'statut'];
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      header.join(';'),
      ...rows.map(e =>
        [e.dateHeure, e.action, e.couple, e.detail, e.operateur, e.poste, e.statut].map(esc).join(';')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pma-audit-identitovigilance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
