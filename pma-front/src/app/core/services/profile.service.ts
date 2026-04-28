import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile } from '../models';
import { AuthService } from './auth.service';

const DEMO_PROFILES: Profile[] = [
  { id: 1, libelle: 'Technicien' },
  { id: 2, libelle: 'Secretaire' },
  { id: 3, libelle: 'Biologiste' },
  { id: 4, libelle: 'Administrateur' },
];

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiUrl = `${environment.apiUrl}/profiles`;
  private auth = inject(AuthService);

  constructor(private http: HttpClient) {}

  getAll(): Observable<Profile[]> {
    if (this.auth.isDemoAdminSession()) {
      return of(DEMO_PROFILES.map((p) => ({ ...p })));
    }
    return this.http.get<Profile[]>(this.apiUrl);
  }

  getById(id: number): Observable<Profile> {
    return this.http.get<Profile>(`${this.apiUrl}/${id}`);
  }

  create(profile: Profile): Observable<number> {
    return this.http.post<number>(this.apiUrl, profile);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
