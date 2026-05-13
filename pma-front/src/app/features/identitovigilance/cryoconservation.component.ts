import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { IdentitovigilanceAuditService } from '../../core/services/identitovigilance-audit.service';
import { ElementBiologiqueService } from '../../core/services/element-biologique.service';
import { PatientService } from '../../core/services/patient.service';
import { StockageService } from '../../core/services/stockage.service';
import { CyclePmaService } from '../../core/services/cycle-pma.service';
import { environment } from '../../../environments/environment';
import { hexDepuisValeurVisotube } from '../../core/constants/visotube-couleurs';
import { DEMO_ELEMENTS_CRYO } from '../../core/data/demo-elements-cryo';
import {
  DEMO_BONBONNES_CRYO,
  DEMO_CANISTERS_CRYO,
  DEMO_PAILLES_CRYO,
} from '../../core/data/demo-stockage-cryo';
import type { Bonbonne, Canister, CyclePma, ElementBiologique, Patient, PailleTube } from '../../core/models';

/** Une ligne = lien élément biologique (labo) + emplacement précis (bonbonne, canister, visotube). */
interface LigneStockageCryo {
  trackId: string;
  bonbonneCode: string;
  bonbonneCouleur: string;
  bonbonneType: string;
  bonbonneTemp: string;
  canisterNumero: string;
  positionVisotube: string;
  codeBarre: string;
  couleurVisotube: string;
  contenuLibelle: string;
  dateRef: string | null;
}

interface Mouvement {
  dateHeure: string;
  type: 'Entrée' | 'Sortie';
  couple: string;
  paillettes: string;
  position: string;
  operateur: string;
}

/** Si le dossier n’a pas encore de ligne stockage : listes obligatoires (pas de saisie libre). */
const MOUVEMENT_CONTENU_CHOIX = [
  'Sperme cryoconservé',
  'Embryons vitrifiés',
  'Embryons congelés',
  'Ovocytes vitrifiés',
  'Autre matériel cryo',
] as const;

const MOUVEMENT_EMPLACEMENT_CHOIX = [
  'Cuve / canister / position — à confirmer',
  'Salle cryo — zone temporaire',
  'Transfert inter-cuve — emplacement à préciser',
] as const;

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-cryoconservation',
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Cryoconservation</h1>
          <p class="subtitle">
            Pour chaque dossier : <strong>bonbonne</strong> (code + couleur), <strong>canister</strong>, <strong>visotube</strong>
            (position, code-barres, couleur) et <strong>élément biologique</strong> stocké. Données API + démo si activée.
          </p>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn-outline btn-accent"
            [disabled]="patientsCryoTous().length === 0"
            (click)="ouvrirMouvement()">
            <i class="fas fa-exchange-alt"></i> Entrée / sortie
          </button>
          <div class="search-box" [class.search-box--clear]="!!searchQuery.trim()">
            <i class="fas fa-search"></i>
            <input
              type="search"
              autocomplete="off"
              placeholder="Recherche : patient, n° dossier, bonbonne, canister, position, code-barres…"
              [(ngModel)]="searchQuery"
              name="searchCryo"
            />
            @if (searchQuery.trim()) {
              <button type="button" class="search-clear" (click)="searchQuery = ''" title="Effacer">×</button>
            }
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loading-row"><i class="fas fa-spinner fa-spin"></i> Chargement des dossiers cryo…</div>
      } @else if (patientsCryoTous().length === 0) {
        <div class="empty-panel">
          <i class="fas fa-snowflake"></i>
          <p>
            Aucun patient avec élément biologique cryo ou paillette/tube référencé pour l’instant. Créez des éléments, des
            positions de stockage (bonbonne / canister) ou activez les données de démo.
          </p>
        </div>
      } @else if (patientsPourCryo().length === 0) {
        <div class="empty-panel empty-search">
          <i class="fas fa-search"></i>
          <p><strong>Aucun dossier ne correspond à votre recherche.</strong> Essayez un autre nom, n° de dossier, code bonbonne ou code-barres.</p>
        </div>
      } @else {
        <p class="filter-hint">
          <i class="fas fa-layer-group"></i>
          <strong>{{ patientsPourCryo().length }}</strong> dossier(s) affiché(s)
          @if (searchQuery.trim() && patientsCryoTous().length !== patientsPourCryo().length) {
            <span class="filter-meta"> sur {{ patientsCryoTous().length }}</span>
          }
          — chaque fiche indique où sont conservés les éléments (cuve azote, canister, position).
        </p>
        <div class="dossiers-cryo">
          @for (p of patientsPourCryo(); track p.id) {
            <article class="dossier-cryo-card">
              <header class="dossier-cryo-head">
                <div>
                  <h3>{{ libellePatient(p) }}</h3>
                  <span class="dossier-num">Dossier {{ p.numDossier || '—' }}</span>
                  @if (p.demo) {
                    <span class="badge-demo">Démo</span>
                  }
                </div>
                <span class="count-badge">{{ lignesCryoPourPatient(p.id).length }} emplacement(s)</span>
              </header>
              <div class="cryo-lignes">
                @for (row of lignesCryoPourPatient(p.id); track row.trackId) {
                  <div class="cryo-ligne">
                    <div class="cryo-emplacement-resume">
                      <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                      <span><strong>Où c’est stocké :</strong> {{ resumeStockageUneLigne(row) }}</span>
                    </div>
                    <div class="cryo-ligne-grid">
                      <div class="cryo-cell">
                        <span class="cryo-k">Bonbonne (cuve)</span>
                        <div class="cryo-bb-row">
                          @if (row.bonbonneCouleur) {
                            <span class="color-swatch" [style.background]="couleurCss(row.bonbonneCouleur)" [title]="row.bonbonneCouleur"></span>
                          }
                          <strong>{{ row.bonbonneCode || '—' }}</strong>
                        </div>
                        <span class="cryo-sub">{{ row.bonbonneType || '—' }}</span>
                        <span class="cryo-sub mono">{{ row.bonbonneTemp || '' }}</span>
                      </div>
                      <div class="cryo-cell">
                        <span class="cryo-k">Canister</span>
                        <strong class="cryo-val">n° {{ row.canisterNumero || '—' }}</strong>
                      </div>
                      <div class="cryo-cell">
                        <span class="cryo-k">Visotube</span>
                        <div class="cryo-viso">
                          @if (row.couleurVisotube) {
                            <span class="color-swatch color-swatch--lg" [style.background]="swatchVisotube(row.couleurVisotube)" [title]="row.couleurVisotube"></span>
                          }
                          <span><strong>Position {{ row.positionVisotube || '—' }}</strong></span>
                        </div>
                        <span class="cryo-sub mono">{{ row.codeBarre || '—' }}</span>
                      </div>
                      <div class="cryo-cell">
                        <span class="cryo-k">Élément biologique stocké</span>
                        <strong class="cryo-matiere">{{ row.contenuLibelle }}</strong>
                        @if (row.dateRef) {
                          <span class="cryo-sub">Réf. {{ row.dateRef | date: 'dd/MM/yyyy' }}</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      }

      <div class="section-card">
        <div class="section-header">
          <div>
            <h2>Mouvements récents</h2>
            <p class="section-subtitle">Entrées et sorties enregistrées sur ce poste (traçabilité)</p>
          </div>
        </div>

        @if (mouvements().length === 0) {
          <p class="empty-mvt">Aucun mouvement enregistré pour cette session.</p>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Date/heure</th>
                <th>Type</th>
                <th>Patient / dossier</th>
                <th>Paillettes / contenu</th>
                <th>Cuve / position</th>
                <th>Opérateur</th>
              </tr>
            </thead>
            <tbody>
              @for (m of mouvements(); track m.dateHeure + m.position + m.couple + m.type) {
                <tr>
                  <td class="mono">{{ m.dateHeure }}</td>
                  <td>
                    <span class="type-badge" [class.entree]="m.type === 'Entrée'" [class.sortie]="m.type === 'Sortie'">
                      {{ m.type }}
                    </span>
                  </td>
                  <td>{{ m.couple }}</td>
                  <td>{{ m.paillettes }}</td>
                  <td class="mono">{{ m.position }}</td>
                  <td>{{ m.operateur }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (moveModal()) {
      <div class="modal-backdrop" (click)="fermerMouvement()">
        <div class="modal-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <h3>Mouvement cryoconservation</h3>
          <p class="modal-help">Horodatage et opérateur sont enregistrés automatiquement (traçabilité).</p>

          <label class="fld-label" for="mv-type">Type</label>
          <select id="mv-type" class="fld-input" [(ngModel)]="moveType" name="moveType">
            <option value="Entrée">Entrée</option>
            <option value="Sortie">Sortie</option>
          </select>

          <label class="fld-label" for="mv-patient">Patient (dossier cryo) <span class="req">*</span></label>
          <select
            id="mv-patient"
            class="fld-input"
            [(ngModel)]="movePatientId"
            name="movePatientId"
            (ngModelChange)="onMovePatientMouvementChange()">
            <option [ngValue]="0" disabled>— Choisir un patient —</option>
            @for (p of patientsCryoTous(); track p.id) {
              <option [ngValue]="p.id">{{ libellePatient(p) }}</option>
            }
          </select>

          @if (movePatientId > 0 && lignesCryoPourPatient(movePatientId).length > 0) {
            <label class="fld-label" for="mv-ligne">Échantillon / emplacement <span class="req">*</span></label>
            <select id="mv-ligne" class="fld-input" [(ngModel)]="moveLigneTrackId" name="moveLigneTrackId">
              <option [ngValue]="''" disabled>— Choisir une ligne du dossier —</option>
              @for (row of lignesCryoPourPatient(movePatientId); track row.trackId) {
                <option [ngValue]="row.trackId">{{ libelleListeMouvement(row) }}</option>
              }
            </select>
            <p class="modal-field-hint">Contenu, code-barres et position cryo sont repris de la ligne choisie.</p>
          } @else if (movePatientId > 0) {
            <p class="modal-warn"><i class="fas fa-info-circle"></i> Aucune ligne de stockage pour ce dossier : choisissez le contenu et le repère dans les listes ci-dessous.</p>
            <label class="fld-label" for="mv-cont-list">Contenu <span class="req">*</span></label>
            <select id="mv-cont-list" class="fld-input" [(ngModel)]="moveContenuListe" name="moveContenuListe">
              <option [ngValue]="''" disabled>— Choisir le type de contenu —</option>
              @for (c of mouvementContenuChoix; track c) {
                <option [ngValue]="c">{{ c }}</option>
              }
            </select>
            <label class="fld-label" for="mv-emp-list">Repère emplacement <span class="req">*</span></label>
            <select id="mv-emp-list" class="fld-input" [(ngModel)]="moveEmplacementListe" name="moveEmplacementListe">
              <option [ngValue]="''" disabled>— Choisir le repère —</option>
              @for (e of mouvementEmplacementChoix; track e) {
                <option [ngValue]="e">{{ e }}</option>
              }
            </select>
          } @else {
            <p class="modal-field-hint">Sélectionnez d’abord un patient pour afficher les échantillons.</p>
          }

          <div class="modal-actions">
            <button type="button" class="btn-outline" (click)="fermerMouvement()">Annuler</button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!mouvementPretAEnregistrer()"
              (click)="enregistrerMouvement()">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { padding: 28px 32px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;
      flex-wrap: wrap; gap: 16px;
    }
    .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .subtitle { color: #64748b; font-size: 0.9rem; margin-top: 4px; max-width: 52rem; line-height: 1.45; }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .search-box {
      position: relative;
      display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 8px 14px;
    }
    .search-box.search-box--clear {
      padding-inline-end: 36px;
    }
    .search-box i { color: #94a3b8; }
    .search-box input { border: none; outline: none; font-size: 0.9rem; width: min(360px, 72vw); flex: 1; min-width: 200px; }
    .search-clear {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      width: 28px; height: 28px; border: none; background: #f1f5f9;
      border-radius: 6px; cursor: pointer; font-size: 1.1rem; line-height: 1; color: #64748b;
    }
    .search-clear:hover { background: #e2e8f0; color: #0f172a; }

    .filter-hint {
      font-size: 0.85rem; color: #64748b; margin: 0 0 14px; line-height: 1.45;
    }
    .filter-hint i { color: #0d9488; margin-right: 6px; }
    .filter-meta { font-weight: 500; color: #94a3b8; }

    .loading-row, .empty-panel {
      padding: 2rem;
      text-align: center;
      color: #64748b;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .empty-panel i { font-size: 2rem; color: #0d9488; margin-bottom: 12px; display: block; }
    .empty-panel.empty-search i { color: #64748b; }
    .empty-panel p { margin: 0 auto; max-width: 36rem; line-height: 1.5; }

    .cryo-emplacement-resume {
      display: flex; align-items: flex-start; gap: 10px;
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      font-size: 0.88rem;
      color: #0f172a;
      line-height: 1.4;
    }
    .cryo-emplacement-resume i { color: #059669; margin-top: 2px; flex-shrink: 0; }

    .dossiers-cryo {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }
    .dossier-cryo-card {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 20px 22px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .dossier-cryo-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .dossier-cryo-head h3 { margin: 0 0 6px; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
    .dossier-num { font-size: 0.82rem; color: #64748b; }
    .badge-demo {
      margin-left: 8px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #fef3c7;
      color: #92400e;
      padding: 2px 8px;
      border-radius: 6px;
      vertical-align: middle;
    }
    .count-badge {
      font-size: 0.8rem;
      font-weight: 700;
      color: #0f766e;
      background: #ccfbf1;
      padding: 6px 12px;
      border-radius: 999px;
    }
    .cryo-lignes { display: flex; flex-direction: column; gap: 12px; }
    .cryo-ligne {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      background: #f8fafc;
    }
    .cryo-ligne-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px 20px;
      align-items: start;
    }
    .cryo-k {
      display: block;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .cryo-bb-row, .cryo-viso { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .cryo-sub { display: block; font-size: 0.78rem; color: #64748b; margin-top: 4px; }
    .cryo-val { font-size: 1.05rem; color: #0f172a; }
    .cryo-matiere { font-size: 0.95rem; color: #0f172a; display: block; margin-top: 2px; }
    .color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1px solid rgba(15, 23, 42, 0.18);
      flex-shrink: 0;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
    }
    .color-swatch--lg { width: 22px; height: 22px; border-radius: 6px; }

    .section-card {
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
    }
    .section-card h2 { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0; }
    .section-subtitle { font-size: 0.82rem; color: #94a3b8; margin-top: 2px; }
    .empty-mvt { margin: 0; color: #94a3b8; font-size: 0.9rem; }

    .btn-outline {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 8px 16px; font-size: 0.85rem; color: #475569; cursor: pointer;
      transition: all .2s; font-weight: 500;
    }
    .btn-outline:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

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
    .mono { font-family: ui-monospace, 'Consolas', monospace; font-size: 0.82rem; color: #64748b; }

    .type-badge {
      display: inline-block; padding: 4px 12px; border-radius: 20px;
      font-size: 0.78rem; font-weight: 600;
    }
    .type-badge.entree { background: #ecfdf5; color: #059669; }
    .type-badge.sortie { background: #fef2f2; color: #dc2626; }

    .btn-accent { border-color: #0d9488; color: #0f766e; }
    .btn-accent:hover:not(:disabled) { background: #f0fdfa; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .modal-dialog {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 50px rgba(0,0,0,.15);
      max-width: 420px;
      width: 100%;
      padding: 22px;
    }
    .modal-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; color: #1e293b; }
    .modal-help { margin: 0 0 16px; font-size: 0.82rem; color: #64748b; }
    .fld-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .fld-label .req { color: #dc2626; }
    .fld-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.92rem;
      margin-bottom: 14px;
      outline: none;
    }
    .fld-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,.12); }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
    .btn-primary {
      padding: 10px 18px;
      background: #0d9488;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .modal-field-hint {
      margin: -6px 0 12px;
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.35;
    }
    .modal-warn {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 0 12px;
      padding: 10px 12px;
      font-size: 0.82rem;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      line-height: 1.4;
    }
    .modal-warn i { margin-top: 2px; flex-shrink: 0; }
  `],
})
export class CryoconservationComponent implements OnInit {
  private auth = inject(AuthService);
  private audit = inject(IdentitovigilanceAuditService);
  private elementService = inject(ElementBiologiqueService);
  private patientService = inject(PatientService);
  private stockageService = inject(StockageService);
  private cycleService = inject(CyclePmaService);

  moveModal = signal(false);
  moveType: 'Entrée' | 'Sortie' = 'Entrée';
  movePatientId = 0;
  /** Ligne `LigneStockageCryo.trackId` lorsque le dossier a des lignes. */
  moveLigneTrackId = '';
  /** Listes de secours si aucune ligne stockage pour le patient. */
  moveContenuListe = '';
  moveEmplacementListe = '';

  readonly mouvementContenuChoix = MOUVEMENT_CONTENU_CHOIX;
  readonly mouvementEmplacementChoix = MOUVEMENT_EMPLACEMENT_CHOIX;

  elements: ElementBiologique[] = [];
  patients: Patient[] = [];
  bonbonnes: Bonbonne[] = [];
  canisters: Canister[] = [];
  pailles: PailleTube[] = [];
  cycles: CyclePma[] = [];
  loading = true;
  searchQuery = '';

  mouvements = signal<Mouvement[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      elements: this.elementService.getAll().pipe(catchError(() => of<ElementBiologique[]>([]))),
      patients: this.patientService.getAll().pipe(catchError(() => of<Patient[]>([]))),
      bonbonnes: this.stockageService.getBonbonnes().pipe(catchError(() => of<Bonbonne[]>([]))),
      canisters: this.stockageService.getCanisters().pipe(catchError(() => of<Canister[]>([]))),
      pailles: this.stockageService.getPaillesTubes().pipe(catchError(() => of<PailleTube[]>([]))),
      cycles: this.cycleService.getAll().pipe(catchError(() => of<CyclePma[]>([]))),
    }).subscribe(({ elements, patients, bonbonnes, canisters, pailles, cycles }) => {
      const mergedEl = [...elements];
      if (environment.useDemoData) {
        for (const d of DEMO_ELEMENTS_CRYO) {
          if (!mergedEl.some((e) => e.id === d.id)) mergedEl.push({ ...d });
        }
      }
      this.elements = mergedEl;
      this.patients = patients;
      this.bonbonnes = this.mergeById(bonbonnes, DEMO_BONBONNES_CRYO);
      this.canisters = this.mergeById(canisters, DEMO_CANISTERS_CRYO);
      this.pailles = this.mergeById(pailles, DEMO_PAILLES_CRYO);
      this.cycles = cycles;
      this.loading = false;
    });
  }

  private mergeById<T extends { id: number }>(api: T[], demo: readonly T[]): T[] {
    const out = [...api];
    for (const d of demo) {
      if (!out.some((x) => x.id === d.id)) out.push({ ...d } as T);
    }
    return out;
  }

  /** Couleur affichable (hex ou nom CSS). */
  couleurCss(c: string): string {
    const v = (c || '').trim();
    if (!v) return '#cbd5e1';
    if (v.startsWith('#')) return v;
    return v;
  }

  /** Visotube : libellé type+couleur ou ancien #hex. */
  swatchVisotube(c: string): string {
    const v = (c || '').trim();
    if (!v) return '#cbd5e1';
    if (v.startsWith('#')) return this.couleurCss(v);
    const parsed = hexDepuisValeurVisotube(v);
    if (parsed !== '#cbd5e1') return parsed;
    return this.couleurCss(v);
  }

  private codesBarresEgaux(a?: string | null, b?: string | null): boolean {
    const x = (a || '').trim().toUpperCase();
    const y = (b || '').trim().toUpperCase();
    return !!x && x === y;
  }

  paillesPourPatient(patientId: number): PailleTube[] {
    const cycleIds = new Set(this.cycles.filter((c) => c.patientId === patientId).map((c) => c.id));
    return this.pailles.filter((p) => {
      if (p.patientId === patientId) return true;
      const cid = p.cyclePmaId;
      return cid != null && cycleIds.has(cid);
    });
  }

  private pailleEstCryoContenu(p: PailleTube): boolean {
    const t = (p.typeContenu || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (!t.trim()) return true;
    const keys = ['embryon', 'ovocyte', 'sperme', 'congel', 'cryo', 'vitrif', 'paillette', 'azote'];
    return keys.some((k) => t.includes(k));
  }

  lignesCryoPourPatient(patientId: number): LigneStockageCryo[] {
    const rows: LigneStockageCryo[] = [];
    const elts = this.elementsCryoPourPatient(patientId);
    const paillesPatient = this.paillesPourPatient(patientId);
    const usedPaille = new Set<number>();

    for (const el of elts) {
      const p = el.codeBarre
        ? paillesPatient.find((pt) => this.codesBarresEgaux(pt.codeBarre, el.codeBarre))
        : undefined;
      if (p) usedPaille.add(p.id);
      rows.push(this.buildLigneStockage(el, p));
    }

    for (const p of paillesPatient) {
      if (usedPaille.has(p.id)) continue;
      if (this.pailleEstCryoContenu(p)) {
        rows.push(this.buildLigneStockage(undefined, p));
      }
    }

    return rows;
  }

  /** Résumé lisible de l’emplacement cryo (recherche + affichage patient). */
  resumeStockageUneLigne(row: LigneStockageCryo): string {
    const parts: string[] = [];
    if (row.bonbonneCode?.trim()) {
      parts.push(`Cuve / bonbonne ${row.bonbonneCode.trim()}`);
    } else if (row.bonbonneType?.trim()) {
      parts.push(row.bonbonneType.trim());
    }
    if (row.canisterNumero) parts.push(`canister n° ${row.canisterNumero}`);
    if (row.positionVisotube) parts.push(`visotube ${row.positionVisotube}`);
    if (row.codeBarre) parts.push(`code-barres ${row.codeBarre}`);
    const temp = row.bonbonneTemp?.trim();
    if (temp) parts.push(temp);
    return parts.join(' · ') || 'Emplacement cryo non renseigné (bonbonne / canister / position)';
  }

  private buildLigneStockage(el: ElementBiologique | undefined, p: PailleTube | undefined): LigneStockageCryo {
    const can = p ? this.canisters.find((c) => c.id === p.canisterId) : undefined;
    const bb = can ? this.bonbonnes.find((b) => b.id === can.bonbonneId) : undefined;

    const contenu = el?.typeElement?.trim() || p?.typeContenu?.trim() || '—';
    const dateRef = el?.dateCreation || null;

    return {
      trackId: `e${el?.id ?? 'x'}-p${p?.id ?? 'x'}`,
      bonbonneCode: bb?.code?.trim() || (bb ? `Bonbonne #${bb.id}` : ''),
      bonbonneCouleur: (bb?.couleur || '').trim(),
      bonbonneType: bb?.typeStockage || '',
      bonbonneTemp: bb?.temperature || '',
      canisterNumero: can ? String(can.numero) : '',
      positionVisotube: p ? `P${p.position}` : '',
      codeBarre: (p?.codeBarre || el?.codeBarre || '').trim(),
      couleurVisotube: (p?.couleurVisotube || '').trim(),
      contenuLibelle: contenu,
      dateRef,
    };
  }

  /** Éléments dont le type évoque une conservation cryogénique. */
  private elementEstCryo(el: ElementBiologique): boolean {
    const t = (el.typeElement || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (!t.trim()) return false;
    const keys = ['congel', 'cryo', 'cryoconserv', 'paillette', 'vitrif', 'azote'];
    return keys.some((k) => t.includes(k));
  }

  elementsCryo(): ElementBiologique[] {
    return this.elements.filter((e) => this.elementEstCryo(e));
  }

  elementsCryoPourPatient(patientId: number): ElementBiologique[] {
    return this.elementsCryo().filter((e) => e.patientId === patientId);
  }

  /** Dossiers avec au moins un élément cryo (API) ou une paillette/tube cryo liée au couple / au cycle. */
  patientIdsAvecCryo(): Set<number> {
    const ids = new Set<number>();
    for (const e of this.elementsCryo()) {
      if (e.patientId != null) ids.add(e.patientId);
    }
    const cycleById = new Map(this.cycles.map((c) => [c.id, c]));
    for (const pt of this.pailles) {
      if (!this.pailleEstCryoContenu(pt)) continue;
      if (pt.patientId != null) {
        ids.add(pt.patientId);
        continue;
      }
      const cyc = pt.cyclePmaId != null ? cycleById.get(pt.cyclePmaId) : undefined;
      if (cyc?.patientId != null) ids.add(cyc.patientId);
    }
    return ids;
  }

  /** Tous les dossiers cryo (sans filtre recherche), triés par n° dossier. */
  patientsCryoTous(): Patient[] {
    const ids = this.patientIdsAvecCryo();
    return this.patients
      .filter((p) => ids.has(p.id))
      .sort((a, b) =>
        (a.numDossier || '').localeCompare(b.numDossier || '', 'fr', { numeric: true })
      );
  }

  patientsPourCryo(): Patient[] {
    const q = this.searchQuery.trim().toLowerCase();
    let list = this.patientsCryoTous();
    if (q) list = list.filter((p) => this.patientMatchesCryoSearch(p, q));
    return list;
  }

  private patientMatchesCryoSearch(p: Patient, q: string): boolean {
    const num = (p.numDossier || '').toLowerCase();
    if (num.includes(q)) return true;
    const label = this.libellePatient(p).toLowerCase();
    if (label.includes(q)) return true;
    const noms = [
      p.prenom,
      p.nom,
      p.femmePrenom,
      p.femmeNom,
    ]
      .map((x) => (x || '').trim().toLowerCase())
      .filter(Boolean);
    if (noms.some((n) => n.includes(q))) return true;
    const stockTxt = this.lignesCryoPourPatient(p.id)
      .map((r) =>
        [
          this.resumeStockageUneLigne(r),
          r.bonbonneCode,
          r.bonbonneType,
          r.bonbonneCouleur,
          r.bonbonneTemp,
          r.canisterNumero,
          r.positionVisotube,
          r.codeBarre,
          r.couleurVisotube,
          r.contenuLibelle,
        ]
          .join(' ')
          .toLowerCase()
      )
      .join(' ');
    return stockTxt.includes(q);
  }

  libellePatient(p: Patient): string {
    const dossier = p.numDossier?.trim() || `#${p.id}`;
    if (p.typeDossier === 'spermogramme') {
      return `${dossier} — ${p.prenom} ${p.nom} (homme seul)`;
    }
    const femme =
      p.femmePrenom || p.femmeNom
        ? `${p.femmePrenom ?? ''} ${p.femmeNom ?? ''}`.trim()
        : '';
    if (femme) {
      return `${dossier} — ${p.prenom} ${p.nom} & ${femme}`;
    }
    return `${dossier} — ${p.prenom} ${p.nom}`;
  }

  /** Libellé court pour la liste d’un mouvement entrée/sortie. */
  libelleListeMouvement(row: LigneStockageCryo): string {
    const cb = row.codeBarre ? `CB ${row.codeBarre}` : 'sans CB';
    const pos = row.positionVisotube || '—';
    const can = row.canisterNumero ? `can. ${row.canisterNumero}` : '';
    const cont = (row.contenuLibelle || '—').trim().slice(0, 44);
    return `${cont} · ${cb} · ${pos}${can ? ' · ' + can : ''}`;
  }

  onMovePatientMouvementChange(): void {
    this.moveLigneTrackId = '';
    this.moveContenuListe = '';
    this.moveEmplacementListe = '';
  }

  /** Formulaire mouvement : uniquement des listes (lignes dossier ou listes prédéfinies). */
  mouvementPretAEnregistrer(): boolean {
    if (this.movePatientId <= 0) return false;
    const lignes = this.lignesCryoPourPatient(this.movePatientId);
    if (lignes.length > 0) return !!this.moveLigneTrackId?.trim();
    return !!this.moveContenuListe?.trim() && !!this.moveEmplacementListe?.trim();
  }

  ouvrirMouvement(): void {
    this.moveType = 'Entrée';
    this.movePatientId = 0;
    this.moveLigneTrackId = '';
    this.moveContenuListe = '';
    this.moveEmplacementListe = '';
    this.moveModal.set(true);
  }

  fermerMouvement(): void {
    this.moveModal.set(false);
  }

  enregistrerMouvement(): void {
    const p = this.patients.find((x) => x.id === this.movePatientId);
    if (!p || !this.mouvementPretAEnregistrer()) return;

    const lignes = this.lignesCryoPourPatient(this.movePatientId);
    let pail: string;
    let position: string;
    if (lignes.length > 0) {
      const row = lignes.find((r) => r.trackId === this.moveLigneTrackId);
      if (!row) return;
      pail = `${row.contenuLibelle.trim()}${row.codeBarre ? ' — CB ' + row.codeBarre.trim() : ''}`;
      position = this.resumeStockageUneLigne(row);
    } else {
      pail = this.moveContenuListe.trim();
      position = this.moveEmplacementListe.trim();
    }

    const couple = this.libellePatient(p);

    const u = this.auth.user();
    const operateur = u ? `${u.prenom} ${u.nom}` : '—';
    const dateHeure = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    this.audit.logCryoMouvement({
      type: this.moveType,
      numDossier: p.numDossier,
      couple,
      paillettes: pail,
      position,
    });

    this.mouvements.update((list) => [
      { dateHeure, type: this.moveType, couple, paillettes: pail, position, operateur },
      ...list,
    ]);

    this.fermerMouvement();
  }
}
