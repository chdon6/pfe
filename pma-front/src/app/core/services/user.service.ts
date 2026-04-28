import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';
import { AuthService } from './auth.service';

/** Corps API aligné sur `UserUpsertDto` (mot de passe jamais renvoyé en GET). */
export interface UserUpsertPayload {
  id: number;
  nom: string;
  prenom: string;
  identifiant: string;
  telephone?: string;
  profileId?: number;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private auth = inject(AuthService);

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    if (this.auth.isDemoAdminSession()) {
      return of(this.auth.getDemoUserDirectory());
    }
    return this.http.get<User[]>(this.apiUrl);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  create(payload: UserUpsertPayload): Observable<number> {
    if (this.auth.isDemoAdminSession()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error:
              'Mode démonstration : démarrez l’API PMA et reconnectez-vous avec admin pour enregistrer en base.',
          })
      );
    }
    return this.http.post<number>(this.apiUrl, payload);
  }

  update(payload: UserUpsertPayload): Observable<void> {
    if (this.auth.isDemoAdminSession()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error:
              'Mode démonstration : démarrez l’API PMA et reconnectez-vous avec admin pour enregistrer en base.',
          })
      );
    }
    return this.http.put<void>(`${this.apiUrl}/${payload.id}`, payload);
  }

  delete(id: number): Observable<void> {
    if (this.auth.isDemoAdminSession()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error:
              'Mode démonstration : démarrez l’API PMA et reconnectez-vous avec admin pour supprimer en base.',
          })
      );
    }
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
