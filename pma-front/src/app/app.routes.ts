import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./core/home-redirect.component').then((m) => m.HomeRedirectComponent),
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard('Technicien', 'Secretaire', 'Biologiste', 'Administrateur')],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Secrétaire uniquement (accueil dossiers)
      {
        path: 'patients',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/patients/patient-list/patient-list.component').then(m => m.PatientListComponent)
      },
      {
        path: 'patients/new',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/patients/patient-form/patient-form.component').then(m => m.PatientFormComponent)
      },
      {
        path: 'patients/:id',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/patients/patient-detail/patient-detail.component').then(m => m.PatientDetailComponent)
      },
      {
        path: 'patients/:id/edit',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/patients/patient-form/patient-form.component').then(m => m.PatientFormComponent)
      },
      {
        path: 'rendez-vous',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/rendez-vous/rdv-list/rdv-list.component').then(m => m.RdvListComponent)
      },
      {
        path: 'consentements',
        redirectTo: 'archives-dossiers',
        pathMatch: 'full'
      },
      {
        path: 'archives-dossiers',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () =>
          import('./features/archives/dossiers-archive.component').then((m) => m.DossiersArchiveComponent),
      },

      // Étiquettes — Secrétaire + Biologiste
      {
        path: 'identitovigilance/etiquettes',
        canActivate: [roleGuard('Secretaire', 'Biologiste')],
        loadComponent: () => import('./features/identitovigilance/etiquettes.component').then(m => m.EtiquettesComponent)
      },

      // Identitovigilance — Biologiste (scan) ; Technicien + Biologiste (cryo, traçabilité)
      {
        path: 'identitovigilance/scan',
        canActivate: [roleGuard('Biologiste')],
        loadComponent: () => import('./features/identitovigilance/verification-scan.component').then(m => m.VerificationScanComponent)
      },
      {
        path: 'identitovigilance/cryoconservation',
        canActivate: [roleGuard('Technicien', 'Biologiste')],
        loadComponent: () => import('./features/identitovigilance/cryoconservation.component').then(m => m.CryoconservationComponent)
      },
      {
        path: 'identitovigilance/tracabilite',
        canActivate: [roleGuard('Technicien', 'Biologiste')],
        loadComponent: () => import('./features/identitovigilance/tracabilite.component').then(m => m.TracabiliteComponent)
      },
      // Cycles — Biologiste
      {
        path: 'cycles/suivi',
        redirectTo: 'cycles',
        pathMatch: 'full'
      },
      {
        path: 'cycles',
        canActivate: [roleGuard('Biologiste')],
        loadComponent: () => import('./features/cycles/cycle-list/cycle-list.component').then(m => m.CycleListComponent)
      },
      {
        path: 'cycles/:id',
        canActivate: [roleGuard('Biologiste')],
        loadComponent: () => import('./features/cycles/cycle-detail/cycle-detail.component').then(m => m.CycleDetailComponent)
      },
      {
        path: 'actes',
        canActivate: [roleGuard('Secretaire')],
        loadComponent: () => import('./features/actes/acte-list/acte-list.component').then(m => m.ActeListComponent)
      },
      {
        path: 'elements-bio',
        canActivate: [roleGuard('Technicien')],
        loadComponent: () => import('./features/elements-bio/element-bio-list/element-bio-list.component').then(m => m.ElementBioListComponent)
      },
      {
        path: 'stockage',
        canActivate: [roleGuard('Technicien')],
        loadComponent: () => import('./features/stockage/stockage-list/stockage-list.component').then(m => m.StockageListComponent)
      },

      {
        path: 'administration/utilisateurs',
        canActivate: [roleGuard('Administrateur')],
        loadComponent: () => import('./features/users/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'administration/sante',
        canActivate: [roleGuard('Administrateur')],
        loadComponent: () =>
          import('./features/administration/app-health/app-health.component').then((m) => m.AppHealthComponent),
      },
      { path: 'users', redirectTo: 'administration/utilisateurs', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/' }
];
