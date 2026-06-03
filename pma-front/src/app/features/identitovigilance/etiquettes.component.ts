import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { LabelPrintService } from '../../core/services/label-print.service';
import { IdentitovigilanceAuditService } from '../../core/services/identitovigilance-audit.service';
import { PatientService } from '../../core/services/patient.service';
import { ElementBiologiqueService } from '../../core/services/element-biologique.service';
import type { Patient } from '../../core/models';

interface LabelType {
  name: string;
  icon: string;
  size: string;
  color: string;
  selected: boolean;
  widthMm: number;
  heightMm: number;
}

interface Impression {
  heure: string;
  patientId: number;
  numDossier: string;
  patientLabel: string;
  type: string;
  qte: number;
  operateur: string;
  codes?: string[];
}

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-etiquettes',
  template: `
    <div class="page rz-page">
      <div class="page-header rz-page-header">
        <div>
          <h1>Impression des étiquettes</h1>
          <p>
            Étiquettes liées aux dossiers patients : chaque impression est rattachée à un patient (couple ou homme seul),
            avec code-barres traçable.
          </p>
        </div>
      </div>

      <section class="rz-filter-card">
        <div class="etiq-section-head">
          <h2>Impression rapide</h2>
          <button
            type="button"
            class="btn-primary"
            [disabled]="!canNouvelleImpression()"
            (click)="ouvrirModalImpression()">
            <i class="fas fa-print"></i> Nouvelle impression
          </button>
        </div>

        @if (patients.length === 0) {
          <p class="etiq-empty-patients">
            Aucun patient chargé — créez des dossiers ou vérifiez la connexion à l’API pour imprimer des étiquettes.
          </p>
        }

        <div class="label-types">
          @for (lt of labelTypes; track lt.name) {
            <div class="label-card" [class.selected]="lt.selected"
                 [style.--accent]="lt.color"
                 (click)="selectLabel(lt)">
              <div class="label-icon">
                <i [class]="lt.icon"></i>
              </div>
              <span class="label-name">{{ lt.name }}</span>
              <span class="label-size">{{ lt.size }}</span>
            </div>
          }
        </div>
      </section>

      @if (impressions().length > 0) {
        <div class="rz-etiq-toolbar">
          <p class="rz-text-sm-muted" style="margin: 0;">{{ impressions().length }} lot(s) d’étiquettes (session courante)</p>
        </div>

        <div class="rz-etiq-grid">
          @for (imp of impressions(); track imp.heure + imp.patientId + imp.type + imp.qte + (imp.codes?.[0] ?? '')) {
            <div class="rz-etiq-tile">
              <p class="rz-etiq-kicker">PMA — Identitovigilance</p>
              <p class="rz-etiq-name">{{ imp.patientLabel }}</p>
              <p class="rz-etiq-dossier">Dossier {{ imp.numDossier }} · {{ imp.type }} · ×{{ imp.qte }} · {{ imp.operateur }}</p>
              <div class="rz-etiq-sep"></div>
              <div class="rz-etiq-foot">
                <span>{{ imp.type }}</span>
                <span>{{ imp.heure }}</span>
              </div>
              <p class="rz-etiq-code">{{ etiquetteCode(imp) }}</p>
              <button type="button" class="etiq-reprint-link" (click)="reimprimer(imp)">Réimprimer</button>
            </div>
          }
        </div>
      }
    </div>

    @if (printModal()) {
      <div class="modal-backdrop" (click)="fermerModalImpression()">
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-print-title"
             (click)="$event.stopPropagation()">
          <h3 id="modal-print-title">Nouvelle impression</h3>
          <p class="modal-sub">Type : <strong>{{ typeSelectionne()?.name }}</strong> · {{ typeSelectionne()?.size }}</p>

          <label class="field-label" for="imp-patient">Patient (dossier) <span class="req">*</span></label>
          <select
            id="imp-patient"
            class="field-input"
            [(ngModel)]="modalPatientId"
            name="modalPatientId"
          >
            <option [ngValue]="0" disabled>— Choisir un patient —</option>
            @for (p of patients; track p.id) {
              <option [ngValue]="p.id">{{ libellePatient(p) }}</option>
            }
          </select>

          <label class="field-label" for="imp-qte">Quantité</label>
          <input
            id="imp-qte"
            class="field-input field-input-narrow"
            type="number"
            min="1"
            max="99"
            [(ngModel)]="modalQte"
          />

          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="fermerModalImpression()">Annuler</button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="modalPatientId <= 0"
              (click)="confirmerImpression()">
              <i class="fas fa-print"></i> Imprimer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .etiq-empty-patients {
      margin: 0 0 1.25rem;
      padding: 12px 14px;
      border-radius: 10px;
      background: #fffbeb;
      color: #92400e;
      font-size: 0.9375rem;
      line-height: 1.45;
    }

    .field-label .req { color: #dc2626; font-weight: 800; }

    .etiq-section-head {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .etiq-section-head h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }

    .etiq-reprint-link {
      margin-top: 10px;
      padding: 0;
      border: none;
      background: none;
      font-size: 0.9375rem;
      font-weight: 700;
      color: #6d28d9;
      cursor: pointer;
      text-decoration: underline;
    }
    .etiq-reprint-link:hover { color: #5b21b6; }

    .btn-primary {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #0d9488, #0f766e); color: #fff; border: none; border-radius: 12px;
      padding: 12px 22px; font-size: 1rem; font-weight: 600; cursor: pointer;
      transition: transform .2s, box-shadow .2s;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4); }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #f8fafc;
      color: #334155;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #f1f5f9; }

    .label-types { display: flex; gap: 1rem; flex-wrap: wrap; }
    .label-card {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 1.25rem 1.5rem; border-radius: 14px; border: 2px solid rgba(15, 23, 42, 0.08);
      cursor: pointer; transition: all .22s ease; min-width: 148px; text-align: center;
      background: #fff;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    .label-card:hover { border-color: var(--accent, #0d9488); box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); transform: translateY(-2px); }
    .label-card.selected {
      border-color: var(--accent, #0d9488); background: color-mix(in srgb, var(--accent, #0d9488) 10%, white);
      box-shadow: 0 4px 16px color-mix(in srgb, var(--accent, #0d9488) 22%, transparent);
    }
    .label-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
      background: color-mix(in srgb, var(--accent, #0d9488) 14%, white);
      color: var(--accent, #0d9488);
    }
    .label-name { font-weight: 700; font-size: 0.9375rem; color: #0f172a; line-height: 1.3; }
    .label-size { font-size: 0.8125rem; color: #64748b; font-weight: 500; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
    }
    .modal-dialog {
      background: #fff;
      border-radius: 16px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
      max-width: 440px;
      width: 100%;
      padding: 1.75rem;
    }
    .modal-dialog h3 { margin: 0 0 10px; font-size: 1.375rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
    .modal-sub { margin: 0 0 1.25rem; font-size: 1rem; color: #64748b; line-height: 1.5; }
    .modal-sub strong { color: #0f172a; }
    .field-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 8px;
    }
    .field-input {
      width: 100%;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 1rem;
      margin-bottom: 18px;
      outline: none;
    }
    .field-input:focus { border-color: #0d9488; box-shadow: 0 0 0 4px color-mix(in srgb, #0d9488 18%, transparent); }
    .field-input-narrow { max-width: 120px; margin-bottom: 20px; }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `]
})
export class EtiquettesComponent implements OnInit {
  private roleService = inject(RoleService);
  private auth = inject(AuthService);
  private labelPrint = inject(LabelPrintService);
  private audit = inject(IdentitovigilanceAuditService);
  private patientService = inject(PatientService);
  private elementSvc = inject(ElementBiologiqueService);

  printModal = signal(false);
  modalPatientId = 0;
  modalQte = 1;
  patients: Patient[] = [];

  labelTypes: LabelType[] = [
    { name: 'Bracelet patient', icon: 'fas fa-id-badge', size: '25×200mm', color: '#0d9488', selected: true, widthMm: 25, heightMm: 200 },
    { name: 'Tube prélèvement', icon: 'fas fa-pen-fancy', size: '25×50mm', color: '#6366f1', selected: false, widthMm: 25, heightMm: 50 },
    { name: 'Boîte de Pétri', icon: 'fas fa-flask', size: '30×30mm', color: '#64748b', selected: false, widthMm: 30, heightMm: 30 },
    { name: 'Paillette cryogénique', icon: 'fas fa-snowflake', size: '12×80mm', color: '#0ea5e9', selected: false, widthMm: 12, heightMm: 80 },
    { name: 'Lame', icon: 'fas fa-microscope', size: '20×60mm', color: '#8b5cf6', selected: false, widthMm: 20, heightMm: 60 },
  ];

  impressions = signal<Impression[]>([]);

  ngOnInit(): void {
    this.patientService.getAll().subscribe({
      next: (list) => {
        this.patients = [...list].sort((a, b) =>
          (a.numDossier || '').localeCompare(b.numDossier || '', 'fr', { numeric: true })
        );
      },
      error: () => {
        this.patients = [];
      },
    });
    if (this.roleService.role() === 'Secretaire') {
      this.labelTypes.forEach((l) => (l.selected = false));
    }
  }

  libellePatient(p: Patient): string {
    const dossier = p.numDossier?.trim() || `#${p.id}`;
    if (p.typeDossier === 'spermogramme') {
      return `${dossier} — ${p.prenom} ${p.nom} (homme seul)`;
    }
    if (p.typeDossier === 'femme_seul') {
      return `${dossier} — ${p.prenom} ${p.nom} (femme seule)`;
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

  typeSelectionne(): LabelType | undefined {
    return this.labelTypes.find((l) => l.selected);
  }

  etiquetteCode(imp: Impression): string {
    if (imp.codes?.length) return imp.codes[0] ?? '';
    const dossierDigits = (imp.numDossier ?? '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    const heureDigits = (imp.heure ?? '').replace(/\D/g, '').padStart(4, '0');
    return `${String(imp.patientId).padStart(4, '0')}${dossierDigits}${heureDigits}${String(imp.qte).padStart(2, '0')}`;
  }

  /** Secrétaire : choix explicite du type ; au moins un patient chargé. */
  canNouvelleImpression(): boolean {
    if (this.patients.length === 0) return false;
    if (this.roleService.role() === 'Secretaire') {
      return this.labelTypes.some((l) => l.selected);
    }
    return true;
  }

  selectLabel(lt: LabelType) {
    this.labelTypes.forEach((l) => (l.selected = false));
    lt.selected = true;
  }

  ouvrirModalImpression() {
    if (!this.canNouvelleImpression() || !this.typeSelectionne()) return;
    this.modalPatientId = 0;
    this.modalQte = 1;
    this.printModal.set(true);
  }

  fermerModalImpression() {
    this.printModal.set(false);
  }

  confirmerImpression() {
    const lt = this.typeSelectionne();
    const p = this.patients.find((x) => x.id === this.modalPatientId);
    if (!lt || !p || this.modalPatientId <= 0) return;

    const patientLabel = this.libellePatient(p);
    const qte = Math.min(99, Math.max(1, Math.floor(Number(this.modalQte)) || 1));
    const codes = this.labelPrint.generateCodes(qte, { patientId: p.id, numDossier: p.numDossier });

    this.labelPrint.print({
      labelName: lt.name,
      couple: patientLabel,
      sizeText: lt.size,
      codes,
      widthMm: lt.widthMm,
      heightMm: lt.heightMm,
    });

    this.audit.logImpressionEtiquettes({
      typeLibelle: lt.name,
      couple: patientLabel,
      numDossier: p.numDossier,
      qte,
      codes,
    });

    // Enregistrer chaque code imprimé en base pour le scan d'identitovigilance
    const now = new Date().toISOString();
    for (const code of codes) {
      this.elementSvc.create({
        id: 0,
        typeElement: lt.name,
        codeBarre: code,
        dateCreation: now,
        patientId: p.id,
      }).subscribe({ error: () => {} });
    }

    const user = this.auth.user();
    const operateur = user ? `${user.prenom} ${user.nom}` : '—';

    this.impressions.update((list) => [
      {
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        patientId: p.id,
        numDossier: p.numDossier,
        patientLabel,
        type: lt.name,
        qte,
        operateur,
        codes,
      },
      ...list,
    ]);

    this.fermerModalImpression();
  }

  reimprimer(imp: Impression) {
    const lt = this.labelTypes.find((t) => t.name === imp.type);
    if (!lt) return;

    const codes =
      imp.codes && imp.codes.length === imp.qte
        ? [...imp.codes]
        : this.labelPrint.generateCodes(imp.qte, {
            patientId: imp.patientId,
            numDossier: imp.numDossier,
          });

    this.labelPrint.print({
      labelName: lt.name,
      couple: imp.patientLabel,
      sizeText: lt.size,
      codes,
      widthMm: lt.widthMm,
      heightMm: lt.heightMm,
    });
  }
}
