import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  GestionCryogeniqueService,
  type CapteurTemperatureDto,
  type NiveauAzoteDto,
  type MaintenancePreventiveDto,
  type AlerteCryoDto
} from '../../core/services/gestion-cryogenique.service';
import { downloadCsv, printHtmlDocument } from '../../core/utils/client-export';

interface CapteurView extends CapteurTemperatureDto {
  historique: { date: Date; valeur: number }[];
}

@Component({
  selector: 'app-gestion-cryogenique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-cryogenique.component.html',
  styleUrl: './gestion-cryogenique.component.scss'
})
export class GestionCryogeniqueComponent implements OnInit, OnDestroy {
  private cryoService = inject(GestionCryogeniqueService);
  readonly Math = Math;
  readonly today = new Date();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly ongletActif = signal<'temperatures' | 'azote' | 'maintenance' | 'alertes'>('temperatures');

  readonly capteurs = signal<CapteurView[]>([]);
  readonly niveauxAzote = signal<NiveauAzoteDto[]>([]);
  readonly maintenances = signal<MaintenancePreventiveDto[]>([]);
  readonly alertes = signal<AlerteCryoDto[]>([]);

  readonly showMaintenanceForm = signal(false);
  maintenanceFormData: Partial<MaintenancePreventiveDto> = {};

  readonly listeEquipements = computed(() => {
    const fromCapteurs = this.capteurs().map(c => c.nom);
    const fromBonbonnes = this.niveauxAzote().map(n => `Bonbonne ${n.bonbonneCode}`);
    return [...new Set([...fromCapteurs, ...fromBonbonnes])];
  });

  readonly listeTypesMaintenance = [
    'Vérification étanchéité et joints',
    'Calibrage et étalonnage',
    'Test alarme sonore et SMS',
    'Dégivrage et nettoyage filtres',
    'Contrôle niveau et pesée',
    'Inspection visuelle',
    'Remplacement joints',
    'Nettoyage cuve',
    'Vérification sonde température'
  ];

  readonly listeFrequences = [
    { valeur: 7, label: '7 jours (hebdomadaire)' },
    { valeur: 14, label: '14 jours (bimensuel)' },
    { valeur: 30, label: '30 jours (mensuel)' },
    { valeur: 60, label: '60 jours (bimestriel)' },
    { valeur: 90, label: '90 jours (trimestriel)' },
    { valeur: 180, label: '180 jours (semestriel)' },
    { valeur: 365, label: '365 jours (annuel)' }
  ];

  readonly listeResponsables = [
    'Tech. Martin',
    'Tech. Durand',
    'Tech. Khaldi',
    'Tech. Benali'
  ];

  readonly listeNotes = [
    'RAS',
    'Étalonnage semestriel obligatoire ABM',
    'Test mensuel réglementaire',
    'Pesée bimensuelle',
    'Contrôle réglementaire annuel',
    'Intervention préventive planifiée'
  ];

  readonly alertesNonAcquittees = computed(() =>
    this.alertes().filter(a => !a.acquittee).length
  );

  readonly capteursEnAlerte = computed(() =>
    this.capteurs().filter(c => c.statut !== 'normal').length
  );

  readonly niveauxBas = computed(() =>
    this.niveauxAzote().filter(n => n.statut !== 'ok' && n.capaciteLitres > 0).length
  );

  readonly maintenancesEnRetard = computed(() =>
    this.maintenances().filter(m => m.statut === 'en_retard').length
  );

  ngOnInit(): void {
    this.loadData();
    this.intervalId = setInterval(() => this.simulerMiseAJour(), 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  changerOnglet(onglet: 'temperatures' | 'azote' | 'maintenance' | 'alertes'): void {
    this.ongletActif.set(onglet);
  }

  acquitterAlerte(id: number): void {
    this.cryoService.acquitterAlerte(id).subscribe(() => {
      this.alertes.update(list =>
        list.map(a => a.id === id ? { ...a, acquittee: true } : a)
      );
    });
  }

  acquitterToutes(): void {
    this.cryoService.acquitterToutesAlertes().subscribe(() => {
      this.alertes.update(list => list.map(a => ({ ...a, acquittee: true })));
    });
  }

  ouvrirMaintenanceForm(m?: MaintenancePreventiveDto): void {
    this.maintenanceFormData = m ? { ...m } : {
      equipement: '',
      typeEquipement: 'bonbonne',
      typeMaintenance: '',
      frequenceJours: 90,
      responsable: '',
      notes: ''
    };
    this.showMaintenanceForm.set(true);
  }

  sauvegarderMaintenance(): void {
    const form = this.maintenanceFormData;
    if (!form.equipement || !form.typeMaintenance) return;

    if (form.id) {
      this.cryoService.updateMaintenance(form.id, form).subscribe(() => {
        this.showMaintenanceForm.set(false);
        this.loadMaintenances();
      });
    } else {
      const payload = {
        ...form,
        derniereExecution: new Date().toISOString(),
        prochaineExecution: new Date(Date.now() + (form.frequenceJours ?? 90) * 86400000).toISOString(),
        statut: 'a_jour'
      };
      this.cryoService.createMaintenance(payload).subscribe(() => {
        this.showMaintenanceForm.set(false);
        this.loadMaintenances();
      });
    }
  }

  marquerExecutee(id: number): void {
    this.cryoService.marquerMaintenanceExecutee(id).subscribe(() => {
      this.loadMaintenances();
    });
  }

  supprimerMaintenance(id: number): void {
    if (!confirm('Supprimer cette maintenance planifiée ?')) return;
    this.cryoService.deleteMaintenance(id).subscribe(() => {
      this.maintenances.update(list => list.filter(m => m.id !== id));
    });
  }

  exporterTemperatures(): void {
    const rows = this.capteurs().map(c => [
      c.nom, c.bonbonneCode,
      c.temperatureActuelle + '°C', c.temperatureCible + '°C',
      c.statut, new Date(c.derniereMaj).toLocaleString('fr-FR')
    ]);
    downloadCsv(`temperatures-cryo-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Capteur', 'Bonbonne', 'T° Actuelle', 'T° Cible', 'Statut', 'Dernière MAJ'], rows);
  }

  exporterNiveauxAzote(): void {
    const rows = this.niveauxAzote().filter(n => n.capaciteLitres > 0).map(n => [
      n.bonbonneCode, n.niveauPourcentage + '%',
      n.volumeLitres + 'L', n.capaciteLitres + 'L',
      new Date(n.dernierRemplissage).toLocaleDateString('fr-FR'),
      new Date(n.prochainRemplissage).toLocaleDateString('fr-FR'),
      n.statut
    ]);
    downloadCsv(`niveaux-azote-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Bonbonne', 'Niveau', 'Volume', 'Capacité', 'Dernier rempli.', 'Prochain rempli.', 'Statut'], rows);
  }

  exporterMaintenances(): void {
    const rows = this.maintenances().map(m => [
      m.equipement, m.typeMaintenance,
      new Date(m.derniereExecution).toLocaleDateString('fr-FR'),
      new Date(m.prochaineExecution).toLocaleDateString('fr-FR'),
      m.frequenceJours + 'j', m.responsable, m.statut
    ]);
    downloadCsv(`maintenances-cryo-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Équipement', 'Type', 'Dernière', 'Prochaine', 'Fréquence', 'Responsable', 'Statut'], rows);
  }

  imprimerRapportTemperatures(): void {
    const rows = this.capteurs().map(c => `
      <tr>
        <td>${c.nom}</td>
        <td>${c.bonbonneCode}</td>
        <td><strong>${c.temperatureActuelle}°C</strong></td>
        <td>${c.temperatureCible}°C</td>
        <td>${this.statutLabel(c.statut)}</td>
      </tr>
    `).join('');
    printHtmlDocument('Rapport Températures Cryogéniques', `
      <h1>Rapport Suivi Températures Cryogéniques</h1>
      <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
      <table>
        <thead><tr><th>Capteur</th><th>Bonbonne</th><th>T° Actuelle</th><th>T° Cible</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }

  statutLabel(statut: string): string {
    const map: Record<string, string> = {
      normal: 'Normal', warning: 'Attention', critical: 'Critique',
      ok: 'OK', bas: 'Bas', critique: 'Critique',
      a_jour: 'À jour', a_planifier: 'À planifier', en_retard: 'En retard'
    };
    return map[statut] ?? statut;
  }

  typeEquipementLabel(type: string): string {
    const map: Record<string, string> = {
      bonbonne: 'Bonbonne', capteur: 'Capteur', systeme_alarme: 'Système alarme', cuve: 'Cuve'
    };
    return map[type] ?? type;
  }

  severiteLabel(s: string): string {
    return { info: 'Info', warning: 'Attention', critical: 'Critique' }[s] ?? s;
  }

  barreNiveau(pct: number): string {
    return Math.max(0, Math.min(100, pct)) + '%';
  }

  private loadData(): void {
    forkJoin({
      capteurs: this.cryoService.getCapteurs().pipe(catchError(() => of([] as CapteurTemperatureDto[]))),
      niveaux: this.cryoService.getNiveauxAzote().pipe(catchError(() => of([] as NiveauAzoteDto[]))),
      maintenances: this.cryoService.getMaintenances().pipe(catchError(() => of([] as MaintenancePreventiveDto[]))),
      alertes: this.cryoService.getAlertes().pipe(catchError(() => of([] as AlerteCryoDto[])))
    }).subscribe(({ capteurs, niveaux, maintenances, alertes }) => {
      this.capteurs.set(capteurs.map(c => ({
        ...c,
        historique: this.genHistorique(c.temperatureCible, c.seuilAlerte > 2 ? 0.5 : 0.3, 30)
      })));
      this.niveauxAzote.set(niveaux);
      this.maintenances.set(maintenances);
      this.alertes.set(alertes);
    });
  }

  private loadMaintenances(): void {
    this.cryoService.getMaintenances().subscribe(list => this.maintenances.set(list));
  }

  private simulerMiseAJour(): void {
    this.capteurs.update(list =>
      list.map(c => {
        const bruit = (Math.random() - 0.5) * 0.6;
        const rappel = (c.temperatureCible - c.temperatureActuelle) * 0.3;
        const newTemp = +(c.temperatureActuelle + rappel + bruit).toFixed(1);
        const diff = Math.abs(newTemp - c.temperatureCible);
        let statut = 'normal';
        if (diff > c.seuilAlerte) statut = 'critical';
        else if (diff > c.seuilAlerte * 0.6) statut = 'warning';

        return {
          ...c,
          temperatureActuelle: newTemp,
          statut,
          derniereMaj: new Date().toISOString(),
          historique: [...c.historique.slice(-29), { date: new Date(), valeur: newTemp }]
        };
      })
    );
  }

  private genHistorique(centre: number, amplitude: number, n: number): { date: Date; valeur: number }[] {
    const now = Date.now();
    return Array.from({ length: n }, (_, i) => ({
      date: new Date(now - (n - i) * 60000),
      valeur: +(centre + (Math.random() - 0.5) * amplitude * 2).toFixed(1)
    }));
  }
}
