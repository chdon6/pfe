import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginRequest, LoginResponse } from '../models';
import { AdminSystemAuditService } from './admin-system-audit.service';

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
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => this.storeSession(response))
    );
  }

  /** Mode demo desactive: authentification via API uniquement. */
  isDemoSession(): boolean {
    return false;
  }

  /** Mode demo desactive: authentification via API uniquement. */
  isDemoAdminSession(): boolean {
    return false;
  }

  /** Mode demo desactive: liste locale vide. */
  getDemoUserDirectory(): User[] {
    return [];
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
