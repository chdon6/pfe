import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StockageService } from '../../core/services/stockage.service';
import { PatientService } from '../../core/services/patient.service';
import { CyclePmaService } from '../../core/services/cycle-pma.service';
import type { Bonbonne, Canister, PailleTube, Patient, CyclePma } from '../../core/models';
import { downloadCsv, printHtmlDocument } from '../../core/utils/client-export';
import { PdfReportService } from '../../core/utils/pdf-report.service';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
}

interface RapportReglementaire {
  id: string;
  titre: string;
  description: string;
  periode: string;
  dernierExport: Date | null;
  icon: string;
}

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporting.component.html',
  styleUrl: './reporting.component.scss'
})
export class ReportingComponent implements OnInit {
  private stockageService = inject(StockageService);
  private patientService = inject(PatientService);
  private cycleService = inject(CyclePmaService);
  private pdfService = inject(PdfReportService);

  loading = signal(true);
  periodeFiltre = signal<'annee' | 'semestre' | 'trimestre'>('annee');

  bonbonnes = signal<Bonbonne[]>([]);
  canisters = signal<Canister[]>([]);
  pailles = signal<PailleTube[]>([]);
  patients = signal<Patient[]>([]);
  cycles = signal<CyclePma[]>([]);

  readonly kpis = computed<KpiCard[]>(() => {
    const totalSlots = this.canisters().length * 12;
    const occupied = this.pailles().length;
    const occupationPct = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;
    const nbPatients = this.patients().length;
    const nbCycles = this.cycles().length;
    const nbCyclesTermines = this.cycles().filter(c => c.statutCycle === 'termine').length;
    const nbBonbonnes = this.bonbonnes().length;

    return [
      {
        label: 'Patients suivis',
        value: String(nbPatients),
        icon: 'fas fa-user-injured',
        trend: 'stable', trendValue: `${nbPatients} dossier${nbPatients > 1 ? 's' : ''} actif${nbPatients > 1 ? 's' : ''}`,
        color: '#059669'
      },
      {
        label: 'Cycles PMA',
        value: `${nbCycles}`,
        icon: 'fas fa-project-diagram',
        trend: 'stable', trendValue: `${nbCyclesTermines} terminé${nbCyclesTermines > 1 ? 's' : ''} / ${this.cyclesActifs()} en cours`,
        color: '#3b82f6'
      },
      {
        label: 'Occupation bonbonnes',
        value: occupationPct + '%',
        icon: 'fas fa-warehouse',
        trend: occupied > totalSlots * 0.8 ? 'up' : 'stable',
        trendValue: `${occupied}/${totalSlots} emplacements`,
        color: '#7c3aed'
      },
      {
        label: 'Échantillons conservés',
        value: String(occupied),
        icon: 'fas fa-vials',
        trend: 'stable', trendValue: `dans ${nbBonbonnes} bonbonne${nbBonbonnes > 1 ? 's' : ''}`,
        color: '#d97706'
      },
      {
        label: 'Bonbonnes',
        value: String(nbBonbonnes),
        icon: 'fas fa-snowflake',
        trend: 'stable', trendValue: `${totalSlots} emplacements totaux`,
        color: '#0891b2'
      },
      {
        label: 'Canisters',
        value: String(this.canisters().length),
        icon: 'fas fa-layer-group',
        trend: 'stable', trendValue: `12 positions par canister`,
        color: '#e11d48'
      }
    ];
  });

  readonly occupationParBonbonne = computed(() => {
    return this.bonbonnes().map(b => {
      const canIds = this.canisters().filter(c => c.bonbonneId === b.id).map(c => c.id);
      const totalSlots = canIds.length * 12;
      const occupied = this.pailles().filter(p => canIds.includes(p.canisterId)).length;
      return {
        bonbonne: b,
        totalSlots,
        occupied,
        free: totalSlots - occupied,
        pct: totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0
      };
    });
  });

  readonly repartitionTypeContenu = computed(() => {
    const normalize = (t: string): string => {
      const lower = t.toLowerCase().trim();
      if (lower.includes('embryon')) return 'Embryon';
      if (lower.includes('ovocyte') || lower.includes('oocyte')) return 'Ovocyte';
      if (lower.includes('sperm')) return 'Sperme';
      if (lower.includes('tissu')) return 'Tissu';
      return t || 'Non spécifié';
    };
    const counts = new Map<string, number>();
    for (const p of this.pailles()) {
      const type = normalize(p.typeContenu || '');
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    const total = this.pailles().length || 1;
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  readonly rapportsReglementaires: RapportReglementaire[] = [
    {
      id: 'abm-annuel', titre: 'Rapport annuel ABM',
      description: 'Bilan d\'activité annuel pour l\'Agence de la Biomédecine — indicateurs AMP, cryoconservation, taux de succès.',
      periode: 'Annuel', dernierExport: null, icon: 'fas fa-file-medical-alt'
    },
    {
      id: 'registre-fiv', titre: 'Registre national FIV',
      description: 'Données cycle par cycle pour le registre national — tentatives, résultats biologiques et cliniques.',
      periode: 'Annuel', dernierExport: null, icon: 'fas fa-database'
    },
    {
      id: 'vigilance-cryo', titre: 'Rapport vigilance cryogénique',
      description: 'Suivi réglementaire des cuves — incidents température, niveaux azote, interventions de maintenance.',
      periode: 'Semestriel', dernierExport: null, icon: 'fas fa-shield-alt'
    },
    {
      id: 'bilan-stockage', titre: 'Bilan stockage et conservation',
      description: 'État des lieux complet du parc cryogénique — occupation, durées de conservation, échantillons à détruire.',
      periode: 'Annuel', dernierExport: null, icon: 'fas fa-boxes'
    }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    forkJoin({
      bonbonnes: this.stockageService.getBonbonnes().pipe(catchError(() => of([] as Bonbonne[]))),
      canisters: this.stockageService.getCanisters().pipe(catchError(() => of([] as Canister[]))),
      pailles: this.stockageService.getPaillesTubes().pipe(catchError(() => of([] as PailleTube[]))),
      patients: this.patientService.getAll().pipe(catchError(() => of([] as Patient[]))),
      cycles: this.cycleService.getAll().pipe(catchError(() => of([] as CyclePma[])))
    }).subscribe({
      next: ({ bonbonnes, canisters, pailles, patients, cycles }) => {
        this.bonbonnes.set(bonbonnes);
        this.canisters.set(canisters);
        this.pailles.set(pailles);
        this.patients.set(patients);
        this.cycles.set(cycles);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  exporterKpiCsv(): void {
    const rows = this.kpis().map(k => [k.label, k.value, k.trendValue]);
    downloadCsv(`kpi-pma-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Indicateur', 'Valeur', 'Tendance'], rows);
  }

  exporterOccupationCsv(): void {
    const rows = this.occupationParBonbonne().map(o => [
      o.bonbonne.code || `#${o.bonbonne.id}`,
      o.bonbonne.typeStockage,
      String(o.occupied), String(o.totalSlots),
      o.pct + '%'
    ]);
    downloadCsv(`occupation-bonbonnes-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Bonbonne', 'Type', 'Occupés', 'Total', '% Occupation'], rows);
  }

  exporterRapportReglementaire(rapport: RapportReglementaire): void {
    const data = {
      patients:  this.patients(),
      cycles:    this.cycles(),
      bonbonnes: this.bonbonnes(),
      canisters: this.canisters(),
      pailles:   this.pailles(),
    };

    switch (rapport.id) {
      case 'abm-annuel':      this.pdfService.rapportABM(data);      break;
      case 'registre-fiv':    this.pdfService.registreFIV(data);     break;
      case 'vigilance-cryo':  this.pdfService.vigilanceCryo(data);   break;
      case 'bilan-stockage':  this.pdfService.bilanStockage(data);   break;
    }

    // Mettre à jour la date du dernier export
    rapport.dernierExport = new Date();
  }

  imprimerTableauBord(): void {
    const kpiRows = this.kpis().map(k => `
      <tr><td><strong>${this.esc(k.label)}</strong></td><td>${this.esc(k.value)}</td><td>${this.esc(k.trendValue)}</td></tr>
    `).join('');

    const occRows = this.occupationParBonbonne().map(o => `
      <tr>
        <td>${this.esc(o.bonbonne.code || '#' + o.bonbonne.id)}</td>
        <td>${this.esc(o.bonbonne.typeStockage)}</td>
        <td>${o.occupied}/${o.totalSlots}</td>
        <td>${o.pct}%</td>
      </tr>
    `).join('');

    printHtmlDocument('Tableau de bord PMA — Reporting', `
      <h1>Tableau de bord — Indicateurs PMA</h1>
      <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
      <h2>KPI clés</h2>
      <table>
        <thead><tr><th>Indicateur</th><th>Valeur</th><th>Tendance</th></tr></thead>
        <tbody>${kpiRows}</tbody>
      </table>
      <h2 style="margin-top:24px">Occupation des bonbonnes</h2>
      <table>
        <thead><tr><th>Bonbonne</th><th>Type</th><th>Occupation</th><th>%</th></tr></thead>
        <tbody>${occRows}</tbody>
      </table>
    `);
  }

  private genererRapportABM(annee: number): void {
    const totalSlots = this.canisters().length * 12;
    const occupied = this.pailles().length;
    const occupationPct = totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0;
    const rows = [
      ['Patients suivis', String(this.patients().length)],
      ['Nombre de cycles PMA', String(this.cycles().length)],
      ['Cycles terminés', String(this.cycles().filter(c => c.statutCycle === 'termine').length)],
      ['Cycles en cours', String(this.cyclesActifs())],
      ['Échantillons en conservation', String(occupied)],
      ['Capacité totale (emplacements)', String(totalSlots)],
      ['Taux occupation bonbonnes', occupationPct + '%'],
      ['Bonbonnes actives', String(this.bonbonnes().length)],
      ['Canisters', String(this.canisters().length)]
    ];
    downloadCsv(`rapport-ABM-${annee}.csv`, ['Indicateur', 'Valeur'], rows);
  }

  private genererRegistreFIV(annee: number): void {
    const rows = this.cycles().map(c => [
      String(c.id),
      String(c.patientId),
      c.phase || '',
      c.statutCycle,
      c.dateDebut,
      c.dateFin || ''
    ]);
    downloadCsv(`registre-FIV-${annee}.csv`,
      ['ID Cycle', 'Patient ID', 'Phase', 'Statut', 'Date début', 'Date fin'], rows);
  }

  private genererVigilanceCryo(annee: number): void {
    const rows = this.bonbonnes().map(b => {
      const canIds = this.canisters().filter(c => c.bonbonneId === b.id).map(c => c.id);
      const occ = this.pailles().filter(p => canIds.includes(p.canisterId)).length;
      const total = canIds.length * 12;
      return [
        b.code || `#${b.id}`,
        b.typeStockage,
        b.temperature,
        String(occ), String(total),
        total > 0 ? Math.round((occ / total) * 100) + '%' : '0%'
      ];
    });
    downloadCsv(`vigilance-cryo-${annee}.csv`,
      ['Bonbonne', 'Type', 'Température', 'Occupés', 'Total', '% Occupation'], rows);
  }

  private genererBilanStockage(annee: number): void {
    const rows = this.pailles().map(p => {
      const canister = this.canisters().find(c => c.id === p.canisterId);
      const bonbonne = canister ? this.bonbonnes().find(b => b.id === canister.bonbonneId) : null;
      return [
        p.codeBarre,
        p.typeContenu,
        bonbonne?.code || '-',
        canister ? String(canister.numero) : '-',
        String(p.position),
        p.couleurVisotube || '-'
      ];
    });
    downloadCsv(`bilan-stockage-${annee}.csv`,
      ['Code-barres', 'Type contenu', 'Bonbonne', 'Canister', 'Position', 'Visotube'], rows);
  }

  cyclesActifs(): number {
    return this.cycles().filter(c => c.statutCycle === 'en_cours').length;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  barWidth(pct: number): string {
    return Math.max(0, Math.min(100, pct)) + '%';
  }

  typeColor(type: string): string {
    const colors: Record<string, string> = {
      'Sperme': '#3b82f6',
      'Embryon': '#7c3aed',
      'Ovocyte': '#e11d48',
      'Non spécifié': '#9ca3af'
    };
    return colors[type] ?? '#6b7280';
  }
}
