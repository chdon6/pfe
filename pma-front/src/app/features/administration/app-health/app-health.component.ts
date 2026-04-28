import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AppHealthService } from '../../../core/services/app-health.service';

@Component({
  selector: 'app-app-health',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-health.component.html',
  styleUrl: './app-health.component.scss',
})
export class AppHealthComponent {
  readonly env = environment;
  readonly health = inject(AppHealthService);

  clearError(): void {
    this.health.clearLastError();
  }
}
