import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CapteurTemperatureDto {
  id: number;
  nom: string;
  bonbonneId: number;
  bonbonneCode: string;
  temperatureActuelle: number;
  temperatureCible: number;
  seuilAlerte: number;
  statut: string;
  derniereMaj: string;
}

export interface HistoriqueTemperatureDto {
  id: number;
  capteurTemperatureId: number;
  valeur: number;
  dateMesure: string;
}

export interface NiveauAzoteDto {
  id: number;
  bonbonneId: number;
  bonbonneCode: string;
  niveauPourcentage: number;
  volumeLitres: number;
  capaciteLitres: number;
  seuilAlerte: number;
  dernierRemplissage: string;
  prochainRemplissage: string;
  statut: string;
}

export interface MaintenancePreventiveDto {
  id: number;
  equipement: string;
  typeEquipement: string;
  typeMaintenance: string;
  derniereExecution: string;
  prochaineExecution: string;
  frequenceJours: number;
  responsable: string;
  statut: string;
  notes: string;
}

export interface AlerteCryoDto {
  id: number;
  dateAlerte: string;
  type: string;
  severite: string;
  message: string;
  equipement: string;
  acquittee: boolean;
}

@Injectable({ providedIn: 'root' })
export class GestionCryogeniqueService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCapteurs(): Observable<CapteurTemperatureDto[]> {
    return this.http.get<CapteurTemperatureDto[]>(`${this.api}/capteurs-temperature`);
  }

  createCapteur(dto: Partial<CapteurTemperatureDto>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/capteurs-temperature`, dto);
  }

  updateTemperature(id: number, valeur: number): Observable<void> {
    return this.http.put<void>(`${this.api}/capteurs-temperature/${id}/temperature`, { valeur });
  }

  getHistorique(capteurId: number): Observable<HistoriqueTemperatureDto[]> {
    return this.http.get<HistoriqueTemperatureDto[]>(`${this.api}/historiques-temperature/${capteurId}`);
  }

  getNiveauxAzote(): Observable<NiveauAzoteDto[]> {
    return this.http.get<NiveauAzoteDto[]>(`${this.api}/niveaux-azote`);
  }

  createNiveauAzote(dto: Partial<NiveauAzoteDto>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/niveaux-azote`, dto);
  }

  updateNiveauAzote(id: number, dto: Partial<NiveauAzoteDto>): Observable<void> {
    return this.http.put<void>(`${this.api}/niveaux-azote/${id}`, dto);
  }

  getMaintenances(): Observable<MaintenancePreventiveDto[]> {
    return this.http.get<MaintenancePreventiveDto[]>(`${this.api}/maintenances`);
  }

  createMaintenance(dto: Partial<MaintenancePreventiveDto>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/maintenances`, dto);
  }

  updateMaintenance(id: number, dto: Partial<MaintenancePreventiveDto>): Observable<void> {
    return this.http.put<void>(`${this.api}/maintenances/${id}`, dto);
  }

  marquerMaintenanceExecutee(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/maintenances/${id}/executer`, {});
  }

  deleteMaintenance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/maintenances/${id}`);
  }

  getAlertes(): Observable<AlerteCryoDto[]> {
    return this.http.get<AlerteCryoDto[]>(`${this.api}/alertes-cryo`);
  }

  createAlerte(dto: Partial<AlerteCryoDto>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.api}/alertes-cryo`, dto);
  }

  acquitterAlerte(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/alertes-cryo/${id}/acquitter`, {});
  }

  acquitterToutesAlertes(): Observable<void> {
    return this.http.put<void>(`${this.api}/alertes-cryo/acquitter-toutes`, {});
  }
}
