import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-vigil-embed',
  template: `
    <div class="vigil-page">
      <div class="page-header">
        <h1><i [class]="icon"></i> {{ pageTitle }}</h1>
        <p>{{ pageDescription }}</p>
      </div>
      <div class="page-content">
        <div class="placeholder-card">
          <i [class]="icon + ' placeholder-icon'"></i>
          <h2>{{ pageTitle }}</h2>
          <p>Cette fonctionnalité est en cours de développement.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vigil-page { padding: 24px 32px; }
    .page-header h1 {
      font-size: 1.6rem; font-weight: 700; color: #1e293b;
      display: flex; align-items: center; gap: 12px;
    }
    .page-header h1 i { color: #7c3aed; }
    .page-header p { font-size: 0.95rem; color: #64748b; margin-top: 4px; }
    .page-content { margin-top: 24px; }
    .placeholder-card {
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 60px 32px; text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .placeholder-icon { font-size: 3rem; color: #7c3aed; margin-bottom: 16px; display: block; }
    .placeholder-card h2 { font-size: 1.3rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
    .placeholder-card p { color: #64748b; font-size: 0.95rem; }
  `]
})
export class VigilEmbedComponent {
  private readonly route = inject(ActivatedRoute);

  pageTitle = '';
  pageDescription = '';
  icon = 'fas fa-shield-alt';

  private readonly META: Record<string, { title: string; desc: string; icon: string }> = {
    'verification.html': { title: 'Vérification scan', desc: 'Scanner les bracelets patients et étiquettes contenants', icon: 'fas fa-barcode' },
    'etiquettes.html':   { title: 'Gestion des étiquettes', desc: 'Impression et suivi des codes-barres par contenant', icon: 'fas fa-tags' },
    'cryoconservation.html': { title: 'Cryoconservation', desc: 'Visualisation en temps réel des cuves et paillettes', icon: 'fas fa-snowflake' },
    'tracabilite.html':  { title: 'Traçabilité', desc: 'Journal d\'audit — Historique complet des actions', icon: 'fas fa-stream' }
  };

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    const file = (data['vigilFile'] as string) || 'verification.html';
    const meta = this.META[file];
    if (meta) {
      this.pageTitle = (data['title'] as string) || meta.title;
      this.pageDescription = meta.desc;
      this.icon = meta.icon;
    } else {
      this.pageTitle = (data['title'] as string) || 'Identitovigilance';
    }
  }
}
