import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, LoginResponse } from '../models';
import { AdminSystemAuditService } from './admin-system-audit.service';

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  biologiste: {
    password: 'bio123',
    user: {
      id: 1,
      nom: 'Benali',
      prenom: 'Samira',
      identifiant: 'biologiste',
      telephone: '0612345678',
      profileId: 3,
      profileLibelle: 'Biologiste',
    },
  },
  technicien: {
    password: 'tech123',
    user: {
      id: 2,
      nom: 'Khaldi',
      prenom: 'Youssef',
      identifiant: 'technicien',
      telephone: '0698765432',
      profileId: 1,
      profileLibelle: 'Technicien',
    },
  },
  secretaire: {
    password: 'sec123',
    user: {
      id: 3,
      nom: 'Mansouri',
      prenom: 'Amina',
      identifiant: 'secretaire',
      telephone: '0655443322',
      profileId: 2,
      profileLibelle: 'Secretaire',
    },
  },
  admin: {
    password: 'admin123',
    user: {
      id: 99,
      nom: 'Admin',
      prenom: 'Système',
      identifiant: 'admin',
      telephone: '',
      profileId: 4,
      profileLibelle: 'Administrateur',
    },
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());

  constructor(
    private http: HttpClient,
    private router: Router,
    private adminAudit: AdminSystemAuditService
  ) {
    const stored = localStorage.getItem('pma_user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const key = credentials.identifiant.trim().toLowerCase();
    const demo = DEMO_USERS[key];

    const apiLogin = () =>
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
        tap((response) => this.storeSession(response))
      );

    /**
     * Admin : API d’abord (JWT + base réelle).
     * Repli démo si l’API est injoignable (0) ou refuse la connexion (401) alors que le mot de passe
     * est celui du compte démo — typiquement base Oracle sans utilisateur admin seedé.
     */
    if (key === 'admin') {
      return apiLogin().pipe(
        catchError((err: HttpErrorResponse) => {
          const demoPasswordOk = !!demo && credentials.password === demo.password;
          const allowDemoFallback =
            demoPasswordOk && (err.status === 0 || err.status === 401);
          if (allowDemoFallback) {
            const response: LoginResponse = {
              token: `demo-token-${credentials.identifiant}-2026`,
              user: demo.user,
            };
            return of(response).pipe(tap((r) => this.storeSession(r)));
          }
          return throwError(() => err);
        })
      );
    }

    if (demo && credentials.password === demo.password) {
      const response: LoginResponse = {
        token: `demo-token-${credentials.identifiant}-2026`,
        user: demo.user,
      };
      return of(response).pipe(tap((r) => this.storeSession(r)));
    }

    return apiLogin();
  }

  /** Jeton démo (pas un JWT) : l’écran admin peut afficher des données locales sans API. */
  isDemoSession(): boolean {
    const t = localStorage.getItem('pma_token') ?? '';
    return t.startsWith('demo-token-');
  }

  /** Session démo avec le compte admin (accès route /administration sans JWT valide). */
  isDemoAdminSession(): boolean {
    return this.isDemoSession() && this.user()?.identifiant?.toLowerCase() === 'admin';
  }

  /** Utilisateurs factices pour l’écran liste (API injoignable). */
  getDemoUserDirectory(): User[] {
    return Object.values(DEMO_USERS).map((d) => ({ ...d.user }));
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem('pma_token', response.token);
    localStorage.setItem('pma_user', JSON.stringify(response.user));
    this.currentUser.set(response.user);
    const u = response.user;
    this.adminAudit.log(
      'Connexion',
      `${u.prenom} ${u.nom} (${u.identifiant})`,
      u.identifiant
    );
  }

  logout(): void {
    const u = this.currentUser();
    if (u) {
      this.adminAudit.log('Déconnexion', `${u.prenom} ${u.nom} (${u.identifiant})`, u.identifiant);
    }
    localStorage.removeItem('pma_token');
    localStorage.removeItem('pma_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('pma_token');
  }
}
