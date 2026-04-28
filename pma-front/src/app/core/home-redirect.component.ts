import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Point d’entrée `/` : redirection vers le tableau de bord (tous profils authentifiés). */
@Component({
  standalone: true,
  template: '',
})
export class HomeRedirectComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }
}
