import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Injectable } from "@angular/core";
import { environment } from 'src/environments/environment';

@Injectable()
export class BasePathInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if(req.url.startsWith('https'))
        return next.handle(req);
        
    const apiReq = req.clone({ url: `https://${environment.apiEndpoint}/${req.url}` });
    return next.handle(apiReq);
  }
}