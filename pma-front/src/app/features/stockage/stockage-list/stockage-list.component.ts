import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StockageService } from '../../../core/services/stockage.service';
import { PatientService } from '../../../core/services/patient.service';
import { CyclePmaService } from '../../../core/services/cycle-pma.service';
import { ElementBiologiqueService } from '../../../core/services/element-biologique.service';
import { Bonbonne, Canister, CyclePma, Patient, PailleTube } from '../../../core/models';
import {
  conseilStockagePourActe,
  typeActePmaNecessiteStockageCryo
} from '../../../core/constants/acte-pma-types';
import {
  VISOTUBE_FAMILLES,
  composeLibelleVisotube,
  familleParDefaut,
  hexDepuisValeurVisotube,
  type VisotubeCouleurEntry,
  type VisotubeFamilleId,
} from '../../../core/constants/visotube-couleurs';

@Component({
  selector: 'app-stockage-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stockage-list.component.html',
  styleUrl: './stockage-list.component.scss'
})
export class StockageListComponent implements OnInit {
  private stockageService = inject(StockageService);
  private patientService = inject(PatientService);
  private cyclePmaService = inject(CyclePmaService);
  private elementService = inject(ElementBiologiqueService);

  bonbonnes: Bonbonne[] = [];
  canisters: Canister[] = [];
  pailles: PailleTube[] = [];
  patients: Patient[] = [];
  cycles: CyclePma[] = [];
  loading = true;

  showBonbonneForm = false;
  newBonbonne: Bonbonne = { id: 0, code: '', couleur: '', typeStockage: '', temperature: '' };

  showCanisterForm = false;
  newCanister: Canister = { id: 0, numero: 0, bonbonneId: 0 };

  /** Placement cryo selon le dossier patient (technicien). */
  showPlacementForm = false;
  placementError = '';
  readonly visotubeFamilles = VISOTUBE_FAMILLES;

  placement = {
    patientId: 0,
    /** 0 = pas de cycle (ex. conservation sperme seule) */
    cyclePmaId: 0,
    bonbonneId: 0,
    canisterId: 0,
    position: 0,
    codeBarre: '',
    typeContenu: '',
    visotubeFamilleId: 'imv_polygonal' as VisotubeFamilleId,
    visotubeCouleurNom: 'Blanc',
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      bonbonnes: this.stockageService.getBonbonnes().pipe(catchError(() => of([] as Bonbonne[]))),
      canisters: this.stockageService.getCanisters().pipe(catchError(() => of([] as Canister[]))),
      pailles: this.stockageService.getPaillesTubes().pipe(catchError(() => of([] as PailleTube[]))),
      patients: this.patientService.getAll().pipe(catchError(() => of([] as Patient[]))),
      cycles: this.cyclePmaService.getAll().pipe(catchError(() => of([] as CyclePma[])))
    }).subscribe({
      next: ({ bonbonnes, canisters, pailles, patients, cycles }) => {
        this.bonbonnes = bonbonnes;
        this.canisters = canisters;
        this.pailles = pailles;
        this.patients = patients;
        this.cycles = cycles;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Dossiers avec acte nécessitant stockage cryo : la liste oriente le technicien.
   * (Les autres patients restent masqués pour ce formulaire ; consulter tous les dossiers côté secrétaire.)
   */
  patientsPourStockageCryo(): Patient[] {
    return this.patients
      .filter((p) => typeActePmaNecessiteStockageCryo(p.typeActePma))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
  }

  libellePatient(p: Patient): string {
    let s = `${p.prenom} ${p.nom} — n° ${p.numDossier}`;
    if (p.typeActePma) s += ` — ${p.typeActePma}`;
    return s;
  }

  conseilPatient(): string {
    const p = this.patients.find((x) => x.id === this.placement.patientId);
    return conseilStockagePourActe(p?.typeActePma);
  }

  /** Filtre des bonbonnes selon l’acte du dossier (sperme vs embryons). */
  bonbonnesPourActeDossier(): Bonbonne[] {
    const p = this.patients.find((x) => x.id === this.placement.patientId);
    const code = (p?.typeActePma || '').toLowerCase();
    if (code === 'cryoconservation_sperme' || code === 'preparation_sperme') {
      const f = this.bonbonnes.filter((b) => /sperme/i.test(b.typeStockage));
      return f.length ? f : this.bonbonnes;
    }
    if (
      code === 'congelation_embryons' ||
      code === 'fiv' ||
      code === 'icsi' ||
      code === 'transfer_embryonnaire' ||
      code === 'ponction_ovocytes'
    ) {
      const f = this.bonbonnes.filter((b) => /embry|ovocyte|ovoc/i.test(b.typeStockage));
      return f.length ? f : this.bonbonnes;
    }
    return this.bonbonnes;
  }

  cyclesDuPatient(): CyclePma[] {
    const pid = this.placement.patientId;
    if (!pid) return [];
    return this.cycles
      .filter((c) => c.patientId === pid)
      .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
  }

  ouvrirPlacement(): void {
    this.placementError = '';
    const def = familleParDefaut();
    this.placement = {
      patientId: 0,
      cyclePmaId: 0,
      bonbonneId: 0,
      canisterId: 0,
      position: 0,
      codeBarre: '',
      typeContenu: '',
      visotubeFamilleId: def.familleId,
      visotubeCouleurNom: def.couleurNom,
    };
    this.showPlacementForm = true;
  }

  couleursVisotubePourFamille(familleId: VisotubeFamilleId | ''): VisotubeCouleurEntry[] {
    if (!familleId) return [];
    return VISOTUBE_FAMILLES.find((f) => f.id === familleId)?.couleurs ?? [];
  }

  onVisotubeFamilleChange(): void {
    const fam = VISOTUBE_FAMILLES.find((f) => f.id === this.placement.visotubeFamilleId);
    if (!fam?.couleurs.length) return;
    if (!fam.couleurs.some((c) => c.nom === this.placement.visotubeCouleurNom)) {
      this.placement.visotubeCouleurNom = fam.couleurs[0].nom;
    }
  }

  /** Accent grille / pastille (supporte anciennes valeurs `#rrggbb`). */
  hexAccentVisotube(p: PailleTube): string {
    return hexDepuisValeurVisotube(p.couleurVisotube);
  }

  onPlacementPatientChange(): void {
    this.placement.cyclePmaId = 0;
    this.placement.bonbonneId = 0;
    this.placement.canisterId = 0;
    this.placement.position = 0;
    const bb = this.bonbonnesPourActeDossier();
    if (bb.length === 1) this.placement.bonbonneId = bb[0].id;
  }

  onPlacementBonbonneChange(): void {
    this.placement.canisterId = 0;
    this.placement.position = 0;
  }

  onPlacementCanisterChange(): void {
    this.placement.position = 0;
  }

  positionsLibresDuCanister(): number[] {
    const cid = this.placement.canisterId;
    if (!cid) return [];
    const c = this.canisters.find((x) => x.id === cid);
    if (!c) return [];
    return this.tubeSlotsForCanister(c)
      .filter((s): s is { kind: 'empty'; pos: number } => s.kind === 'empty')
      .map((s) => s.pos);
  }

  getBonbonneName(bonbonneId: number): string {
    const b = this.bonbonnes.find((x) => x.id === bonbonneId);
    return b ? `${b.typeStockage} (${b.temperature})` : '-';
  }

  saveBonbonne(): void {
    this.stockageService.createBonbonne(this.newBonbonne).subscribe(() => {
      this.showBonbonneForm = false;
      this.newBonbonne = { id: 0, code: '', couleur: '', typeStockage: '', temperature: '' };
      this.loadData();
    });
  }

  deleteBonbonne(id: number): void {
    if (confirm('Supprimer cette bonbonne ?')) {
      this.stockageService.deleteBonbonne(id).subscribe(() => this.loadData());
    }
  }

  saveCanister(): void {
    this.stockageService.createCanister(this.newCanister).subscribe(() => {
      this.showCanisterForm = false;
      this.newCanister = { id: 0, numero: 0, bonbonneId: 0 };
      this.loadData();
    });
  }

  deleteCanister(id: number): void {
    if (confirm('Supprimer ce canister ?')) {
      this.stockageService.deleteCanister(id).subscribe(() => this.loadData());
    }
  }

  deletePaille(id: number): void {
    if (confirm('Supprimer cette paille/tube ?')) {
      this.stockageService.deletePailleTube(id).subscribe(() => this.loadData());
    }
  }

  savePlacement(): void {
    this.placementError = '';
    const pl = this.placement;
    if (!pl.patientId) {
      this.placementError = 'Sélectionnez un dossier patient.';
      return;
    }
    if (!pl.bonbonneId || !pl.canisterId || !pl.position) {
      this.placementError = 'Choisissez la bonbonne, le canister et une position libre.';
      return;
    }
    if (!pl.codeBarre?.trim()) {
      this.placementError = 'Code-barres obligatoire sur le visotube.';
      return;
    }

    const cyclesDuPatient = this.cyclesDuPatient();
    const cyclePmaId = pl.cyclePmaId > 0 ? pl.cyclePmaId : undefined;
    if (cyclePmaId && !cyclesDuPatient.some((c) => c.id === cyclePmaId)) {
      this.placementError = 'Cycle invalide pour ce patient.';
      return;
    }

    if (!pl.visotubeFamilleId || !pl.visotubeCouleurNom?.trim()) {
      this.placementError = 'Choisissez le type de visotube et la couleur.';
      return;
    }

    const base = {
      id: 0,
      codeBarre: pl.codeBarre.trim(),
      typeContenu: pl.typeContenu?.trim() || 'Sperme cryoconservé',
      couleurVisotube: composeLibelleVisotube(pl.visotubeFamilleId, pl.visotubeCouleurNom.trim()),
      canisterId: pl.canisterId,
      position: pl.position
    };
    const payload: PailleTube = cyclePmaId
      ? { ...base, cyclePmaId, patientId: null }
      : { ...base, cyclePmaId: null, patientId: pl.patientId };

    this.stockageService.createPailleTube(payload).subscribe({
      next: () => {
        this.elementService.create({
          id: 0,
          typeElement: payload.typeContenu || 'Échantillon stocké',
          dateCreation: new Date().toISOString(),
          numeroTube: `P${payload.position}`,
          codeBarre: payload.codeBarre,
          patientId: pl.patientId
        }).subscribe({
          next: () => {
            this.showPlacementForm = false;
            this.loadData();
          },
          error: () => {
            this.placementError = "Stockage enregistré, mais l'enregistrement dans Résultats d'analyse a échoué.";
          }
        });
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          const e = err.error;
          if (typeof e === 'string' && e.trim()) {
            this.placementError = e.length > 200 ? e.slice(0, 200) + '…' : e;
            return;
          }
        }
        this.placementError =
          'Enregistrement refusé (position occupée, ou base : exécutez Scripts/AlterPailleTubes_PatientId_Oracle.sql si CYCLEPMAID est encore obligatoire).';
      }
    });
  }

  canistersForBonbonne(bonbonneId: number): Canister[] {
    return this.canisters
      .filter((c) => c.bonbonneId === bonbonneId)
      .sort((a, b) => a.numero - b.numero);
  }

  paillesForCanister(canisterId: number): PailleTube[] {
    return this.pailles
      .filter((p) => p.canisterId === canisterId)
      .sort((a, b) => a.position - b.position);
  }

  tubeSlotsForCanister(c: Canister): ({ kind: 'fill'; p: PailleTube } | { kind: 'empty'; pos: number })[] {
    const ps = this.paillesForCanister(c.id);
    const n = Math.max(12, ps.length > 0 ? Math.max(...ps.map((x) => x.position)) : 12);
    const slots: ({ kind: 'fill'; p: PailleTube } | { kind: 'empty'; pos: number })[] = [];
    for (let i = 1; i <= n; i++) {
      const p = ps.find((x) => x.position === i);
      slots.push(p ? { kind: 'fill', p } : { kind: 'empty', pos: i });
    }
    return slots;
  }

  occupiedCountForCanister(canisterId: number): number {
    return this.pailles.filter((p) => p.canisterId === canisterId).length;
  }

  get totalTubeSlots(): number {
    return this.canisters.length * 12;
  }

  get freeTubeSlots(): number {
    return Math.max(0, this.totalTubeSlots - this.pailles.length);
  }
}
