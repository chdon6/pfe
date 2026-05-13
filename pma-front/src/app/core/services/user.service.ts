import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';

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

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  create(payload: UserUpsertPayload): Observable<number> {
    return this.http.post<number>(this.apiUrl, payload);
  }

  update(payload: UserUpsertPayload): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${payload.id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
