import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Patient, RendezVous, CyclePma } from '../models';

export interface ChatbotSourceChunk {
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChatbotResponse {
  answer: string;
  sources: ChatbotSourceChunk[];
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  chat(message: string, history: ChatHistoryItem[] = []): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/chat`, { message, history });
  }

  /** Génère un résumé complet d'un dossier patient via Grok. */
  summarizePatient(
    patient: Patient,
    rdvs: RendezVous[],
    cycles: CyclePma[]
  ): Observable<ChatbotResponse> {
    const body = {
      patientNom:    patient.nom,
      patientPrenom: patient.prenom,
      numDossier:    patient.numDossier,
      typeDossier:   patient.typeDossier ?? null,
      dateNaissance: patient.dateNaissance ?? null,
      telephone:     patient.telephone ?? null,
      femmeNom:      patient.femmeNom ?? null,
      femmePrenom:   patient.femmePrenom ?? null,
      typeActePma:   patient.typeActePma ?? null,
      rendezVous: rdvs.map(r => ({
        dateHeure: r.dateHeure,
        motif:     r.motif,
        statut:    r.statut,
      })),
      cycles: cycles.map(c => ({
        phase:                 c.phase,
        etapeCourante:         c.etapeCourante,
        statutCycle:           c.statutCycle,
        dateDebut:             c.dateDebut,
        resultatTestGrossesse: c.resultatTestGrossesse ?? null,
      })),
    };
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/summarize-patient`, body).pipe(
      catchError(() => {
        const rdvCnt = rdvs.length;
        const cycCnt = cycles.length;
        const actifs = cycles.filter(c => c.statutCycle !== 'termine').length;
        const name = `${patient.prenom} ${patient.nom}`.trim();
        return of<ChatbotResponse>({
          answer: `Dossier de ${name} (N\u00b0\u00a0${patient.numDossier}), type ${patient.typeDossier ?? 'N/A'}. ${rdvCnt} rendez-vous. ${cycCnt} cycle(s) PMA dont ${actifs} en cours. (Service Grok indisponible — r\u00e9sum\u00e9 local)`,
          sources: [],
        });
      })
    );
  }

  health(): Observable<{ status: string; engine?: string }> {
    return this.http.get<{ status: string; engine?: string }>(`${this.apiUrl}/health`);
  }
}
