import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from './services/role.service';

/** Point d’entrée `/` : redirection vers la première page autorisée selon le profil. */
@Component({
  standalone: true,
  template: '',
})
export class HomeRedirectComponent implements OnInit {
  private router = inject(Router);
  private roleService = inject(RoleService);

  ngOnInit(): void {
    const firstRoute = this.roleService.menuItems()[0]?.route ?? '/login';
    void this.router.navigateByUrl(firstRoute, { replaceUrl: true });
  }
}
