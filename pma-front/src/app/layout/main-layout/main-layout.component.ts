import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AppAlertsBarComponent } from '../app-alerts-bar/app-alerts-bar.component';
import { CycleNotifSyncService } from '../../core/services/cycle-notif-sync.service';
import { RoleService } from '../../core/services/role.service';
import { GrokChatWidgetComponent } from '../../features/chatbot/grok-chat-widget/grok-chat-widget.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, AppAlertsBarComponent, GrokChatWidgetComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  private notifSync = inject(CycleNotifSyncService);
  readonly roleService = inject(RoleService);

  ngOnInit(): void {
    this.notifSync.start();
  }
}
