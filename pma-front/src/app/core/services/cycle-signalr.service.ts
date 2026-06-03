import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CycleSignalRService implements OnDestroy {
  private connection: signalR.HubConnection;

  /** Émet l'id du cycle mis à jour à chaque notification serveur. */
  readonly cycleUpdated$ = new Subject<number>();

  /** Rafraîchissement de la liste agrégée (création, suppression, mise à jour). */
  readonly cycleListChanged$ = new Subject<void>();

  private readonly hubUrl = `${environment.hubUrl}/cycles`;

  constructor(private ngZone: NgZone) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('CycleUpdated', (cycleId: number) => {
      this.ngZone.run(() => this.cycleUpdated$.next(cycleId));
    });
    this.connection.on('CycleListChanged', () => {
      this.ngZone.run(() => this.cycleListChanged$.next());
    });
  }

  /** Lance la connexion au hub (idempotent). */
  async start(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.connection.start();
      } catch {
        // La connexion sera relancée par withAutomaticReconnect ou le fallback polling
      }
    }
  }

  /** Rejoindre le groupe d'un cycle pour recevoir ses mises à jour. */
  async joinCycle(cycleId: number): Promise<void> {
    await this.start();
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinCycle', cycleId);
    }
  }

  /** Quitter le groupe d'un cycle. */
  async leaveCycle(cycleId: number): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveCycle', cycleId);
    }
  }

  async joinCyclesList(): Promise<void> {
    await this.start();
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinCyclesList');
    }
  }

  async leaveCyclesList(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveCyclesList');
    }
  }

  get isConnected(): boolean {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }

  ngOnDestroy(): void {
    this.connection.stop();
    this.cycleUpdated$.complete();
    this.cycleListChanged$.complete();
  }
}
