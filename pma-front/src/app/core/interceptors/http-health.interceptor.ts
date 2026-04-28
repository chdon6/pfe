import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError, throwError } from 'rxjs';
import { AppHealthService } from '../services/app-health.service';

/** Enregistre le dernier succès / échec HTTP pour la page « Santé de l'application ». */
export const httpHealthInterceptor: HttpInterceptorFn = (req, next) => {
  const health = inject(AppHealthService);
  return next(req).pipe(
    tap({
      next: () => health.recordSuccess(req.url),
    }),
    catchError((err: HttpErrorResponse) => {
      health.recordError(req.url, err);
      return throwError(() => err);
    })
  );
};
